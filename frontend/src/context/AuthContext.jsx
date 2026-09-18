import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, fetchCurrentUser } from '../api/authClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sanjeevani_token'));
  const [loading, setLoading] = useState(true);

  // On mount: if token exists, fetch user profile
  useEffect(() => {
    // If we already have the user object in memory (e.g. freshly set by login/register),
    // skip redundant revalidation to prevent race conditions during heavy backend load
    if (user) {
      setLoading(false);
      return;
    }

    if (token) {
      fetchCurrentUser()
        .then((profile) => setUser(profile))
        .catch((err) => {
          // Only clear the session on an actual 401 (truly invalid/expired token),
          // never on temporary network drops or backend 5xx/timeout errors
          if (err?.response?.status === 401) {
            localStorage.removeItem('sanjeevani_token');
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, user]);

  const login = useCallback(async (identifier, password) => {
    const data = await loginUser(identifier, password);
    localStorage.setItem('sanjeevani_token', data.access_token);
    setUser(data.user);
    setToken(data.access_token);
    return data.user;
  }, []);

  const register = useCallback(async (registrationData, maybePhone, maybePassword, maybeVillage) => {
    // Support either single object { name, phone, password, username, email, village } or legacy args
    let payload = registrationData;
    if (typeof registrationData === 'string') {
      payload = {
        name: registrationData,
        phone: maybePhone,
        password: maybePassword,
        village: maybeVillage || '',
      };
    }
    const data = await registerUser(payload);
    localStorage.setItem('sanjeevani_token', data.access_token);
    setUser(data.user);
    setToken(data.access_token);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sanjeevani_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAsha: user?.role === 'asha',
    isPatient: user?.role === 'patient',
    isMitra: user?.role === 'patient',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
