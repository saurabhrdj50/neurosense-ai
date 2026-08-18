import apiClient from './apiClient';

export const resultsApi = {
  generateReport: async (results, patientInfo = null) => {
    const res = await apiClient.post('/api/utils/report', { results, patient_info: patientInfo })
    if (res instanceof Response) {
      return res.blob()
    }
    return res
  },

  getMusicRecommendation: async (stage, emotion = 'neutral') => {
    return apiClient.post('/api/utils/music', { stage, emotion })
  },

  chatWithAI: async (query, patientId = null, apiKey = null, provider = 'gemini') => {
    return apiClient.post('/api/utils/chat', { query, patient_id: patientId, api_key: apiKey, provider })
  },
}
