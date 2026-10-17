import { apiClient } from '../../../services/apiClient';
import { fetchAllPages } from '../../../shared/utils/paginatedFetch';

const paged = (path, rowsKey) => async ({ maxRows = 2000 } = {}) => {
  const { rows, total, truncated } = await fetchAllPages(
    async ({ limit, offset }) => {
      const res = await apiClient.get(`${path}?limit=${limit}&offset=${offset}`)
      return { rows: res[rowsKey] || [], total: res.total }
    },
    { maxRows },
  )
  return { [rowsKey]: rows, total, truncated }
};

export const adminApi = {
  getDashboard: () => apiClient.get('/api/admin/dashboard'),
  getDoctors: () => apiClient.get('/api/admin/doctors'),
  // Admin tables see every row in the deployment — walked page-by-page like
  // the clinician-facing lists so a large instance can't stall the panel.
  getPatients: paged('/api/admin/patients', 'patients'),
  getSessions: paged('/api/admin/sessions', 'sessions'),
  getAuditLog: async ({ maxRows = 2000, action, resourceType } = {}) => {
    const params = new URLSearchParams({ limit: '200', offset: '0' })
    if (action) params.set('action', action)
    if (resourceType) params.set('resource_type', resourceType)
    const { rows, total, truncated } = await fetchAllPages(
      async ({ limit, offset }) => {
        params.set('limit', String(limit))
        params.set('offset', String(offset))
        const res = await apiClient.get(`/api/admin/audit-log?${params.toString()}`)
        return { rows: res.logs || [], total: res.total }
      },
      { maxRows },
    )
    return { logs: rows, total, truncated }
  },
  getDoctorPatients: (id) => apiClient.get(`/api/admin/doctors/${id}/patients`),
  getHealth: () => apiClient.get('/api/health'),
  deleteDoctor: (id) => apiClient.delete(`/api/admin/doctors/${id}`),
  deletePatient: (id) => apiClient.delete(`/api/admin/patients/${id}`),
  deleteSession: (id) => apiClient.delete(`/api/admin/sessions/${id}`),
};
