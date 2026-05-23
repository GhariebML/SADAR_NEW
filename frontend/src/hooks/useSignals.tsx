// src/hooks/useSignals.ts
import { useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getPredictions, type Signal } from '../api/apiClient';

interface UseSignalsOptions {
  autoFetch?: boolean;
  limit?: number;
  label?: string;
  refreshInterval?: number;
}

export const useSignals = (options: UseSignalsOptions = {}) => {
  const {
    autoFetch = true,
    limit = 100,
    label,
    refreshInterval,
  } = options;

  const { signals, isLoading, fetchSignals } = useStore();

  const refresh = useCallback(() => {
    return fetchSignals(limit, label);
  }, [fetchSignals, limit, label]);

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  const getSignalsByLabel = useCallback(
    (labelName: string) => signals.filter((s) => s.label === labelName),
    [signals]
  );

  const getRecentSignals = useCallback(
    (count: number = 10) => signals.slice(0, count),
    [signals]
  );

  const getSignalStats = useCallback(() => {
    const counts: Record<string, number> = {};
    let totalConfidence = 0;
    signals.forEach((s) => {
      counts[s.label] = (counts[s.label] || 0) + 1;
      totalConfidence += s.confidence;
    });
    return {
      total: signals.length,
      byLabel: counts,
      avgConfidence: signals.length ? totalConfidence / signals.length : 0,
    };
  }, [signals]);

  return {
    signals,
    isLoading,
    refresh,
    getSignalsByLabel,
    getRecentSignals,
    getSignalStats,
  };
};

export default useSignals;