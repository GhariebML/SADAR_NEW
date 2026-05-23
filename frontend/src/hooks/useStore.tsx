// src/store/useStore.ts (محدث - بدون hooks المكررة)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Signal,
  Alert,
  Statistics,
  getPredictions,
  getAlerts,
  getStatistics,
} from '../api/apiClient';

interface AppState {
  // State
  signals: Signal[];
  alerts: Alert[];
  statistics: Statistics | null;
  isLoading: boolean;
  theme: 'dark' | 'light';
  error: string | null;
  
  // Actions
  fetchSignals: (limit?: number, label?: string) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  addAlert: (alert: Alert) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  clearError: () => void;
  refreshAll: () => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      signals: [],
      alerts: [],
      statistics: null,
      isLoading: false,
      theme: 'dark',
      error: null,

      // Actions
      fetchSignals: async (limit = 100, label?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await getPredictions(limit, label);
          set({ signals: response.signals, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch signals:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch signals',
            isLoading: false 
          });
        }
      },

      fetchAlerts: async () => {
        set({ isLoading: true, error: null });
        try {
          const alerts = await getAlerts();
          set({ alerts, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch alerts:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch alerts',
            isLoading: false 
          });
        }
      },

      fetchStatistics: async () => {
        set({ isLoading: true, error: null });
        try {
          const statistics = await getStatistics();
          set({ statistics, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch statistics:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch statistics',
            isLoading: false 
          });
        }
      },

      addAlert: (alert: Alert) => {
        set((state) => ({
          alerts: [alert, ...state.alerts.slice(0, 99)],
        }));
      },

      setTheme: (theme: 'dark' | 'light') => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      clearError: () => {
        set({ error: null });
      },

      refreshAll: async () => {
        const { fetchSignals, fetchAlerts, fetchStatistics } = get();
        await Promise.all([
          fetchSignals(),
          fetchAlerts(),
          fetchStatistics(),
        ]);
      },
    }),
    {
      name: 'sadar-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

export default useStore;