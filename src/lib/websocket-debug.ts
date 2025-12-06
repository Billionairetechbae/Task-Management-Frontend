// src/lib/websocket-debug.ts
import { websocketService } from './websocket';

export function enableWebSocketDebug() {
  if (typeof window !== 'undefined') {
    // Expose WebSocket service to window for debugging
    (window as any).websocketService = websocketService;
    
    // Log all messages
    websocketService.on('*', (message: any) => {
      console.log('🔵 WebSocket Message:', message);
    });
    
    console.log('🔍 WebSocket debug enabled. Type `websocketService` in console to inspect.');
  }
}

// Call this in your main.tsx or App.tsx
// enableWebSocketDebug();