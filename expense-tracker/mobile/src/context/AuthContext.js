import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi';
import { registerOnUnauthorized } from '../api/client';
import { clearToken, getToken, saveToken } from '../services/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState(null);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    registerOnUnauthorized(async () => {
      await clearToken();
      if (active) setUser(null);
    });

    async function initialize() {
      try {
        const token = await getToken();
        if (token) {
          try {
            const response = await authApi.me();
            if (active) setUser(response.user);
          } catch (error) {
            if (error.status !== 401) throw error;
          }
        }
      } catch (error) {
        if (active) setInitializationError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
      registerOnUnauthorized(null);
    };
  }, []);

  const completeSignIn = useCallback(async (response) => {
    await saveToken(response.token);
    setInitializationError(null);
    setUser(response.user);
    return response;
  }, []);

  const login = useCallback(async (credentials) => {
    return completeSignIn(await authApi.login(credentials));
  }, [completeSignIn]);

  const register = useCallback(async (details) => {
    return completeSignIn(await authApi.register(details));
  }, [completeSignIn]);

  const googleLogin = useCallback(async (idToken) => {
    return completeSignIn(await authApi.googleLogin(idToken));
  }, [completeSignIn]);

  const value = useMemo(() => ({
    user,
    loading,
    initializationError,
    login,
    register,
    googleLogin,
    logout,
  }), [user, loading, initializationError, login, register, googleLogin, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
