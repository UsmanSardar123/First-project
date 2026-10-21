import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../api/client';
import { clearSession, getSession, saveSession } from '../services/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession()
      .then((savedSession) => { if (mounted) setSession(savedSession); })
      .catch(() => { if (mounted) setSession(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async (authResponse) => {
    await saveSession(authResponse);
    setSession(authResponse);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ session, loading, signIn, signOut }), [session, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
