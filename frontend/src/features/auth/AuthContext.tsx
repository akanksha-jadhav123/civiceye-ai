import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiLogin, apiRegister, apiMe, User } from '../../api/client';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (p: { email: string; password: string; full_name: string }) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('civiceye_token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiMe()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem('civiceye_token');
        localStorage.removeItem('civiceye_user');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user, token } = await apiLogin({ email, password });
    localStorage.setItem('civiceye_token', token);
    localStorage.setItem('civiceye_user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  async function register(p: { email: string; password: string; full_name: string }) {
    const { user, token } = await apiRegister(p);
    localStorage.setItem('civiceye_token', token);
    localStorage.setItem('civiceye_user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('civiceye_token');
    localStorage.removeItem('civiceye_user');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}