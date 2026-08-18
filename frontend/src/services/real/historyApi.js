import apiClient from './apiClient';
import API_URL from '../../config/api';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const historyApi = {
  getPatientHistory: async (patientId, limit = 20) => {
    return apiClient.get(`/api/patients/history/${patientId}?limit=${limit}`)
  },

  getSessionDetail: async (sessionId) => {
    return apiClient.get(`/api/analyses/${sessionId}`)
  },

  getAllAnalyses: async () => {
    return apiClient.get('/api/analyses')
  },

  exportPatient: async (patientId) => {
    const res = await fetch(`${API_URL}/api/patients/export/${patientId}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(err.error || err.message || `HTTP ${res.status}`)
    }
    return res.blob()
  },

  exportPatientHistory: (patientId) => {
    window.open(`${API_URL}/api/patients/export/${patientId}`, '_blank')
  },
}
