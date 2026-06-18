// src/hooks/useAgent.ts
import { useState, useCallback } from 'react';
import { askAgent, generateReport, getAgentHealth, type AgentResponse } from '../api/apiClient';

interface UseAgentOptions {
  onError?: (error: Error) => void;
}

export const useAgent = (options: UseAgentOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const health = await getAgentHealth();
      setIsOnline(health.status === 'healthy' && health.ollama.ok);
      return health;
    } catch (err) {
      setIsOnline(false);
      return null;
    }
  }, []);

  const ask = useCallback(
    async (question: string, top_k?: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await askAgent(question, top_k);
        setLastResponse(response);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'فشل في الاتصال بالمساعد';
        setError(errorMsg);
        options.onError?.(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const generateReportFromSignal = useCallback(
    async (payload: {
      label: string;
      confidence: number;
      frequency_mhz?: number;
      snr_db?: number;
      source?: string;
      location?: string;
      analyst_notes?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await generateReport(payload);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'فشل في إنشاء التقرير';
        setError(errorMsg);
        options.onError?.(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    isOnline,
    lastResponse,
    error,
    ask,
    generateReportFromSignal,
    checkHealth,
    clearError,
  };
};

export default useAgent;