import { create } from 'zustand';
import { DEFAULT_THEME, applyThemeToDocument, normalizeThemeId, type ThemeId } from '../lib/themes';

export interface ProjectSettings {
  projectName: string;
  logoUrl: string;
  /** Uploaded PNG asset id for CMS admin branding only */
  adminLogoAssetId: string | null;
  /** URL opened when clicking the CMS sidebar logo */
  adminLogoLink: string;
  theme: ThemeId;
}

const STORAGE_KEY = 'cms-project-settings-v5';

const defaults: ProjectSettings = {
  projectName: 'Paytm',
  logoUrl: '/paytm-logo.png',
  adminLogoAssetId: null,
  adminLogoLink: '',
  theme: DEFAULT_THEME,
};

function loadSettings(): ProjectSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem('cms-project-settings-v4');
      if (legacy) {
        const parsed = JSON.parse(legacy) as Partial<ProjectSettings>;
        return { ...defaults, ...parsed, theme: normalizeThemeId(parsed.theme), adminLogoAssetId: parsed.adminLogoAssetId ?? null };
      }
      const older = localStorage.getItem('cms-project-settings-v3');
      if (older) {
        const parsed = JSON.parse(older) as Partial<ProjectSettings>;
        return { ...defaults, ...parsed, theme: normalizeThemeId(parsed.theme), adminLogoAssetId: null };
      }
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<ProjectSettings>;
    return { ...defaults, ...parsed, theme: normalizeThemeId(parsed.theme), adminLogoAssetId: parsed.adminLogoAssetId ?? null };
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

const initialSettings = loadSettings();
applyThemeToDocument(initialSettings.theme);

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initialSettings,
  updateSettings: (partial) => {
    set((state) => {
      const next = { ...state, ...partial };
      saveSettings({
        projectName: next.projectName,
        logoUrl: next.logoUrl,
        adminLogoAssetId: next.adminLogoAssetId,
        adminLogoLink: next.adminLogoLink,
        theme: normalizeThemeId(next.theme),
      });
      if (partial.theme) {
        applyThemeToDocument(normalizeThemeId(next.theme));
      }
      return { ...next, theme: normalizeThemeId(next.theme) };
    });
  },
}));
