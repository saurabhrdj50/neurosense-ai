import API_URL from '../../../config/api';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const patientsApi = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/api/patients`, { credentials: 'include' })
    return handleResponse(res)
  },

  getById: async (patientId) => {
    const res = await fetch(`${API_URL}/api/patients/${patientId}`, { credentials: 'include' })
    return handleResponse(res)
  },

  create: async (data) => {
    const res = await fetch(`${API_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  update: async (patientId, data) => {
    const res = await fetch(`${API_URL}/api/patients/${patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  delete: async (patientId) => {
    const res = await fetch(`${API_URL}/api/patients/${patientId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    return handleResponse(res)
  },

  export: (patientId) => {
    window.open(`${API_URL}/api/patients/export/${patientId}`, '_blank')
  },
}
