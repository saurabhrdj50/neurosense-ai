// Global results store — passed via React Router location.state
// or via this simple module-level store for cross-page results
let _results = null

const STORAGE_KEY = 'neurosense_latest_analysis_results'

export function setAnalysisResults(r) {
  _results = r
  try {
    if (r) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(r))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch (err) {
    console.warn('Failed to save analysis results to sessionStorage:', err)
  }
}

export function getAnalysisResults() {
  if (_results) return _results
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY)
    if (cached) {
      _results = JSON.parse(cached)
      return _results
    }
  } catch (err) {
    console.warn('Failed to read analysis results from sessionStorage:', err)
  }
  return null
}

