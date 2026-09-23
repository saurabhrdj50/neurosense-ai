import demoDb from './database';

export const historyApi = {
  getPatientHistory: async (patientId, limit = 20) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const history = demoDb.getSessions(patientId).slice(0, limit);
    return {
      patient_id: patientId,
      history,
      total_sessions: history.length,
    };
  },

  getSessionDetail: async (sessionId) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const session = demoDb.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  },

  getAllAnalyses: async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { analyses: demoDb.getSessions() };
  },

  exportPatient: async (patientId) => {
    const history = demoDb.getSessions(patientId);
    const csvContent = [
      'Session ID,Timestamp,Stage,Confidence,Risk Category',
      ...history.map((s) => `"${s.session_id}","${s.timestamp}","${s.results?.final_stage?.stage || 'MCI'}",${s.results?.final_stage?.confidence || 90},"${s.results?.risk_profile?.risk_category || 'Moderate'}"`)
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  },

  exportPatientHistory: (patientId) => {
    const history = demoDb.getSessions(patientId);
    const csvContent = [
      'Session ID,Timestamp,Stage,Confidence,Risk Category',
      ...history.map((s) => `"${s.session_id}","${s.timestamp}","${s.results?.final_stage?.stage || 'MCI'}",${s.results?.final_stage?.confidence || 90},"${s.results?.risk_profile?.risk_category || 'Moderate'}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurosense_history_${patientId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
