// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { websocketService } from '@/lib/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  joinTaskRoom: (taskId: string) => void;
  leaveTaskRoom: (taskId: string) => void;
  sendComment: (taskId: string, content: string) => void;
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

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    if (!user || !token) {
      // Disconnect if no user or token
      if (websocketService.isConnected()) {
        websocketService.disconnect();
      }
      setIsConnected(false);
      return;
    }

    const connectWebSocket = async () => {
      try {
        // Use the token from localStorage
        await websocketService.connect(token);
        setIsConnected(true);
        
        console.log('✅ WebSocket connected');
        
        // Listen for connection status changes
        websocketService.on('connection_established', () => {
          console.log('✅ WebSocket connection established');
          setIsConnected(true);
        });

      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup on user logout or component unmount
    return () => {
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
        return;
      }
      websocketService.sendComment(taskId, content);
    },
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