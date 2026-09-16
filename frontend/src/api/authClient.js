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
                       config.url?.includes('/auth/reset-password');
  if (!isPublicAuth) {
    const token = localStorage.getItem('sanjeevani_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Auth Endpoints ──────────────────────────────────────────────────────

export const loginUser = async (phone, password) => {
  const res = await authApi.post('/auth/login', { phone, password });
  return res.data;
};

export const resetPassword = async (phone, newPassword) => {
  const res = await authApi.post('/auth/reset-password', { phone, new_password: newPassword });
  return res.data;
};


export const registerUser = async (name, phone, password, village = '') => {
  const res = await authApi.post('/auth/register', {
    name, phone, password, role: 'patient', village,
  });
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
