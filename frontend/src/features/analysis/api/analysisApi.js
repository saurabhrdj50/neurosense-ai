import API_URL from '../../../config/api';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const analysisApi = {
  runFullAnalysis: async (formData) => {
    const res = await fetch(`${API_URL}/api/analysis/analyze`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return handleResponse(res)
  },

  mriPreview: async (file) => {
    const formData = new FormData()
    formData.append('mri_image', file)

    const res = await fetch(`${API_URL}/api/analysis/mri/preview`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Preview failed' }))
      throw new Error(err.error || 'Preview failed')
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },

  getPastAnalyses: async () => {
    const res = await fetch(`${API_URL}/api/analysis/history`, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = await res.json();
    return Array.isArray(data) ? data : (data.analyses || data.history || []);
  },

  downloadPdfReport: async (results) => {
    const res = await fetch(`${API_URL}/api/analysis/report/pdf`, {
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
