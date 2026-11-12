import { create } from 'zustand';

export interface AuthUser {
  user_id: string;
  role: string;
  name: string;
  phone: string;
  timezone: string;
}

interface AuthState {
  access: string | null;
  user: AuthUser | null;
  setAccess: (access: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  access: null,
  user: null,
  setAccess: (access) => set({ access }),
  setUser: (user) => set({ user }),
  logout: () => set({ access: null, user: null }),
}));
