import apiClient from '../../../services/apiClient';
import API_URL from '../../../config/api';

export const historyApi = {
  getPatientHistory: async (patientId, limit = 20) => {
    return apiClient.get(`/api/patients/history/${patientId}?limit=${limit}`)
  },

  getAllAnalyses: async () => {
    return apiClient.get('/api/analyses')
  },

  exportPatientHistory: (patientId) => {
    window.open(`${API_URL}/api/patients/export/${patientId}`, '_blank')
  },
}
