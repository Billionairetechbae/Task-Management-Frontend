// src/components/WebSocketStatus.tsx
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export const WebSocketStatus = () => {
  const { isConnected } = useWebSocket();
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={isConnected ? "default" : "secondary"}
        className="gap-2"
      >
        {isConnected ? (
          <>
            <Wifi className="w-3 h-3" />
            Connected
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            Disconnected
          </>
        )}
      </Badge>
    </div>
  );
};