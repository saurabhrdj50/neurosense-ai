const API_BASE = ''

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const analysisApi = {
  runFullAnalysis: async (formData) => {
    const res = await fetch(`${API_BASE}/api/analysis/analyze`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return handleResponse(res)
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
    return handleResponse(res)
  },

  analyzeSentiment: async (text) => {
    const res = await fetch(`${API_BASE}/api/analysis/sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    })
    return handleResponse(res)
  },

  evaluateCognitive: async (answers) => {
    const res = await fetch(`${API_BASE}/api/analysis/cognitive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(answers),
    })
    return handleResponse(res)
  },

  assessRisk: async (factors) => {
    const res = await fetch(`${API_BASE}/api/analysis/risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(factors),
    })
    return handleResponse(res)
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
    return handleResponse(res)
  },

  analyzeGenomics: async (text) => {
    const res = await fetch(`${API_BASE}/api/analysis/genomics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dna_text: text }),
    })
    return handleResponse(res)
  },

  transcribeAudio: async (file) => {
    const formData = new FormData()
    formData.append('audio', file)

    const res = await fetch(`${API_BASE}/api/analysis/transcribe`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return handleResponse(res)
  },

  downloadPdfReport: async (results) => {
    const res = await fetch(`${API_BASE}/api/analysis/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(results),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Download failed' }))
      throw new Error(err.error || 'Download failed')
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const patientId = results?.patient_info?.patient_id || 'report'
    a.download = `neurosense_report_${patientId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  },
}
