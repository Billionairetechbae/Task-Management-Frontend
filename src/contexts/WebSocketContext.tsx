// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { websocketService } from '@/lib/websocket';
import { useRealtimeCacheSync } from '@/hooks/useRealtimeCacheSync';


interface WebSocketContextType {
  isConnected: boolean;
  joinTaskRoom: (taskId: string) => void;
  leaveTaskRoom: (taskId: string) => void;
  sendComment: (taskId: string, content: string) => string | undefined;
  /** Resolves only after the server acknowledges persistence; rejects (CommentSendError) otherwise. */
  sendCommentWithAck: (taskId: string, content: string, clientMessageId: string, timeoutMs?: number) => Promise<any>;
  sendTypingIndicator: (taskId: string, isTyping: boolean) => void;
  on: (eventType: string, handler: (message: any) => void) => void;
  off: (eventType: string, handler: (message: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Keep the React Query cache in sync with realtime events.
  useRealtimeCacheSync(isConnected);

  useEffect(() => {

    // Get token from localStorage
    const token =
      localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    if (!user || !token) {
      // Disconnect if no user or token
      if (websocketService.isConnected()) {
        websocketService.disconnect();
      }
      setIsConnected(false);
      return;
    }

    // Reflect every transition (including drops and automatic reconnects), not just the first successful connect.
    const unsubscribe = websocketService.onStatusChange(setIsConnected);
    setIsConnected(websocketService.isConnected());

    // A failed first attempt is retried by the service itself (backoff, indefinitely); nothing to do here.
    websocketService.connect(token).catch(() => undefined);

    // Cleanup on user logout or component unmount
    return () => {
      unsubscribe();
      // Only disconnect if user is logging out
      // This allows WebSocket to persist across route changes
      if (!user) {
        websocketService.disconnect();
        setIsConnected(false);
      }
    };
  }, [user]); // Reconnect when user changes

  const value: WebSocketContextType = {
    isConnected,
    joinTaskRoom: (taskId: string) => {
      if (!isConnected) {
        console.warn('⚠️ WebSocket not connected, cannot join room');
        return;
      }
      websocketService.joinTaskRoom(taskId);
    },
    leaveTaskRoom: (taskId: string) => websocketService.leaveTaskRoom(taskId),
    sendComment: (taskId: string, content: string) => {
      if (!isConnected) {
        console.warn('⚠️ WebSocket not connected, falling back to HTTP');
        return undefined;
      }
      return websocketService.sendComment(taskId, content);
    },
    sendCommentWithAck: (taskId: string, content: string, clientMessageId: string, timeoutMs?: number) =>
      websocketService.sendCommentWithAck(taskId, content, clientMessageId, timeoutMs),
    sendTypingIndicator: (taskId: string, isTyping: boolean) => {
      if (!isConnected) {
        return;
      }
      websocketService.sendTypingIndicator(taskId, isTyping);
    },
    on: (eventType: string, handler: (message: any) => void) => 
      websocketService.on(eventType, handler),
    off: (eventType: string, handler: (message: any) => void) => 
      websocketService.off(eventType, handler),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
