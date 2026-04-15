// src/components/WebSocketStatus.tsx
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const WebSocketStatus = () => {
  const { isConnected } = useWebSocket();
  const { user } = useAuth();
  if (!user) return null;
  
  return (
    <Badge variant="outline" className="gap-2 px-2 py-1 text-[11px]">
      {isConnected ? (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          <Wifi className="w-3 h-3" />
          Live
        </>
      ) : (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
          <WifiOff className="w-3 h-3" />
          Offline
        </>
      )}
    </Badge>
  );
};