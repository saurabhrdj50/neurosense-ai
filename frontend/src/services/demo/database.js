import { DEMO_PATIENTS } from '../demoDataset.js';

const STORAGE_KEYS = {
  VERSION: 'demo_db_version',
  PATIENTS: 'demo_patients_registry',
  SESSIONS: 'demo_analysis_sessions',
  AUTH: 'demo_auth_session',
};

const DB_VERSION = '1.1';

export const DEFAULT_DEMO_USER = {
  authenticated: true,
  user: {
    id: 'DEMO-DOC-01',
    name: 'Dr. Sarah Jenkins, MD',
    email: 's.jenkins@neurosense.ai',
    role: 'doctor',
    department: 'Neurology & Memory Clinic',
    institution: 'Metropolitan Neuro-Health Center',
  },
};

/**
 * Dedicated Demo Mode Database Layer.
 * Manages all demo state in localStorage with in-memory fallback.
 */
class DemoDatabase {
  constructor() {
    this._patients = null;
    this._sessions = null;
    this._auth = null;
    this.init();
  }

  init() {
    try {
      const currentVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
      const existingPatients = localStorage.getItem(STORAGE_KEYS.PATIENTS);

      if (currentVersion !== DB_VERSION || !existingPatients) {
        this.seed();
      } else {
        try {
          this._patients = JSON.parse(existingPatients);
          const existingSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
          this._sessions = existingSessions ? JSON.parse(existingSessions) : [];
          const existingAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
          this._auth = existingAuth ? JSON.parse(existingAuth) : DEFAULT_DEMO_USER;
        } catch {
          this.seed();
        }
      }
    } catch {
      this.seed();
    }
  }

  seed() {
    console.info('[Demo DB] Seeding 30 synthetic demo patients...');

    const patients = DEMO_PATIENTS.map((p) => ({
      patient_id: p.id,
      id: p.id,
      name: p.name,
      age: p.age,
      sex: p.gender,
      gender: p.gender,
      mrn: p.mrn,
      stage: p.stage,
      risk_score: p.riskScore,
      confidence: p.confidence,
      scan_date: p.scanDate,
      attending_physician: p.attendingPhysician,
      education_years: 16,
      mmse: p.mmse,
      mri_metrics: p.mriMetrics,
      shap_features: p.shapFeatures,
      biomarkers: p.biomarkers,
      timeline: p.timeline,
      clinical_insights: p.clinicalInsights,
      created_at: p.scanDate ? new Date(p.scanDate).toISOString() : new Date().toISOString(),
    }));

    const sessions = patients.slice(0, 15).map((p, idx) => ({
      session_id: `SES-${1000 + idx}`,
      patient_id: p.patient_id,
      patient_info: {
        patient_id: p.patient_id,
        name: p.name,
        age: p.age,
        sex: p.sex,
        education_years: p.education_years,
      },
      timestamp: p.created_at,
      created_at: p.created_at,
      results: {
        final_stage: {
          stage: p.stage,
          confidence: p.confidence * 100,
        },
        mri: {
          stage: p.stage,
          confidence: p.confidence * 100,
        },
        risk_profile: {
          overall_risk_score: Math.round(p.risk_score * 100),
          risk_category: p.risk_score > 0.7 ? 'High' : p.risk_score > 0.4 ? 'Moderate' : 'Low',
        },
        cognitive: {
          composite_score: Math.round((p.mmse / 30) * 100),
        },
        sentiment: {
          dominant_emotion: 'neutral',
        },
        mri_features: {
          ventricles_vol: p.mri_metrics?.ventricleSize || 24,
          hippocampus_vol: p.mri_metrics?.hippocampalVolume || 3.5,
        },
      },
    }));

    this._patients = patients;
    this._sessions = sessions;
    this._auth = DEFAULT_DEMO_USER;

    try {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(DEFAULT_DEMO_USER));
      localStorage.setItem(STORAGE_KEYS.VERSION, DB_VERSION);
    } catch (err) {
      console.warn('[Demo DB] LocalStorage setItem failed, using in-memory dataset:', err);
    }
  }

  // ── Patients CRUD ──────────────────────────────────────────────────────────
  getPatients() {
    if (!this._patients) this.init();
    return this._patients || [];
  }

  getPatientById(patientId) {
    const patients = this.getPatients();
    return patients.find((p) => p.patient_id === patientId || p.id === patientId) || null;
  }

  savePatient(patientData) {
    const patients = this.getPatients();
    const newId = patientData.patient_id || `PAT-${String(patients.length + 101).padStart(4, '0')}`;
    const newPatient = {
      ...patientData,
      patient_id: newId,
      id: newId,
      created_at: new Date().toISOString(),
    };
    patients.unshift(newPatient);
    this._patients = patients;
    try {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    } catch {}
    return newPatient;
  }

  updatePatient(patientId, updateData) {
    const patients = this.getPatients();
    const idx = patients.findIndex((p) => p.patient_id === patientId || p.id === patientId);
    if (idx !== -1) {
      patients[idx] = { ...patients[idx], ...updateData };
      this._patients = patients;
      try {
        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
      } catch {}
      return patients[idx];
    }
    return null;
  }

  deletePatient(patientId) {
    const patients = this.getPatients();
    const filtered = patients.filter((p) => p.patient_id !== patientId && p.id !== patientId);
    this._patients = filtered;
    try {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(filtered));
    } catch {}
    return true;
  }

  // ── Sessions CRUD ──────────────────────────────────────────────────────────
  getSessions(patientId = null) {
    if (!this._sessions) this.init();
    const sessions = this._sessions || [];
    if (patientId) {
      return sessions.filter((s) => s.patient_id === patientId);
    }
    return sessions;
  }

  getSessionById(sessionId) {
    const sessions = this.getSessions();
    return sessions.find((s) => s.session_id === sessionId) || null;
  }

  saveSession(sessionData) {
    const sessions = this.getSessions();
    const newSession = {
      session_id: `SES-${Date.now()}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...sessionData,
    };
    sessions.unshift(newSession);
    this._sessions = sessions;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {}
    return newSession;
  }

  // ── Auth Session ───────────────────────────────────────────────────────────
  getAuthSession() {
    if (!this._auth) this.init();
    return this._auth || DEFAULT_DEMO_USER;
  }

  setAuthSession(userSession) {
    this._auth = userSession;
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userSession));
    } catch {}
  }

  clearAuthSession() {
    this._auth = { authenticated: false };
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(this._auth));
    } catch {}
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  resetDemoData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PATIENTS);
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      localStorage.removeItem(STORAGE_KEYS.VERSION);
    } catch {}
    this.seed();
    return true;
  }
}

export const demoDb = new DemoDatabase();
export default demoDb;
