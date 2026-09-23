import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const authApi = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach token to every request if available, but skip public auth endpoints
authApi.interceptors.request.use((config) => {
  const isPublicAuth = config.url?.includes('/auth/login') ||
                       config.url?.includes('/auth/register') ||
                       config.url?.includes('/auth/check-username') ||
                       config.url?.includes('/auth/otp') ||
                       config.url?.includes('/auth/reset-password-with-otp');
  if (!isPublicAuth) {
    const token = localStorage.getItem('sanjeevani_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Auth Endpoints ──────────────────────────────────────────────────────

export const checkUsernameAvailability = async (username, name = '') => {
  const res = await authApi.get('/auth/check-username', {
    params: { username, name },
  });
  return res.data;
};

export const sendOtp = async (target, purpose = 'register') => {
  const res = await authApi.post('/auth/otp/send', { target, purpose });
  return res.data;
};

export const verifyOtp = async (target, otp, purpose = 'register') => {
  const res = await authApi.post('/auth/otp/verify', { target, otp, purpose });
  return res.data;
};

export const resetPasswordWithOtp = async (target, otp, newPassword) => {
  const res = await authApi.post('/auth/reset-password-with-otp', {
    target,
    otp,
    new_password: newPassword,
  });
  return res.data;
};

export const loginUser = async (identifier, password) => {
  const res = await authApi.post('/auth/login', {
    identifier,
    phone: identifier,
    password,
  });
  return res.data;
};

export const resetPassword = async (identifier, newPassword) => {
  const res = await authApi.post('/auth/reset-password', {
    identifier,
    phone: identifier,
    new_password: newPassword,
  });
  return res.data;
};


export const registerUser = async (registrationData) => {
  // Support both object argument or legacy positional arguments
  const payload = typeof registrationData === 'object' && !Array.isArray(registrationData)
    ? {
        name: registrationData.name,
        phone: registrationData.phone,
        password: registrationData.password,
        username: registrationData.username || '',
        email: registrationData.email || '',
        role: 'patient',
        village: registrationData.village || '',
      }
    : {
        name: arguments[0],
        phone: arguments[1],
        password: arguments[2],
        role: 'patient',
        village: arguments[3] || '',
      };

  const res = await authApi.post('/auth/register', payload);
  return res.data;
};

export const fetchCurrentUser = async () => {
  const res = await authApi.get('/auth/me');
  return res.data;
};

// ── Admin Endpoints ─────────────────────────────────────────────────────

export const fetchAllUsers = async () => {
  const res = await authApi.get('/admin/users');
  return res.data;
};

export const createUser = async (data) => {
  const res = await authApi.post('/admin/users', data);
  return res.data;
};

export const deleteUser = async (userId) => {
  const res = await authApi.delete(`/admin/users/${userId}`);
  return res.data;
};

export const fetchAdminStats = async () => {
  const res = await authApi.get('/admin/stats');
  return res.data;
};

export const fetchAnalyticsSummary = async (days = 30) => {
  const res = await authApi.get(`/admin/analytics/summary?days=${days}`);
  return res.data;
};
