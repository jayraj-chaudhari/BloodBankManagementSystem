import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const normalizeUser = (u) => {
  if (!u) return null;
  const raw = u.data ? u.data : u;
  return {
    ...raw,
    role: raw.role || raw.role_name
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bb_user');
    if (saved) {
      try { return normalizeUser(JSON.parse(saved)); } catch (e) { return null; }
    }
    return null;
  });
  const [token, setToken] = useState(localStorage.getItem('bb_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await authApi.getMe();
          const cleanUser = normalizeUser(res.data || res);
          setUser(cleanUser);
          localStorage.setItem('bb_user', JSON.stringify(cleanUser));
        } catch (err) {
          console.error('Failed to load user session:', err);
          // If token explicitly expired (401), log out
          if (err.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const data = res.data || res;
    const jwtToken = data.token;
    const cleanUser = normalizeUser(data.user);

    localStorage.setItem('bb_token', jwtToken);
    localStorage.setItem('bb_user', JSON.stringify(cleanUser));
    setToken(jwtToken);
    setUser(cleanUser);
    return cleanUser;
  };

  const logout = () => {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
