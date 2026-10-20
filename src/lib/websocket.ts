// src/lib/websocket.ts - Updated for Render
import { toast } from "@/hooks/use-toast";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export type WebSocketHandler = (message: WebSocketMessage) => void;

export class CommentSendError extends Error {
  code: string;
  retryable: boolean;
  constructor(code: string, retryable: boolean, message?: string) {
    super(message || code);
    this.name = 'CommentSendError';
    this.code = code;
    this.retryable = retryable;
  }
}

/** What to do after a close: 'none' (normal), 'auth' (session invalid/expired: do not retry), 'retry' (everything else, incl. 1006 and 1013). */
export function reconnectDecision(code: number): 'none' | 'auth' | 'retry' {
  if (code === 1000) return 'none';
  if (code === 1008) return 'auth';
  if (code === 4429) return 'none'; // the account has too many open connections: retrying would only add load
  return 'retry';
}

export function reconnectDelay(attempt: number, base = 1000, random = Math.random): number {
  return Math.min(base * Math.pow(1.5, Math.max(0, attempt - 1)), 30000) + Math.floor(random() * 500);
}

export class WebSocketService {
  private processedMessageIds = new Set<string>(); // Track processed messages
  private pendingComments = new Map<string, string>(); // taskId -> messageId
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectDelay = 1000;
  private handlers: Map<string, WebSocketHandler[]> = new Map();
  private taskRooms: Set<string> = new Set();
  private isTypingTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastPingTime: number = 0;
  private connecting: Promise<void> | null = null;
  private serverFeatures = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private authFailed = false;
  private statusListeners = new Set<(connected: boolean) => void>();
  private pendingAcks = new Map<string, { resolve: (comment: any) => void; reject: (error: CommentSendError) => void; timer: ReturnType<typeof setTimeout> }>();

