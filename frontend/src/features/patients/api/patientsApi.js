import apiClient from '../../../services/apiClient';
import API_URL from '../../../config/api';

export const patientsApi = {
  getAll: async () => {
    return apiClient.get('/api/patients')
  },

  create: async (data) => {
    return apiClient.post('/api/patients', data)
  },

  delete: async (patientId) => {
    return apiClient.delete(`/api/patients/${patientId}`)
  },

  export: (patientId) => {
    window.open(`${API_URL}/api/patients/export/${patientId}`, '_blank')
  },

  exportAll: () => {
    window.open(`${API_URL}/api/patients/export`, '_blank')
  },
}
