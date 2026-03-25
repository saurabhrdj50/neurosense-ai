const API_BASE = ''

export const patientsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/api/patients`, { credentials: 'include' })
    return res.json()
  },

  getById: async (patientId) => {
    const res = await fetch(`${API_BASE}/api/patients/${patientId}`, { credentials: 'include' })
    return res.json()
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return res.json()
  },

  update: async (patientId, data) => {
    const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return res.json()
  },

  delete: async (patientId) => {
    const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    return res.json()
  },

  export: (patientId) => {
    window.open(`${API_BASE}/api/patients/export/${patientId}`, '_blank')
  },
}
