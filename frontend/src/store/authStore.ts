import { create } from 'zustand';
import { User } from '../types/index.ts';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
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

  logout: () => {
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
