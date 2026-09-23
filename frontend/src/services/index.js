import realServices from './real';
import demoServices from './demo';

// Enable Demo Mode only if VITE_DEMO_MODE is explicitly set to 'true'
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const activeServices = isDemoMode ? demoServices : realServices;

export const authApi = activeServices.authApi;
export const patientsApi = activeServices.patientsApi;
export const analysisApi = activeServices.analysisApi;
export const historyApi = activeServices.historyApi;
export const resultsApi = activeServices.resultsApi;
export const adminApi = activeServices.adminApi;

export default {
  isDemoMode,
  authApi,
  patientsApi,
  analysisApi,
  historyApi,
  resultsApi,
  adminApi,
};
