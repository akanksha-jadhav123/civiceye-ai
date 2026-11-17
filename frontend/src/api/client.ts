import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civiceye_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('civiceye_token');
      localStorage.removeItem('civiceye_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export type Role = 'CITIZEN' | 'ADMIN' | 'DEPT_MANAGER' | 'WORKER';

export interface User {
  id: number;
  email: string;
  role: Role;
  full_name: string;
  org_id: number | null;
  phone?: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function apiRegister(payload: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post('/auth/register', payload);
  return data.data;
}

export async function apiLogin(payload: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', payload);
  return data.data;
}

export async function apiMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}