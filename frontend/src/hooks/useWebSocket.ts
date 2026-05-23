// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert } from '../api/apiClient';

interface WebSocketMessage {
  alert_id?: number;
  signal_id?: number;
  label?: string;
  confidence?: number;
  alert_type?: string;
  location?: string;
  timestamp?: string;
}

interface UseWebSocketReturn {
  alerts: Alert[];
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: string) => void;
}

const WS_URL = 'ws://localhost:8000/ws/alerts';
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocket = (): UseWebSocketReturn => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Convert WebSocketMessage to Alert for the alerts array
          if (message.alert_id && message.signal_id && message.alert_type) {
            const newAlert: Alert = {
              id: message.alert_id,
              signal_id: message.signal_id,
              alert_type: message.alert_type,
              status: 'active',
              location: message.location || 'unknown',
              timestamp: message.timestamp || new Date().toISOString(),
            };
            setAlerts((prev) => [newAlert, ...prev.slice(0, 99)]); // Keep last 100 alerts
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Auto reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Retry connection
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_INTERVAL);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    alerts,
    isConnected,
    lastMessage,
    sendMessage,
  };
};

export default useWebSocket;