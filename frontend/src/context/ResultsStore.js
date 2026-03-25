// Global results store — passed via React Router location.state
// or via this simple module-level store for cross-page results
let _results = null

export function setAnalysisResults(r) { _results = r }
export function getAnalysisResults()  { return _results }
