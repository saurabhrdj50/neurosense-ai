/**
 * React Query provider configuration
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * Default query client configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Query provider wrapper component
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

/**
 * Hook to access query client for advanced operations
 */
export function useQueryClient() {
  return queryClient;
}

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  patients: {
    all: ['patients'],
    list: (filters) => [...queryKeys.patients.all, 'list', filters],
    detail: (id) => [...queryKeys.patients.all, 'detail', id],
    history: (id) => [...queryKeys.patients.all, 'history', id],
  },
  analysis: {
    all: ['analysis'],
    result: (sessionId) => [...queryKeys.analysis.all, 'result', sessionId],
    trends: (patientId) => [...queryKeys.analysis.all, 'trends', patientId],
  },
  auth: {
    user: ['auth', 'user'],
  },
  health: ['health'],
  metrics: ['metrics'],
};

/**
 * Pre-configured query hooks for common patterns
 */
export const queryHooks = {
  usePatientsList: (options = {}) => {
    const { usePatients } = require('../features/patients/hooks/usePatients');
    return usePatients(options);
  },
  
  usePatientHistory: (patientId, options = {}) => {
    const { useHistory } = require('../features/history/hooks/useHistory');
    return useHistory(patientId, options);
  },
  
  useAnalysis: () => {
    const { useAnalysis } = require('../features/analysis/hooks/useAnalysis');
    return useAnalysis();
  },
};
