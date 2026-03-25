/**
 * React Query Hooks Usage Guide
 * 
 * This module exports pre-configured hooks for common data fetching patterns
 * in the NeuroSense AI application.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../providers/QueryProvider';
import api from '../api/client';

/**
 * Hook for fetching patient list with filters
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (role, search, etc.)
 * @param {boolean} options.enabled - Whether to enable the query
 */
export function usePatientsList(options = {}) {
  const { filters = {}, enabled = true } = options;
  
  return useQuery({
    queryKey: queryKeys.patients.list(filters),
    queryFn: () => api.get('/api/patients', { params: filters }).then(r => r.data),
    enabled,
  });
}

/**
 * Hook for fetching a single patient by ID
 * @param {string|number} patientId - Patient ID
 * @param {Object} options - Query options
 */
export function usePatient(patientId, options = {}) {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => api.get(`/api/patients/${patientId}`).then(r => r.data),
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook for fetching patient analysis history
 * @param {string|number} patientId - Patient ID
 * @param {Object} options - Query options
 */
export function usePatientHistory(patientId, options = {}) {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: queryKeys.patients.history(patientId),
    queryFn: () => api.get(`/api/patients/${patientId}/history`).then(r => r.data),
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook for submitting analysis requests
 * Provides mutation with automatic cache invalidation
 */
export function useAnalysisMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.post('/api/analysis/submit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
    },
  });
}

/**
 * Hook for fetching analysis results by session ID
 * @param {string} sessionId - Analysis session ID
 * @param {Object} options - Query options including polling config
 */
export function useAnalysisResult(sessionId, options = {}) {
  const { 
    enabled = true, 
    refetchInterval = false,
    pollInterval = 5000 
  } = options;
  
  return useQuery({
    queryKey: queryKeys.analysis.result(sessionId),
    queryFn: () => api.get(`/api/analysis/results/${sessionId}`).then(r => r.data),
    enabled: enabled && !!sessionId,
    refetchInterval: refetchInterval ? pollInterval : false,
    retry: 3,
    retryDelay: 1000,
  });
}

/**
 * Hook for fetching analysis trends for a patient
 * @param {string|number} patientId - Patient ID
 * @param {Object} options - Query options
 */
export function useAnalysisTrends(patientId, options = {}) {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: queryKeys.analysis.trends(patientId),
    queryFn: () => api.get(`/api/analysis/trends/${patientId}`).then(r => r.data),
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook for authentication state
 */
export function useAuth() {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for system health check
 */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.get('/api/health').then(r => r.data),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

/**
 * Hook for fetching metrics
 */
export function useMetrics() {
  return useQuery({
    queryKey: queryKeys.metrics,
    queryFn: () => api.get('/api/metrics').then(r => r.data),
    refetchInterval: 60000,
  });
}
