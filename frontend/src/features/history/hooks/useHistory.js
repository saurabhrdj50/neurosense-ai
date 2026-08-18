import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { historyApi } from '../api/historyApi';

export const useHistory = (patientId) => {
  const [history, setHistory] = useState([]);
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!patientId) {
      setHistory([]);
      setTrends({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await historyApi.getPatientHistory(patientId);

      if (response.error) {
        throw new Error(response.error);
      }

      setHistory(response.history || []);
      setTrends(response.trends || {});
      setError(null);
    } catch (err) {
      const errorMessage = err.message || 'Failed to load history';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getSessionDetail = useCallback(async (sessionId) => {
    try {
      const result = await historyApi.getSessionDetail(sessionId);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to load session details';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const exportPatientData = useCallback(async (patientId, format = 'csv') => {
    try {
      const blob = await historyApi.exportPatient(patientId, format);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient_${patientId}_history.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Data exported successfully');
    } catch (err) {
      const errorMessage = err.message || 'Failed to export data';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  return {
    history,
    trends,
    loading,
    error,
    loadHistory,
    getSessionDetail,
    exportPatientData,
  };
};
