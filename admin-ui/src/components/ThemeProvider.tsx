import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { applyThemeToDocument } from '../lib/themes';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return <>{children}</>;
}
