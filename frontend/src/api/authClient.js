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
                       config.url?.includes('/auth/reset-password-with-otp') ||
                       config.url?.includes('/auth/refresh');
  if (!isPublicAuth) {
    const token = localStorage.getItem('sanjeevani_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Transparent Token Refresh on 401 ────────────────────────────────────
let _isRefreshing = false;
let _failedQueue = [];

function _processQueue(error, token = null) {
  _failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _failedQueue = [];
}

authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Only attempt refresh on 401 for non-auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem('sanjeevani_refresh_token');
      if (!refreshToken) return Promise.reject(error);

      if (_isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          _failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return authApi(originalRequest);
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token, refresh_token: newRefresh } = res.data;
        localStorage.setItem('sanjeevani_token', access_token);
        if (newRefresh) {
          localStorage.setItem('sanjeevani_refresh_token', newRefresh);
        }
        _processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return authApi(originalRequest);
      } catch (refreshErr) {
        _processQueue(refreshErr, null);
        // Refresh failed — clear session, user must re-login
        localStorage.removeItem('sanjeevani_token');
        localStorage.removeItem('sanjeevani_refresh_token');
        localStorage.removeItem('sanjeevani_user_role');
        return Promise.reject(refreshErr);
      } finally {
        _isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

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
  // Store refresh token if returned
  if (res.data.refresh_token) {
    localStorage.setItem('sanjeevani_refresh_token', res.data.refresh_token);
  }
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


export const registerUser = async (registrationData, ...legacyArgs) => {
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
        name: registrationData,
        phone: legacyArgs[0],
        password: legacyArgs[1],
        role: 'patient',
        village: legacyArgs[2] || '',
      };

  const res = await authApi.post('/auth/register', payload);
  // Store refresh token if returned
  if (res.data.refresh_token) {
    localStorage.setItem('sanjeevani_refresh_token', res.data.refresh_token);
  }
  return res.data;
};

export const fetchCurrentUser = async () => {
  const res = await authApi.get('/auth/me');
  return res.data;
};

export const updateUserProfile = async (profileData) => {
  const res = await authApi.put('/auth/profile', profileData);
  return res.data;
};

export const changeUserPassword = async (oldPassword, newPassword) => {
  const res = await authApi.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return res.data;
};

export const logoutUser = async () => {
  try {
    const res = await authApi.post('/auth/logout');
    return res.data;
  } catch (e) {
    console.debug('Logout audit notification skipped', e);
    return { success: true };
  } finally {
    // Always clear refresh token on logout
    localStorage.removeItem('sanjeevani_refresh_token');
  }
};

// ── Activity Audit Logging Endpoints ────────────────────────────────────

export const fetchMyActivity = async (params = {}) => {
  const res = await authApi.get('/activity/my', { params });
  return res.data;
};

export const fetchAshaActivity = async (params = {}) => {
  const res = await authApi.get('/activity/asha', { params });
  return res.data;
};

export const fetchAdminActivity = async (params = {}) => {
  const res = await authApi.get('/activity/admin', { params });
  return res.data;
};

export const logClientActivity = async (action, description = '', metadata = null) => {
  try {
    const res = await authApi.post('/activity/log', {
      action,
      description,
      metadata,
    });
    return res.data;
  } catch (e) {
    console.debug(`Activity logging failed for ${action}`, e);
    return null;
  }
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

// ── Admin Dynamic System Configuration & Operational Controls ───────────

export const fetchSystemConfig = async () => {
  const res = await authApi.get('/admin/config');
  return res.data;
};

export const updateSystemConfig = async (updates) => {
  const res = await authApi.post('/admin/config', updates);
  return res.data;
};

export const resetSystemConfig = async () => {
  const res = await authApi.post('/admin/config/reset');
  return res.data;
};

export const testLlmLatency = async () => {
  const res = await authApi.post('/admin/actions/test-llm-latency');
  return res.data;
};

export const purgeSystemCache = async () => {
  const res = await authApi.post('/admin/actions/purge-cache');
  return res.data;
};

export const reindexKnowledgeStore = async () => {
  const res = await authApi.post('/admin/actions/reindex-knowledge');
  return res.data;
};

export const updateUserRole = async (userId, role) => {
  const res = await authApi.patch(`/admin/users/${userId}/role`, { role });
  return res.data;
};

export const updateUserDetails = async (userId, data) => {
  const res = await authApi.put(`/admin/users/${userId}`, data);
  return res.data;
};

// ── District CMO Health Advisory Broadcasts ──────────────────────────────

export const fetchCurrentBroadcast = async () => {
  const res = await authApi.get('/admin/broadcast');
  return res.data;
};

export const fetchBroadcastHistory = async () => {
  const res = await authApi.get('/admin/broadcast/history');
  return res.data;
};

export const publishBroadcast = async (data) => {
  const res = await authApi.post('/admin/broadcast', data);
  return res.data;
};

export const deactivateBroadcast = async (broadcastId) => {
  const res = await authApi.delete(`/admin/broadcast/${broadcastId}`);
  return res.data;
};

// ── District Disease Surveillance & Heatmap ──────────────────────────────

export const fetchSurveillanceHeatmap = async (params = {}) => {
  const res = await authApi.get('/admin/surveillance/heatmap', { params });
  return res.data;
};

export const fetchOutbreakAlerts = async (timeframe = 30) => {
  const res = await authApi.get(`/admin/surveillance/outbreaks?timeframe=${timeframe}`);
  return res.data;
};

export const fetchSurveillanceTrends = async (timeframe = 30) => {
  const res = await authApi.get(`/admin/surveillance/trends?timeframe=${timeframe}`);
  return res.data;
};

export const dispatchSurveillanceTeam = async (payload) => {
  const res = await authApi.post('/admin/surveillance/dispatch', payload);
  return res.data;
};

export const broadcastOutbreakAlert = async (payload) => {
  const res = await authApi.post('/admin/surveillance/broadcast-alert', payload);
  return res.data;
};

