import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { patientsApi } from '../api/patientsApi'

export const usePatients = () => {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadPatients = async () => {
    setLoading(true)
    try {
      const data = await patientsApi.getAll()
      setPatients(data.patients || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPatients() }, [])

  const createPatient = async (data) => {
    const result = await patientsApi.create(data)
    if (result.success) {
      await loadPatients()
    }
    return result
  }

  const deletePatient = async (patientId) => {
    const result = await patientsApi.delete(patientId)
    if (result.success) {
      await loadPatients()
    }
    return result
  }

  return {
    patients,
    loading,
    error,
    loadPatients,
    createPatient,
    deletePatient,
  }
}
