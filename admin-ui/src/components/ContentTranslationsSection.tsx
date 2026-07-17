import Icon from './Icon';
import TranslationsField from './fields/TranslationsField';
import type { FieldMeta, TranslationsConfig } from '../lib/api';

interface ContentTranslationsSectionProps {
  translationsField: FieldMeta;
  config: TranslationsConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export default function ContentTranslationsSection({
  translationsField,
  config,
  value,
  onChange,
  disabled,
}: ContentTranslationsSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
      <div className="border-b border-slate-100 bg-gradient-to-br from-brand-50/90 via-white to-slate-50 px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm shadow-brand-600/20">
            <Icon name="translate" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">Translations</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Localize content across{' '}
              <span className="font-medium text-slate-800">
                {config.enabled_languages.length} language
                {config.enabled_languages.length === 1 ? '' : 's'}
              </span>
              . Fields below are hidden from the main form.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {config.translatable_fields.map((fieldName) => (
            <span
              key={fieldName}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {fieldName.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <TranslationsField
          field={translationsField}
          value={value}
          onChange={onChange}
          disabled={disabled}
          showHeader={false}
        />
      </div>
    </section>
  );
}
