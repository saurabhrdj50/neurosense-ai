import { analysisApi } from './api/analysisApi'
import { setAnalysisResults } from '../../context/ResultsStore'

export const useAnalysis = () => {
  const runFullAnalysis = async (formData) => {
    const data = await analysisApi.runFullAnalysis(formData)
    setAnalysisResults(data)
    return data
  }

  return { runFullAnalysis }
}
