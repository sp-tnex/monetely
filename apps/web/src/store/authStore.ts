import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  gravatarEmail?: string;
  theme?: 'light' | 'dark';
  darkPalette?: 'midnight' | 'charcoal' | 'forest' | 'amethyst' | 'custom';
  customColors?: {
    background: string;
    card: string;
    border: string;
    primary: string;
  };
  defaultCurrency?: string;
  timezone?: string;
  language?: string;
  notificationPreferences?: {
    push: boolean;
    system: boolean;
  };
  webhook?: {
    url: string;
    enabled: boolean;
    secret: string;
  };
  upiId?: string;
  upiName?: string;
  upiVisibility?: 'Visible To Everyone' | 'Visible To Group Members' | 'Visible Only During Settlement' | 'Hidden';
  upiInstructions?: string;
  upiQrUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  setAuth: (user: User | null, accessToken: string | null, refreshToken?: string | null) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('monetely_logged_in', 'true');
    if (refreshToken) {
      localStorage.setItem('monetely_refresh_token', refreshToken);
    }
    set({ user, accessToken, isInitialized: true });
  },
  clearAuth: () => {
    localStorage.removeItem('monetely_logged_in');
    localStorage.removeItem('monetely_refresh_token');
    set({ user: null, accessToken: null, isInitialized: true });
  },
  initializeAuth: async () => {
    const wasLoggedIn = localStorage.getItem('monetely_logged_in') === 'true';
    const storedRefreshToken = localStorage.getItem('monetely_refresh_token');
    
    if (!wasLoggedIn) {
      set({ user: null, accessToken: null, isInitialized: true });
      
      try {
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { 
            headers: { 'x-refresh-token': storedRefreshToken || '' },
            withCredentials: true 
          }
        );
        const { user, accessToken, refreshToken } = response.data.data;
        localStorage.setItem('monetely_logged_in', 'true');
        if (refreshToken) {
          localStorage.setItem('monetely_refresh_token', refreshToken);
        }
        set({ user, accessToken, isInitialized: true });
      } catch (error) {
      }
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken: storedRefreshToken },
        { 
          headers: { 'x-refresh-token': storedRefreshToken || '' },
          withCredentials: true 
        }
      );
      const { user, accessToken, refreshToken } = response.data.data;
      localStorage.setItem('monetely_logged_in', 'true');
      if (refreshToken) {
        localStorage.setItem('monetely_refresh_token', refreshToken);
      }
      set({ user, accessToken, isInitialized: true });
    } catch (error) {
      localStorage.removeItem('monetely_logged_in');
      localStorage.removeItem('monetely_refresh_token');
      set({ user: null, accessToken: null, isInitialized: true });
    }
  },
}));
