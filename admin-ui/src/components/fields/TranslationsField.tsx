import { FieldLabel } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface TranslationsFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

const DEMO_LOCALES = [
  { code: 'en-US', label: 'English' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
];

export default function TranslationsField({ field, value, onChange, disabled }: TranslationsFieldProps) {
  const translations =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, Record<string, unknown>>)
      : {};

  return (
    <div>
      <FieldLabel field={field} />
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3 mb-4 text-xs text-brand-800">
        Translations are managed via the collection Setup tab. Each locale creates a related translation item.
      </div>
      <div className="space-y-4">
        {DEMO_LOCALES.map((locale) => {
          const localeData = translations[locale.code] ?? {};
          return (
            <div key={locale.code} className="field-repeater-row">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {locale.label} ({locale.code})
              </p>
              <input
                type="text"
                value={String(localeData.title ?? '')}
                disabled={disabled}
                placeholder={`Title in ${locale.label}`}
                onChange={(e) =>
                  onChange({
                    ...translations,
                    [locale.code]: { ...localeData, title: e.target.value },
                  })
                }
                className="input text-sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
