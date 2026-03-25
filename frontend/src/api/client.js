/**
 * API client with React Query integration for the NeuroSense API
 */
import { queryClient, queryKeys } from '../providers/QueryProvider';
import { toast } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

export const healthApi = {
  check: () => apiClient.get('/api/health'),
  metrics: (format = 'json') => apiClient.get(`/api/metrics?format=${format}`),
};

export const authApi = {
  login: (credentials) => apiClient.post('/api/auth/login', credentials),
  register: (data) => apiClient.post('/api/auth/register', data),
  logout: () => apiClient.post('/api/auth/logout', {}),
  getCurrentUser: () => apiClient.get('/api/auth/current-user'),
};

export const patientsApi = {
  list: () => apiClient.get('/api/patients'),
  get: (patientId) => apiClient.get(`/api/patients/${patientId}`),
  create: (data) => apiClient.post('/api/patients', data),
  update: (patientId, data) => apiClient.put(`/api/patients/${patientId}`, data),
  delete: (patientId) => apiClient.delete(`/api/patients/${patientId}`),
  history: (patientId) => apiClient.get(`/api/patients/history/${patientId}`),
  export: (patientId, format = 'csv') => apiClient.get(`/api/patients/export/${patientId}?format=${format}`),
};

export const analysisApi = {
  runFullAnalysis: (formData) => apiClient.post('/api/analysis/analyze', formData),
  analyzeMRI: (file, gradcam = true) => {
    const formData = new FormData();
    formData.append('mri_image', file);
    formData.append('gradcam', gradcam);
    return apiClient.post('/api/analysis/mri', formData);
  },
  analyzeSentiment: (text) => apiClient.post('/api/analysis/sentiment', { text }),
  evaluateCognitive: (answers) => apiClient.post('/api/analysis/cognitive', answers),
  assessRisk: (factors) => apiClient.post('/api/analysis/risk', factors),
  analyzeHandwriting: (file = null, canvasData = null) => {
    const formData = new FormData();
    if (file) formData.append('image', file);
    if (canvasData) formData.append('canvas_data', canvasData);
    return apiClient.post('/api/analysis/handwriting', formData);
  },
  analyzeGenomics: (text) => apiClient.post('/api/analysis/genomics', { dna_text: text }),
  transcribeAudio: (file) => {
    const formData = new FormData();
    formData.append('audio', file);
    return apiClient.post('/api/analysis/transcribe', formData);
  },
};

export const utilsApi = {
  chat: (query, patientId, options = {}) => 
    apiClient.post('/api/utils/chat', { query, patient_id: patientId, ...options }),
  musicRecommendation: (stage, emotion = 'neutral') => 
    apiClient.post('/api/utils/music', { stage, emotion }),
  generateReport: (results, patientInfo) => 
    apiClient.post('/api/utils/report', { results, patient_info: patientInfo }),
};

export const enhancedAnalysisApi = {
  analyzeBloodBiomarkers: (results) => 
    apiClient.post('/api/analysis/biomarkers', { results }),
  runNeuropsychological: (data) => 
    apiClient.post('/api/analysis/neuropsychological', data),
  assessMMSE: (data) => 
    apiClient.post('/api/analysis/mmse', data),
  assessMoCA: (data) => 
    apiClient.post('/api/analysis/moca', data),
  assessCDR: (data) => 
    apiClient.post('/api/analysis/cdr', data),
  clinicalDecisionSupport: (data) => 
    apiClient.post('/api/analysis/clinical-decision-support', data),
  treatmentRecommendations: (data) => 
    apiClient.post('/api/analysis/treatment-recommendations', data),
  getPrognosis: (data) => 
    apiClient.post('/api/analysis/prognosis', data),
  findClinicalTrials: (data) => 
    apiClient.post('/api/analysis/clinical-trials', data),
  explainPrediction: (features, methods = ['shap']) => 
    apiClient.post('/api/analysis/explain', { features, methods }),
  generateReport: (analysisResults, patientInfo, format = 'html') => 
    apiClient.post('/api/analysis/report', { analysis_results: analysisResults, patient_info: patientInfo, format }),
  getQualityReport: () => 
    apiClient.get('/api/analysis/quality-report'),
  logFeedback: (predictionIdx, outcome) => 
    apiClient.post('/api/analysis/log-feedback', { prediction_idx: predictionIdx, human_outcome: outcome }),
  runComprehensive: (data) => 
    apiClient.post('/api/analysis/comprehensive', data),
};

export function invalidateQueries(queryKey) {
  queryClient.invalidateQueries({ queryKey });
}

export function setQueryData(queryKey, data) {
  queryClient.setQueryData(queryKey, data);
}

export function clearQueryCache() {
  queryClient.clear();
}
