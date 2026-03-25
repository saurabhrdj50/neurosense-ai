const API_BASE = ''

export const resultsApi = {
  generateReport: async (results, patientInfo = null) => {
    const res = await fetch(`${API_BASE}/api/utils/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ results, patient_info: patientInfo }),
    })
    return res.blob()
  },

  getMusicRecommendation: async (stage, emotion = 'neutral') => {
    const res = await fetch(`${API_BASE}/api/utils/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ stage, emotion }),
    })
    return res.json()
  },

  chatWithAI: async (query, patientId = null, apiKey = null, provider = 'gemini') => {
    const res = await fetch(`${API_BASE}/api/utils/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, patient_id: patientId, api_key: apiKey, provider }),
    })
    return res.json()
  },
}