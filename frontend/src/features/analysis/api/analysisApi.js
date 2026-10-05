import API_URL from '../../../config/api';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Human labels for the backend pipeline stages reported by background jobs.
export const ANALYSIS_STAGE_LABELS = {
  mri: 'Analyzing MRI scan',
  notes: 'Reading clinical notes',
  speech: 'Transcribing speech sample',
  cognitive: 'Scoring cognitive battery',
  risk: 'Computing risk profile',
  fusion: 'Fusing modality evidence',
  explanation: 'Generating explanation',
  recommendations: 'Building recommendations',
}

const JOB_POLL_INTERVAL_MS = 1500
const JOB_POLL_MAX_MS = 10 * 60 * 1000

export const analysisApi = {
  runFullAnalysis: async (formData) => {
    const res = await fetch(`${API_URL}/api/analysis/analyze`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return handleResponse(res)
  },

  analyzeAsync: async (formData) => {
    const res = await fetch(`${API_URL}/api/analysis/analyze-async`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    if (res.status !== 202) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || err.error || `HTTP ${res.status}`)
    }
    return res.json()
  },

  getAnalysisJob: async (jobId) => {
    const res = await fetch(`${API_URL}/api/analysis/jobs/${jobId}`, { credentials: 'include' })
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

/**
 * Submit the analysis as a background job and poll it to completion,
 * reporting real pipeline progress via onProgress(stage, pct).
 *
 * If the async endpoint is unavailable (non-202), the error carries
 * `fallback: true` so the caller can retry against the sync endpoint —
 * nothing started server-side in that case. Poll failures do NOT trigger
 * a sync re-run: the job may still be running server-side and a second
 * run would persist duplicate records.
 */
export async function runAnalysisWithProgress(formData, onProgress) {
  let job
  try {
    job = await analysisApi.analyzeAsync(formData)
  } catch (err) {
    err.fallback = true
    throw err
  }

  const started = Date.now()
  let pollFailures = 0
  while (Date.now() - started < JOB_POLL_MAX_MS) {
    await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS))
    let status
    try {
      status = await analysisApi.getAnalysisJob(job.job_id)
      pollFailures = 0
    } catch {
      pollFailures += 1
      if (pollFailures >= 3) throw new Error('Lost contact with the analysis job — check Test History for the result.')
      continue
    }
    if (status.status === 'completed') return status.result
    if (status.status === 'failed') throw new Error(status.error || 'Analysis failed')
    onProgress?.(status.stage, status.progress)
  }
  throw new Error('Analysis timed out — check Test History in case it finished after the cutoff.')
}
