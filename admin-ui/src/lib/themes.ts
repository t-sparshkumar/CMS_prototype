export type ThemeId = 'light' | 'dark' | 'midnight' | 'ocean' | 'sunset';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  preview: {
    bg: string;
    surface: string;
    accent: string;
    text: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Clean white surfaces with blue accents',
    preview: { bg: '#f1f5f9', surface: '#ffffff', accent: '#2563eb', text: '#1e293b' },
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Comfortable dark mode for low-light environments',
    preview: { bg: '#0f172a', surface: '#1e293b', accent: '#60a5fa', text: '#f1f5f9' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep blue-black with cool violet highlights',
    preview: { bg: '#0a0f1a', surface: '#111827', accent: '#818cf8', text: '#e2e8f0' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Soft sky-blue tones for a calm workspace',
    preview: { bg: '#e8f4fc', surface: '#ffffff', accent: '#0891b2', text: '#0c4a6e' },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Warm cream and amber tones',
    preview: { bg: '#fef7ed', surface: '#fffbeb', accent: '#ea580c', text: '#431407' },
  },
];

export const DEFAULT_THEME: ThemeId = 'ocean';

export function getTheme(id: string | undefined): ThemeDefinition {
  const found = THEMES.find((t) => t.id === id);
  if (found) return found;
  return THEMES.find((t) => t.id === DEFAULT_THEME) ?? THEMES[0]!;
}

export function normalizeThemeId(id: string | undefined): ThemeId {
  return getTheme(id === 'liberty' ? 'light' : id).id;
}

export function applyThemeToDocument(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;
  const resolved = getTheme(normalizeThemeId(themeId));
  document.documentElement.setAttribute('data-theme', resolved.id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved.preview.bg);
  }
}
