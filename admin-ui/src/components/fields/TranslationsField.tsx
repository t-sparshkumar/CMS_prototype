import { useEffect, useMemo, useState } from 'react';
import InterfaceRenderer from '../InterfaceRenderer';
import { FieldLabel } from './fieldShared';
import { fetchFields, fetchItems, type FieldMeta, type ItemRecord } from '../../lib/api';

interface TranslationsFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  showHeader?: boolean;
}

type TranslationsMap = Record<string, Record<string, unknown>>;

function parseOptions(field: FieldMeta) {
  const raw = field.options;
  if (!raw || typeof raw !== 'object') {
    return {} as Record<string, unknown>;
  }
  return raw as Record<string, unknown>;
}

export default function TranslationsField({
  field,
  value,
  onChange,
  disabled,
  showHeader = true,
}: TranslationsFieldProps) {
  const options = parseOptions(field);
  const parentCollection = String(options.parent_collection ?? '');
  const translatableFieldNames = (options.translatable_fields as string[] | undefined) ?? [];
  const enabledLanguages = (options.enabled_languages as string[] | undefined) ?? [];
  const languagesCollection = String(options.languages_collection ?? 'languages');
  const languagesField = String(options.languages_field ?? 'key');

  const [languageRows, setLanguageRows] = useState<ItemRecord[]>([]);
  const [parentFields, setParentFields] = useState<FieldMeta[]>([]);
  const [activeLanguage, setActiveLanguage] = useState('');

  const translations: TranslationsMap =
    typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as TranslationsMap) : {};

  useEffect(() => {
    void fetchItems(languagesCollection, { limit: 100, sort: 'sort' })
      .then((result) => setLanguageRows(result.items))
      .catch(() => setLanguageRows([]));
  }, [languagesCollection]);

  useEffect(() => {
    if (!parentCollection) {
      setParentFields([]);
      return;
    }
    void fetchFields(parentCollection)
      .then((fields) => setParentFields(fields))
      .catch(() => setParentFields([]));
  }, [parentCollection]);

  const visibleLanguages = useMemo(() => {
    const enabled = new Set(enabledLanguages);
    return languageRows.filter((row) => {
      const key = String(row[languagesField] ?? '');
      return enabled.size === 0 || enabled.has(key);
    });
  }, [enabledLanguages, languageRows, languagesField]);

  useEffect(() => {
    if (visibleLanguages.length === 0) {
      setActiveLanguage('');
      return;
    }
    const firstKey = String(visibleLanguages[0]?.[languagesField] ?? '');
    setActiveLanguage((current) => {
      if (current && visibleLanguages.some((row) => String(row[languagesField] ?? '') === current)) {
        return current;
      }
      return firstKey;
    });
  }, [visibleLanguages, languagesField]);

  const translatableFields = useMemo(
    () =>
      translatableFieldNames
        .map((name) => parentFields.find((entry) => entry.field === name))
        .filter((entry): entry is FieldMeta => Boolean(entry)),
    [parentFields, translatableFieldNames],
  );

  const activeLanguageRow = visibleLanguages.find(
    (row) => String(row[languagesField] ?? '') === activeLanguage,
  );
  const activeLanguageLabel = String(activeLanguageRow?.language ?? activeLanguage);

  function updateLanguageValue(languageKey: string, fieldName: string, fieldValue: unknown) {
    const currentLanguageValues = translations[languageKey] ?? {};
    onChange({
      ...translations,
      [languageKey]: {
        ...currentLanguageValues,
        [fieldName]: fieldValue,
      },
    });
  }

  if (translatableFieldNames.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Translation fields are not configured for this collection.
      </div>
    );
  }

  if (visibleLanguages.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No enabled languages found. Add languages in Content &amp; schema → Translations, then update collection setup.
      </div>
    );
  }

  const activeValues = translations[activeLanguage] ?? {};

  return (
    <div className="space-y-5">
      {showHeader && <FieldLabel field={field} />}

      {showHeader && (
        <div className="rounded-xl border border-brand-200/70 bg-gradient-to-r from-brand-50/80 to-white px-4 py-3 text-xs text-brand-800">
          Enter localized values for each enabled language.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Languages</p>
          <div className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {visibleLanguages.map((row) => {
              const key = String(row[languagesField] ?? '');
              const label = String(row.language ?? key);
              const isActive = activeLanguage === key;

              return (
                <button
                  key={String(row.id)}
                  type="button"
                  onClick={() => setActiveLanguage(key)}
                  className={`group flex min-w-[9.5rem] shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all lg:min-w-0 lg:w-full ${
                    isActive
                      ? 'border-brand-300 bg-brand-50 shadow-sm ring-2 ring-brand-200/60'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {key.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{label}</span>
                    <span className="mt-0.5 font-mono text-[11px] uppercase text-slate-500">{key}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
          <div className="mb-5 border-b border-slate-200/80 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{activeLanguageLabel}</h3>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                {activeLanguage}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Add localized values below. Empty fields fall back to the default language on save.
            </p>
          </div>

          <div className="space-y-5">
            {translatableFields.map((translatableField) => {
              const fieldValue = activeValues[translatableField.field];

              return (
                <div
                  key={`${activeLanguage}:${translatableField.field}`}
                  className="rounded-xl border border-slate-200/80 bg-white p-4"
                >
                  <InterfaceRenderer
                    field={translatableField}
                    value={fieldValue}
                    onChange={(nextValue) =>
                      updateLanguageValue(activeLanguage, translatableField.field, nextValue)
                    }
                    disabled={disabled}
                    formData={activeValues}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
