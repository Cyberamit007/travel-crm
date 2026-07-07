import { create } from 'zustand';
import axios from 'axios';
import { User } from '../types/index.ts';

const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('crm_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('crm_token'),
  isAuthenticated: !!localStorage.getItem('crm_token'),

  login: (user, token) => {
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const token = get().token;
      await axios.post(
        `${apiBase}/auth/logout`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        },
      );
    } catch {
      // best-effort — clear client state regardless
    }
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) =>
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null;
      if (updated) localStorage.setItem('crm_user', JSON.stringify(updated));
      return { user: updated };
    }),
}));
