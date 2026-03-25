import API_URL from '../../../config/api';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const resultsApi = {
  generateReport: async (results, patientInfo = null) => {
    const res = await fetch(`${API_URL}/api/utils/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ results, patient_info: patientInfo }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Report generation failed' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.blob()
  },

  getMusicRecommendation: async (stage, emotion = 'neutral') => {
    const res = await fetch(`${API_URL}/api/utils/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ stage, emotion }),
    })
    return handleResponse(res)
  },

  chatWithAI: async (query, patientId = null, apiKey = null, provider = 'gemini') => {
    const res = await fetch(`${API_URL}/api/utils/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, patient_id: patientId, api_key: apiKey, provider }),
    })
    return handleResponse(res)
  },
}