import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: number | null;
  user: any | null;
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => {
        set({ token: null, user: null });
        localStorage.removeItem('auth-storage'); // Очищаем хранилище
      },
    }),
    {
      name: 'auth-storage', // Ключ в localStorage
      partialize: (state) => ({ token: state.token, user: state.user }), // Что сохранять
    }
  )
);