import React, { createContext, useContext, useEffect, useState } from 'react';
import * as auth from '../lib/auth';

interface Ctx {
  user: string | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<auth.AuthResult>;
  register: (u: string, p: string) => Promise<auth.AuthResult>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<Ctx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.getCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const doLogin = async (u: string, p: string) => {
    const r = await auth.login(u, p);
    if (r.ok) setUser(u.trim());
    return r;
  };

  const doRegister = async (u: string, p: string) => {
    const r = await auth.register(u, p);
    if (r.ok) setUser(u.trim());
    return r;
  };

  const doLogout = async () => {
    await auth.logout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login: doLogin, register: doRegister, logout: doLogout }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = (): Ctx => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return c;
};
