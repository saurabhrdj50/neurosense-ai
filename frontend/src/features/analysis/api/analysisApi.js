const API_BASE = ''

export const analysisApi = {
  runFullAnalysis: async (formData) => {
    const res = await fetch(`${API_BASE}/api/analysis/analyze`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return res.json()
  },

  analyzeMRI: async (file, gradcam = true) => {
    const formData = new FormData()
    formData.append('mri_image', file)
    formData.append('gradcam', gradcam)
    
    const res = await fetch(`${API_BASE}/api/analysis/mri`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return res.json()
  },

  analyzeSentiment: async (text) => {
    const res = await fetch(`${API_BASE}/api/analysis/sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    })
    return res.json()
  },

  evaluateCognitive: async (answers) => {
    const res = await fetch(`${API_BASE}/api/analysis/cognitive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(answers),
    })
    return res.json()
  },

  assessRisk: async (factors) => {
    const res = await fetch(`${API_BASE}/api/analysis/risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(factors),
    })
    return res.json()
  },

  analyzeHandwriting: async (file = null, canvasData = null) => {
    const formData = new FormData()
    if (file) formData.append('image', file)
    if (canvasData) formData.append('canvas_data', canvasData)

    const res = await fetch(`${API_BASE}/api/analysis/handwriting`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return res.json()
  },

  analyzeGenomics: async (text) => {
    const res = await fetch(`${API_BASE}/api/analysis/genomics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dna_text: text }),
    })
    return res.json()
  },

  transcribeAudio: async (file) => {
    const formData = new FormData()
    formData.append('audio', file)

    const res = await fetch(`${API_BASE}/api/analysis/transcribe`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return res.json()
  },
}
