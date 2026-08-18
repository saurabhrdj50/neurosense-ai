import demoDb, { DEFAULT_DEMO_USER } from './database.js';

export const DEMO_CONFIG = {
  AUTO_LOGIN: false, // Set to false so login screen and normal auth flows work realistically in Demo Mode
};

export const authApi = {
  login: async (username, password) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const role = username === 'admin' ? 'admin' : 'doctor';
    const user = {
      ...DEFAULT_DEMO_USER.user,
      id: role === 'admin' ? 'DEMO-ADMIN-01' : 'DEMO-DOC-01',
      name: username ? (role === 'admin' ? 'Administrator' : `Dr. ${username}`) : DEFAULT_DEMO_USER.user.name,
      role: role,
    };
    const session = {
      success: true,
      authenticated: true,
      role: role,
      user: user,
    };
    demoDb.setAuthSession(session);
    return session;
  },

  register: async (payload) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const session = {
      success: true,
      authenticated: true,
      role: 'doctor',
      user: {
        id: `DEMO-DOC-${Date.now()}`,
        name: payload.full_name || payload.username || 'Demo Clinician',
        email: payload.email || 'demo@neurosense.ai',
        role: 'doctor',
        department: payload.department || 'Neurology',
        institution: payload.institution || 'Metropolitan Neuro-Health Center',
      },
    };
    demoDb.setAuthSession(session);
    return session;
  },

  forgotPassword: async (email, date_of_birth) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      success: true,
      reset_token: `demo-reset-token-${Date.now()}`,
      message: `Identity verified for ${email}`,
    };
  },

  resetPassword: async (token, new_password) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      success: true,
      message: 'Password reset successfully (Demo Mode)',
    };
  },

  logout: async () => {
    demoDb.clearAuthSession();
    return { success: true };
  },

  getCurrentUser: async () => {
    if (DEMO_CONFIG.AUTO_LOGIN) {
      return { success: true, ...DEFAULT_DEMO_USER };
    }
    const session = demoDb.getAuthSession();
    return { success: true, ...session };
  },
};

export default authApi;
