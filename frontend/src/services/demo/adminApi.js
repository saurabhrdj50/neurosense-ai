import { demoDb } from './database';

export const adminApi = {
  getDashboard: async () => {
    const patients = demoDb.getPatients();
    const analyses = demoDb.getAnalyses();
    const stageDist = {};
    analyses.forEach(a => {
      const s = a.stage || a.final_stage || 'Normal';
      stageDist[s] = (stageDist[s] || 0) + 1;
    });
    return {
      total_users: 5,
      total_doctors: 3,
      total_patients: patients.length,
      total_analyses: analyses.length,
      stage_distribution: stageDist
    };
  },
  getDoctors: async () => {
    return {
      doctors: [
        { id: 1, full_name: 'Dr. Sarah Jenkins', username: 'sjenkins', email: 's.jenkins@neurosense.org', role: 'Doctor', institution: 'Johns Hopkins Hospital', department: 'Neurology & Memory Care', patient_count: 12 },
        { id: 2, full_name: 'Dr. Marcus Vance', username: 'mvance', email: 'm.vance@neurosense.org', role: 'Doctor', institution: 'Mayo Clinic Neurology', department: 'Cognitive Neuroscience', patient_count: 10 },
        { id: 3, full_name: 'Dr. Elena Rostova', username: 'erostova', email: 'e.rostova@neurosense.org', role: 'Clinician', institution: 'Massachusetts General Hospital', department: 'Neurogenetics Unit', patient_count: 8 },
      ]
    };
  },
  getPatients: async () => {
    return { patients: demoDb.getPatients() };
  },
  getDoctorPatients: async (doctorId) => {
    const all = demoDb.getPatients();
    return { patients: all.slice(0, 10) };
  },
  getSessions: async () => {
    return { sessions: demoDb.getAnalyses() };
  },
  getAuditLog: async () => {
    return {
      logs: [
        { id: 1, timestamp: new Date(Date.now() - 3600000).toISOString(), actor_username: 'demo_admin', action: 'PATIENT_EXPORT', resource_name: 'Dataset Export', resource_type: 'EXPORT', resource_id: 'ALL' },
        { id: 2, timestamp: new Date(Date.now() - 86400000).toISOString(), actor_username: 'demo_admin', action: 'SESSION_DELETE', resource_name: 'Session #1042', resource_type: 'SESSION', resource_id: '1042' },
        { id: 3, timestamp: new Date(Date.now() - 172800000).toISOString(), actor_username: 'demo_admin', action: 'DOCTOR_UPDATE', resource_name: 'Dr. Sarah Jenkins', resource_type: 'USER', resource_id: '1' },
      ]
    };
  },
  getHealth: async () => {
    return {
      status: 'healthy',
      models: {
        'MRI Classification Model': { loaded: true },
        'Multimodal Fusion Transformer': { loaded: true }
      },
      services: { database: 'Connected (Demo Store)' }
    };
  },
  deleteDoctor: async (id) => {
    return { success: true, message: 'Doctor deleted (Demo Mode)' };
  },
  deletePatient: async (id) => {
    demoDb.deletePatient(id);
    return { success: true, message: 'Patient deleted (Demo Mode)' };
  },
  deleteSession: async (id) => {
    demoDb.deleteAnalysis(id);
    return { success: true, message: 'Session deleted (Demo Mode)' };
  },
};
