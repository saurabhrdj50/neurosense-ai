const API_BASE = ''

export const historyApi = {
  getPatientHistory: async (patientId, limit = 20) => {
    const res = await fetch(`${API_BASE}/api/patients/history/${patientId}?limit=${limit}`, {
      credentials: 'include',
    })
    return res.json()
  },

  exportPatientHistory: (patientId) => {
    window.open(`${API_BASE}/api/patients/export/${patientId}`, '_blank')
  },
}