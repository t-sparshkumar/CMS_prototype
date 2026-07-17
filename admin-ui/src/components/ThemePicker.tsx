import { useSettingsStore } from '../stores/settingsStore';
import { THEMES, type ThemeId } from '../lib/themes';
import Icon from './Icon';

export default function ThemePicker() {
  const theme = useSettingsStore((s) => s.theme);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  function selectTheme(id: ThemeId) {
    updateSettings({ theme: id });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {THEMES.map((t) => {
        const selected = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTheme(t.id)}
            className={`group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
              selected
                ? 'border-[var(--app-accent)] bg-[var(--app-accent-light)] ring-2 ring-[var(--app-accent)] ring-offset-2'
                : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-border-strong)] hover:shadow-card'
            }`}
          >
            <div
              className="flex h-12 w-12 shrink-0 flex-col overflow-hidden rounded-lg border shadow-sm"
              style={{ borderColor: t.preview.surface }}
            >
              <div className="h-3" style={{ background: t.preview.accent }} />
              <div className="flex flex-1">
                <div className="w-1/3" style={{ background: t.preview.bg }} />
                <div className="flex flex-1 flex-col">
                  <div className="flex-1" style={{ background: t.preview.surface }} />
                  <div className="h-2" style={{ background: t.preview.text, opacity: 0.3 }} />
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--app-text)]">{t.label}</span>
                {selected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--app-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    <Icon name="check" className="h-3 w-3" />
                    Active
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--app-text-muted)]">{t.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
