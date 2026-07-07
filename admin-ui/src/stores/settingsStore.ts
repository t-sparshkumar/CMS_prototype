import { create } from 'zustand';

export interface ProjectSettings {
  projectName: string;
  logoUrl: string;
  defaultLanguage: string;
  timezone: string;
}

const STORAGE_KEY = 'cms-project-settings-v3';

const defaults: ProjectSettings = {
  projectName: 'Paytm',
  logoUrl: '/paytm-logo.png',
  defaultLanguage: 'en',
  timezone: 'UTC',
};

function loadSettings(): ProjectSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    return { ...defaults, ...(JSON.parse(raw) as Partial<ProjectSettings>) };
  } catch {
    return defaults;
  }
}

function saveSettings(settings: ProjectSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface SettingsState extends ProjectSettings {
  updateSettings: (partial: Partial<ProjectSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadSettings(),
  updateSettings: (partial) => {
    set((state) => {
      const next = { ...state, ...partial };
      saveSettings({
        projectName: next.projectName,
        logoUrl: next.logoUrl,
        defaultLanguage: next.defaultLanguage,
        timezone: next.timezone,
      });
      return next;
    });
  },
}));
