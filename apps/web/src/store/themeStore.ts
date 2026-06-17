import { create } from 'zustand';
import { api } from '../config/api';
import { useAuthStore } from './authStore';

export interface CustomPaletteColors {
  background: string;
  card: string;
  border: string;
  primary: string;
}

interface ThemeState {
  theme: 'light' | 'dark';
  darkPalette: 'midnight' | 'charcoal' | 'forest' | 'amethyst' | 'custom';
  customColors: CustomPaletteColors;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => void;
  setDarkPalette: (palette: 'midnight' | 'charcoal' | 'forest' | 'amethyst' | 'custom') => void;
  setCustomColors: (colors: Partial<CustomPaletteColors>) => void;
  initializeTheme: () => void;
}

const applyDarkPalette = (palette: string, customColors?: CustomPaletteColors) => {
  const root = window.document.documentElement;
  
  const presets: Record<string, CustomPaletteColors> = {
    midnight: {
      background: '222 47% 11%',
      card: '222 47% 15%',
      border: '222 30% 22%',
      primary: '250 84% 60%',
    },
    charcoal: {
      background: '224 20% 9%',
      card: '224 20% 13%',
      border: '224 15% 19%',
      primary: '215 90% 55%',
    },
    forest: {
      background: '160 35% 8%',
      card: '160 30% 12%',
      border: '160 20% 18%',
      primary: '142 70% 45%',
    },
    amethyst: {
      background: '270 35% 8%',
      card: '270 30% 12%',
      border: '270 20% 18%',
      primary: '270 85% 60%',
    }
  };

  const colors = palette === 'custom' && customColors ? customColors : presets[palette] || presets.midnight;

  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--popover', colors.card);
  root.style.setProperty('--secondary', colors.card);
  root.style.setProperty('--muted', colors.card);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--input', colors.border);
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--ring', colors.primary);
  root.style.setProperty('--accent', colors.primary);
};

const clearDarkPalette = () => {
  const root = window.document.documentElement;
  root.style.removeProperty('--background');
  root.style.removeProperty('--card');
  root.style.removeProperty('--popover');
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--muted');
  root.style.removeProperty('--border');
  root.style.removeProperty('--input');
  root.style.removeProperty('--primary');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--accent');
};

let syncTimeout: any = null;
const syncThemeToDb = (theme: 'light' | 'dark', darkPalette: string, customColors: CustomPaletteColors) => {
  const { user, accessToken, setAuth } = useAuthStore.getState();
  if (!user) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    try {
      const response = await api.patch('/users/profile', {
        theme,
        darkPalette,
        customColors,
      });
      const updatedUser = response.data.data.user;
      setAuth(updatedUser, accessToken);
    } catch (err) {
      console.error('Failed to sync theme settings to database', err);
    }
  }, 500);
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  darkPalette: 'midnight',
  customColors: {
    background: '222 47% 11%',
    card: '222 47% 15%',
    border: '222 30% 22%',
    primary: '250 84% 60%',
  },
  setTheme: (newTheme) => {
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      applyDarkPalette(get().darkPalette, get().customColors);
    } else {
      root.classList.remove('dark');
      clearDarkPalette();
    }
  },
  setDarkPalette: (palette) => {
    set({ darkPalette: palette });
    localStorage.setItem('darkPalette', palette);
    if (get().theme === 'dark') {
      applyDarkPalette(palette, get().customColors);
    }
    syncThemeToDb(get().theme, palette, get().customColors);
  },
  setCustomColors: (colors) => {
    const updated = { ...get().customColors, ...colors };
    set({ customColors: updated });
    localStorage.setItem('customColors', JSON.stringify(updated));
    if (get().theme === 'dark' && get().darkPalette === 'custom') {
      applyDarkPalette('custom', updated);
    }
    syncThemeToDb(get().theme, get().darkPalette, updated);
  },
  toggleTheme: async () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(nextTheme);

    const { user } = useAuthStore.getState();
    if (user) {
      syncThemeToDb(nextTheme, get().darkPalette, get().customColors);
    } else {
      localStorage.setItem('theme', nextTheme);
    }
  },
  initializeTheme: () => {
    const user = useAuthStore.getState().user;
    
    // Load palette and customColors from user object if logged in, otherwise from localStorage
    const activePalette = (user?.darkPalette || localStorage.getItem('darkPalette') || 'midnight') as any;
    let activeCustomColors = {
      background: '222 47% 11%',
      card: '222 47% 15%',
      border: '222 30% 22%',
      primary: '250 84% 60%',
    };
    
    if (user?.customColors) {
      activeCustomColors = user.customColors;
      localStorage.setItem('customColors', JSON.stringify(activeCustomColors));
    } else {
      const saved = localStorage.getItem('customColors');
      if (saved) {
        try {
          activeCustomColors = JSON.parse(saved);
        } catch (e) {
        }
      }
    }
    
    set({
      darkPalette: activePalette,
      customColors: activeCustomColors,
    });
    localStorage.setItem('darkPalette', activePalette);
    
    const savedTheme = (user?.theme || localStorage.getItem('theme')) as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeTheme = savedTheme || systemTheme;
    get().setTheme(activeTheme);
  },
}));
