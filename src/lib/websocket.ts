// src/lib/websocket.ts - Updated for Render
import { toast } from "@/hooks/use-toast";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export type WebSocketHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private processedMessageIds = new Set<string>(); // Track processed messages
  private pendingComments = new Map<string, string>(); // taskId -> messageId
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private handlers: Map<string, WebSocketHandler[]> = new Map();
  private taskRooms: Set<string> = new Set();
  private isTypingTimeout: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;

  constructor() {
    // Auto-reconnect on close
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private getWebSocketUrl(token: string): string {
    // For Render deployment
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://admiino-backend.onrender.com/api/v1';
    
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

  async connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.getWebSocketUrl(token);
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectAttempts = 0;
          this.startConnectionCheck();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.socket = null;
          this.stopConnectionCheck();
          
          // Only attempt reconnect if it wasn't a normal closure
          if (event.code !== 1000) {
            this.attemptReconnect(token);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      toast({
        title: 'Connection lost',
        description: 'Unable to connect to chat server. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);

    console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect(token).catch(console.error);
      }
    }, delay);
  }

  private handleOnline(): void {
    console.log('🌐 Network online, attempting reconnect...');
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.connect(token).catch(console.error);
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
    console.log('📨 WebSocket message received:', message);

    // Handle specific message types
    switch (message.type) {
      case 'connection_established':
        console.log('✅ WebSocket connection established');
        toast({
          title: 'Connected',
          description: 'Chat features enabled',
          variant: 'default',
        });
        break;

      case 'pong':
        const pingTime = Date.now() - this.lastPingTime;
        console.log(`🏓 Pong received (${pingTime}ms)`);
        break;

      case 'new_comment':
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

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();