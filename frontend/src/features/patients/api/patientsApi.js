import apiClient from '../../../services/apiClient';
import API_URL from '../../../config/api';
import { fetchAllPages } from '../../../shared/utils/paginatedFetch';

export const patientsApi = {
  /**
   * Full patient roster, fetched page-by-page (200/page) behind a stable
   * "all patients" contract. Returns { patients, total, truncated }.
   */
  getAll: async ({ maxRows = 2000 } = {}) => {
    const { rows, total, truncated } = await fetchAllPages(
      async ({ limit, offset }) => {
        const res = await apiClient.get(`/api/patients?limit=${limit}&offset=${offset}`)
        const list = Array.isArray(res) ? res : (res.patients || [])
        return { rows: list, total: Array.isArray(res) ? list.length : res.total }
      },
      { maxRows },
    )
    return { patients: rows, total, truncated }
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
