/**
 * Centralized API Configuration
 * Uses environment variables for local development and production
 */

const API_URL = import.meta.env.VITE_API_URL || '';

export default API_URL;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    CURRENT_USER: '/api/auth/current-user',
  },
  PATIENTS: {
    LIST: '/api/patients',
    GET: (id) => `/api/patients/${id}`,
    CREATE: '/api/patients',
    UPDATE: (id) => `/api/patients/${id}`,
    DELETE: (id) => `/api/patients/${id}`,
    HISTORY: (id) => `/api/patients/history/${id}`,
    EXPORT: (id) => `/api/patients/export/${id}`,
  },
  ANALYSIS: {
    FULL: '/api/analysis/analyze',
    MRI: '/api/analysis/mri',
    SENTIMENT: '/api/analysis/sentiment',
    COGNITIVE: '/api/analysis/cognitive',
    RISK: '/api/analysis/risk',
    HANDWRITING: '/api/analysis/handwriting',
    GENOMICS: '/api/analysis/genomics',
    TRANSCRIBE: '/api/analysis/transcribe',
    REPORT_PDF: '/api/analysis/report/pdf',
    EXPLAIN: '/api/analysis/explain',
    REPORT: '/api/analysis/report',
  },
  UTILS: {
    CHAT: '/api/utils/chat',
    MUSIC: '/api/utils/music',
    REPORT: '/api/utils/report',
  },
  HEALTH: {
    CHECK: '/api/health',
    METRICS: '/api/metrics',
  },
}
