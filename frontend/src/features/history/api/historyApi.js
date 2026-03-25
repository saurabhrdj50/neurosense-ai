const API_BASE = ''

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const historyApi = {
  getPatientHistory: async (patientId, limit = 20) => {
    const res = await fetch(`${API_BASE}/api/patients/history/${patientId}?limit=${limit}`, {
      credentials: 'include',
    })
    return handleResponse(res)
  },

  exportPatientHistory: (patientId) => {
    window.open(`${API_BASE}/api/patients/export/${patientId}`, '_blank')
  },
}