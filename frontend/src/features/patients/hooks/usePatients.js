import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { patientsApi } from '../api/patientsApi';

export const usePatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await patientsApi.getAll();
      
      if (response.success === false) {
        throw new Error(response.error || 'Failed to load patients');
      }
      
      setPatients(response.patients || []);
      setError(null);
    } catch (err) {
      const errorMessage = err.message || 'Failed to load patients';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const createPatient = useCallback(async (data) => {
    try {
      const result = await patientsApi.create(data);
      
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to create patient');
      }
      
      await loadPatients();
      toast.success('Patient created successfully');
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to create patient';
      toast.error(errorMessage);
      throw err;
    }
  }, [loadPatients]);

  const updatePatient = useCallback(async (patientId, data) => {
    try {
      const result = await patientsApi.update(patientId, data);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update patient');
      }
      
      await loadPatients();
      toast.success('Patient updated successfully');
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to update patient';
      toast.error(errorMessage);
      throw err;
    }
  }, [loadPatients]);

  const deletePatient = useCallback(async (patientId) => {
    try {
      const result = await patientsApi.delete(patientId);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete patient');
      }
      
      await loadPatients();
      toast.success('Patient deleted successfully');
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete patient';
      toast.error(errorMessage);
      throw err;
    }
  }, [loadPatients]);

  const getPatient = useCallback(async (patientId) => {
    try {
      const result = await patientsApi.get(patientId);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to load patient details';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  return {
    patients,
    loading,
    error,
    loadPatients,
    createPatient,
    updatePatient,
    deletePatient,
    getPatient,
  };
};