  constructor() {
    // Auto-reconnect on close
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private getWebSocketUrl(token: string): string {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5001/api/v1" : "");
    if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL is required outside local development");
    
    // Remove /api/v1 from the end
    const baseUrl = apiBaseUrl.replace('/api/v1', '');
    
    // Determine protocol
    const isSecure = baseUrl.startsWith('https://');
    const protocol = isSecure ? 'wss' : 'ws';
    
    // Get hostname
    const host = baseUrl.replace(/^https?:\/\//, '');
    
    // For Render, WebSocket should be on the same domain
    return `${protocol}://${host}/ws?token=${token}`;
  }

  /** Subscribe to connected/disconnected transitions (true once OPEN, false on every close). Returns an unsubscribe. */
  onStatusChange(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(connected: boolean): void {
    this.statusListeners.forEach((listener) => { try { listener(connected); } catch { /* listener errors must not break the socket */ } });
  }

  /** Idempotent: a second call while connecting/open reuses the existing socket instead of opening a duplicate. */
  async connect(token: string): Promise<void> {
    this.authFailed = false;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.connecting = new Promise<void>((resolve, reject) => {
      let settled = false;
      try {
        const wsUrl = this.getWebSocketUrl(token);
        const socket = new WebSocket(wsUrl);
        this.socket = socket;

        socket.onopen = () => {
          this.reconnectAttempts = 0;
          this.startConnectionCheck();
          // The server forgets rooms when a socket drops: re-join every room this client still has open.
          this.taskRooms.forEach((taskId) => { try { socket.send(JSON.stringify({ type: 'join_task', taskId })); } catch { /* retried on next open */ } });
          this.emitStatus(true);
          settled = true; this.connecting = null;
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        socket.onerror = () => {
          // The close event that follows drives reconnection; only the initial connect promise needs the rejection.
          if (!settled) { settled = true; this.connecting = null; reject(new Error('WebSocket connection failed')); }
        };

        socket.onclose = (event) => {
          if (this.socket === socket) this.socket = null;
          this.connecting = null;
          this.stopConnectionCheck();
          this.failPendingAcks('CONNECTION_LOST');
          this.serverFeatures = new Set();
          this.emitStatus(false);
          if (!settled) { settled = true; reject(new Error('WebSocket closed before it opened')); }
          const decision = reconnectDecision(event.code);
          if (decision === 'auth') { this.authFailed = true; return; } // an expired/invalid session cannot be fixed by retrying
          if (decision === 'retry') this.attemptReconnect(token);
        };
      } catch (error) {
        this.connecting = null;
        reject(error);
      }
    });
    return this.connecting;
  }

  private startConnectionCheck(): void {
    this.connectionCheckInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send ping every 25 seconds to keep connection alive
        this.sendPing();
      }
    }, 25000);
  }

  private stopConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  private sendPing(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'ping' }));
      this.lastPingTime = Date.now();
    }
  }

  private attemptReconnect(token: string): void {
    if (this.reconnectTimer || this.authFailed) return;
    this.reconnectAttempts++;
    // Exponential backoff with jitter, capped. Retries continue indefinitely (a backend/database outage can last minutes);
    // a single, non-alarming notice is shown after a sustained failure.
    const delay = reconnectDelay(this.reconnectAttempts, this.reconnectDelay);
    if (this.reconnectAttempts === 6) {
      toast({ title: 'Reconnecting…', description: 'Live updates are paused. We will reconnect automatically.' });
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect(token).catch(() => { /* onclose schedules the next attempt */ });
      }
    }, delay);
  }

  private handleOnline(): void {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      this.reconnectAttempts = 0; // network is back: do not wait out a long backoff
      this.connect(token).catch(() => { /* onclose schedules a retry */ });
    }
  }

  private handleOffline(): void {
    console.log('🌐 Network offline');
    toast({
      title: 'Network offline',
      description: 'Chat features unavailable',
      variant: 'destructive',
    });
  }

  disconnect(): void {
    this.stopConnectionCheck();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.authFailed = true; // an explicit disconnect (logout) must not auto-reconnect
    this.failPendingAcks('CONNECTION_LOST');
    
    if (this.socket) {
      // Leave all task rooms
      this.taskRooms.forEach(taskId => {
        this.leaveTaskRoom(taskId);
      });
      
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
    
    if (this.isTypingTimeout) {
      clearTimeout(this.isTypingTimeout);
      this.isTypingTimeout = null;
    }
  }

  joinTaskRoom(taskId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    if (this.taskRooms.has(taskId)) {
      return;
    }

    this.socket.send(JSON.stringify({
      type: 'join_task',
      taskId,
    }));

    this.taskRooms.add(taskId);
    console.log(`Joined task room: ${taskId}`);
  }

  leaveTaskRoom(taskId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!this.taskRooms.has(taskId)) {
      return;
    }

    this.socket.send(JSON.stringify({
      type: 'leave_task',
      taskId,
    }));

    this.taskRooms.delete(taskId);
    console.log(`Left task room: ${taskId}`);
  }

    /**
     * Sends a comment and resolves ONLY when the server acknowledges that it is persisted (an `ack` with the same
     * clientMessageId). Rejects with a CommentSendError (never "delivered") on a closed socket, a server error, a lost
     * connection or a timeout. The same clientMessageId makes any later retry (e.g. over HTTP) idempotent on the server.
     */
    sendCommentWithAck(taskId: string, content: string, clientMessageId: string, timeoutMs = 8000): Promise<any> {
      return new Promise((resolve, reject) => {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          reject(new CommentSendError('NOT_CONNECTED', true));
          return;
        }
        const timer = setTimeout(() => {
          this.pendingAcks.delete(clientMessageId);
          reject(new CommentSendError('ACK_TIMEOUT', true));
        }, timeoutMs);
        this.pendingAcks.set(clientMessageId, { resolve, reject, timer });
        try {
          this.socket.send(JSON.stringify({ type: 'new_comment', taskId, comment: { content }, messageId: clientMessageId }));
        } catch {
          clearTimeout(timer);
          this.pendingAcks.delete(clientMessageId);
          reject(new CommentSendError('SEND_FAILED', true));
        }
      });
    }

    private failPendingAcks(code: string): void {
      this.pendingAcks.forEach((pending, id) => { clearTimeout(pending.timer); pending.reject(new CommentSendError(code, true)); this.pendingAcks.delete(id); });
    }

