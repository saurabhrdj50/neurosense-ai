import { useState } from 'react'
import toast from 'react-hot-toast'
import { analysisApi } from '../api/analysisApi'
import { setAnalysisResults } from '../../context/ResultsStore'

export const useAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  const runFullAnalysis = async (formData) => {
    setAnalyzing(true)
    setError(null)
    try {
      const data = await analysisApi.runFullAnalysis(formData)
      setAnalysisResults(data)
      return { success: true, data }
    } catch (err) {
      const message = err.message || 'Analysis failed'
      setError(message)
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setAnalyzing(false)
    }
  }

  return { runFullAnalysis, analyzing, error }
}
