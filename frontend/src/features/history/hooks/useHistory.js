import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { historyApi } from '../api/historyApi'

export const useHistory = (patientId) => {
  const [history, setHistory] = useState([])
  const [trends, setTrends] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadHistory = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const data = await historyApi.getPatientHistory(patientId)
      setHistory(data.history || [])
      setTrends(data.trends || {})
      setError(null)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHistory() }, [patientId])

  return { history, trends, loading, error, loadHistory }
}
