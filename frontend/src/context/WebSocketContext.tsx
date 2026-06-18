// src/context/WebSocketContext.tsx
// ✅ إصلاح: WebSocket context واحد للكل - الـ Navbar والـ Agent وكل الصفحات
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';

export interface Alert {
  id: number;
  signal_id: number;
  alert_type: string;
  status: string;
  location: string;
  timestamp: string;
}

export interface WebSocketMessage {
  alert_id?: number;
  signal_id?: number;
  label?: string;
  confidence?: number;
  alert_type?: string;
  location?: string;
  timestamp?: string;
  status?: string;
}

interface WebSocketContextType {
  alerts: Alert[];
  isConnected: boolean;       // ✅ WebSocket للتنبيهات
  isApiOnline: boolean;       // ✅ API Server status منفصل
  lastMessage: WebSocketMessage | null; // ✅ آخر رسالة من الـ WebSocket
  sendMessage: (message: string) => void;
  checkApiHealth: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL  = BASE_URL.replace(/^http/, 'ws') + '/ws/alerts';
const API_URL = BASE_URL + '/api/v1/health';
const MAX_RECONNECT_ATTEMPTS = 10;

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts]         = useState<Alert[]>([]);
  const [isConnected, setIsConnected]   = useState(false);
  const [isApiOnline, setIsApiOnline]   = useState(false);
  const [lastMessage, setLastMessage]   = useState<WebSocketMessage | null>(null);

  const wsRef                   = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts       = useRef(0);
  const mountedRef              = useRef(true);

  // ── API Health check ──────────────────────────────────────────────────────
  const checkApiHealth = useCallback(async () => {
    try {
      const res = await fetch(API_URL, { signal: AbortSignal.timeout(4000) });
      if (mountedRef.current) setIsApiOnline(res.ok);
    } catch {
      if (mountedRef.current) setIsApiOnline(false);
    }
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        // لما WebSocket يشتغل، API أكيد شغال
        setIsApiOnline(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          if (mountedRef.current) setLastMessage(data);
          if (data.alert_id && mountedRef.current) {
            const alert: Alert = {
              id:         data.alert_id,
              signal_id:  data.signal_id ?? 0,
              alert_type: data.alert_type ?? 'unknown',
              status:     data.status ?? 'active',
              location:   data.location ?? 'unknown',
              timestamp:  data.timestamp ?? new Date().toISOString(),
            };
            setAlerts(prev => [alert, ...prev.slice(0, 99)]);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Exponential backoff — max 30s, limit to MAX_RECONNECT_ATTEMPTS
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts.current));
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          console.error('Max WebSocket reconnection attempts reached');
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WS creation error:', e);
      if (mountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    checkApiHealth();
    // فحص الـ API كل 30 ثانية
    const apiInterval = setInterval(checkApiHealth, 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(apiInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect, checkApiHealth]);

  return (
    <WebSocketContext.Provider value={{ alerts, isConnected, isApiOnline, lastMessage, sendMessage, checkApiHealth }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used inside WebSocketProvider');
  return ctx;
};
