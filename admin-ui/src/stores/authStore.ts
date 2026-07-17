import { create } from 'zustand';
import { fetchCurrentUser, loginRequest, logoutRequest, refreshSession, type UserProfile } from '../lib/api';

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  bootstrapAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isLoading: false,
  isBootstrapping: true,
  isAuthenticated: false,

  setAccessToken: (token) => {
    set({ accessToken: token, isAuthenticated: Boolean(token) });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await loginRequest(email, password);
      set({ accessToken: result.access_token, isAuthenticated: true });
      const user = await fetchCurrentUser();
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      // Clear local state even if server logout fails
    }
    set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    const { accessToken } = get();
    if (!accessToken) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await fetchCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  bootstrapAuth: async () => {
    set({ isBootstrapping: true });
    try {
      const result = await refreshSession();
      if (!result) {
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isBootstrapping: false,
        });
        return;
      }

      set({ accessToken: result.access_token, isAuthenticated: true });
      const user = await fetchCurrentUser();
      set({ user, isBootstrapping: false });
    } catch {
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
        isBootstrapping: false,
      });
    }
  },
}));