// In src/lib/websocket.ts - Update sendComment method
    sendComment(taskId: string, content: string): string {
        // Generate a unique message ID
        const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected, falling back to HTTP');
        // Store as pending to prevent duplicates when reconnected
        this.pendingComments.set(messageId, taskId);
        return messageId;
        }

        // Store as sent to prevent duplicates
        this.processedMessageIds.add(messageId);
        
        this.socket.send(JSON.stringify({
        type: 'new_comment',
        taskId,
        comment: { content },
        messageId: messageId
        }));
        
        return messageId;
    }

    // Add method to check if message was already processed
    isMessageProcessed(messageId: string): boolean {
        return this.processedMessageIds.has(messageId);
    }

    // Add method to mark message as processed
    markMessageAsProcessed(messageId: string): void {
        this.processedMessageIds.add(messageId);
    }

    // Add method to clear old processed messages (prevent memory leak)
    clearOldProcessedMessages(): void {
        // Keep only messages from last 24 hours
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        
        this.processedMessageIds.forEach(messageId => {
        const timestamp = parseInt(messageId.split('-')[0]);
        if (timestamp < cutoffTime) {
            this.processedMessageIds.delete(messageId);
        }
        });
    }

  sendTypingIndicator(taskId: string, isTyping: boolean): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify({
      type: 'typing_indicator',
      taskId,
      isTyping,
    }));
  }

  on(eventType: string, handler: WebSocketHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: WebSocketHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    // Access to a task room was refused or revoked (membership removed, workspace suspended, task no longer visible): forget the
    // room so a reconnect does not keep asking for it.
    if ((message.type === 'room_revoked' || (message.type === 'error' && message.taskId && message.code !== 'DATABASE_UNAVAILABLE')) && message.taskId) {
      this.taskRooms.delete(message.taskId);
    }
    // Acknowledgements settle the pending send; they are still dispatched to handlers below (the UI adds the saved comment).
    if (message.type === 'new_comment' && message.ack && message.messageId && this.pendingAcks.has(message.messageId)) {
      const pending = this.pendingAcks.get(message.messageId)!;
      clearTimeout(pending.timer); this.pendingAcks.delete(message.messageId);
      pending.resolve(message.comment);
    }
    if (message.type === 'comment_error' && message.messageId && this.pendingAcks.has(message.messageId)) {
      const pending = this.pendingAcks.get(message.messageId)!;
      clearTimeout(pending.timer); this.pendingAcks.delete(message.messageId);
      pending.reject(new CommentSendError(String(message.code || 'COMMENT_REJECTED'), message.retryable !== false, message.message));
    }

    // Handle specific message types
    switch (message.type) {
      case 'connection_established':
        // Learn what THIS server build supports. A backend that predates acknowledged comments sends no features.
        this.serverFeatures = new Set(Array.isArray(message.features) ? message.features.filter((f: unknown) => typeof f === 'string') : []);
        // toast({
        //   title: 'Connected',
        //   description: 'Chat features enabled',
        //   variant: 'default',
        // });
        break;

      case 'pong':
        const pingTime = Date.now() - this.lastPingTime;
        console.log(`🏓 Pong received (${pingTime}ms)`);
        break;

      case 'new_comment':
        if (message.ack) break; // acknowledgement of our own send, not news
        toast({
          title: 'New comment',
          description: `${message.userName} posted a comment`,
          duration: 3000,
        });
        break;

      case 'error':
        console.error('❌ WebSocket server error:', message.error);
        toast({
          title: 'Chat error',
          description: message.message || 'Connection issue',
          variant: 'destructive',
        });
        break;
    }

    // Call registered handlers
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }

  /** True only when the connected server announced acknowledged-comment support (unknown/older backend => false => use HTTP only). */
  supportsCommentAck(): boolean {
    return this.isConnected() && this.serverFeatures.has('comments.ack');
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
