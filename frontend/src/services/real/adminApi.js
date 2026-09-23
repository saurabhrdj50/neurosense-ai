import { apiClient } from './apiClient';

export const adminApi = {
  getDashboard: () => apiClient.get('/api/admin/dashboard'),
  getDoctors: () => apiClient.get('/api/admin/doctors'),
  getPatients: () => apiClient.get('/api/admin/patients'),
  getDoctorPatients: (id) => apiClient.get(`/api/admin/doctors/${id}/patients`),
  getSessions: () => apiClient.get('/api/admin/sessions'),
  getAuditLog: () => apiClient.get('/api/admin/audit-log'),
  getHealth: () => apiClient.get('/api/health'),
  deleteDoctor: (id) => apiClient.delete(`/api/admin/doctors/${id}`),
  deletePatient: (id) => apiClient.delete(`/api/admin/patients/${id}`),
  deleteSession: (id) => apiClient.delete(`/api/admin/sessions/${id}`),
};
