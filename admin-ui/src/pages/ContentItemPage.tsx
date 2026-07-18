import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ContentTranslationsSection from '../components/ContentTranslationsSection';
import type { BreadcrumbItem } from '../components/Breadcrumbs';
import FieldFormLayout from '../components/FieldFormLayout';
import PageSectionsBuilder, {
  getPageSectionAllowedCollections,
  isPageSectionsField,
  parsePageSections,
  serializePageSectionsForSave,
} from '../components/PageSectionsBuilder';
import { applyFieldConditions } from '../lib/conditions';
import {
  createItem,
  fetchFields,
  fetchItem,
  fetchTranslationsConfig,
  updateItem,
  type FieldMeta,
  type ItemRecord,
  type TranslationsConfig,
} from '../lib/api';
import { isAxiosError } from 'axios';
import { getApiErrorMessage } from '../lib/apiErrors';
import { getSafeReturnTo } from '../lib/returnTo';

function buildEmptyTranslations(enabledLanguages: string[]): Record<string, Record<string, unknown>> {
  return Object.fromEntries(enabledLanguages.map((key) => [key, {}]));
}

function mergeTranslationsIntoBaseFields(
  formData: ItemRecord,
  config: TranslationsConfig,
): ItemRecord {
  const translations =
    typeof formData.translations === 'object' &&
    formData.translations !== null &&
    !Array.isArray(formData.translations)
      ? (formData.translations as Record<string, Record<string, unknown>>)
      : {};

  const merged = { ...formData };

  for (const fieldName of config.translatable_fields) {
    const currentValue = merged[fieldName];
    if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
      continue;
    }

    for (const languageKey of config.enabled_languages) {
      const localizedValue = translations[languageKey]?.[fieldName];
      if (localizedValue !== undefined && localizedValue !== null && localizedValue !== '') {
        merged[fieldName] = localizedValue;
        break;
      }
    }
  }

  return merged;
}

export default function ContentItemPage() {
  const { collection = '', id } = useParams<{ collection: string; id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const isNew = id === 'new';

  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [translationsConfig, setTranslationsConfig] = useState<TranslationsConfig | null>(null);
  const [formData, setFormData] = useState<ItemRecord>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resolvedFields = useMemo(
    () => applyFieldConditions(fields, formData),
    [fields, formData],
  );

  const translationsField = useMemo(() => {
    if (translationsConfig) {
      return (
        resolvedFields.find((field) => field.field === translationsConfig.translations_field) ?? null
      );
    }
    return resolvedFields.find((field) => field.interface === 'translations') ?? null;
  }, [resolvedFields, translationsConfig]);

  const translatableFieldNames = useMemo(
    () => new Set(translationsConfig?.translatable_fields ?? []),
    [translationsConfig],
  );

  const mainFields = useMemo(() => {
    return resolvedFields.filter((field) => {
      if (field.interface === 'translations') {
        return false;
      }
      if (translationsConfig && translatableFieldNames.has(field.field)) {
        return false;
      }
      return true;
    });
  }, [resolvedFields, translationsConfig, translatableFieldNames]);

  const sectionsField = useMemo(
    () => mainFields.find((field) => isPageSectionsField(field)) ?? null,
    [mainFields],
  );

  const formFields = useMemo(() => {
    if (!sectionsField) {
      return mainFields;
    }
    return mainFields.filter((field) => field.field !== 'sections');
  }, [mainFields, sectionsField]);

  useEffect(() => {
    if (!collection) return;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [fieldList, config] = await Promise.all([
          fetchFields(collection),
          fetchTranslationsConfig(collection).catch(() => null),
        ]);

        setTranslationsConfig(config);
        setFields(fieldList.filter((field) => !field.is_system));

        if (!isNew && id) {
          const item = await fetchItem(collection, id);
          setFormData(
            collection === 'pages'
              ? { ...item, sections: parsePageSections(item.sections) }
              : item,
          );
          return;
        }

        if (config) {
          setFormData({
            translations: buildEmptyTranslations(config.enabled_languages),
          });
        }
      } catch {
        setError('Failed to load item');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [collection, id, isNew]);

  function validateClient(): boolean {
    const errors: Record<string, string> = {};

    for (const field of formFields) {
      if (field.effective_hidden || field.hidden) {
        continue;
      }
      const required = field.effective_required ?? field.required;
      const validationRequired = Boolean(field.validation?.required);
      if (
        (required || validationRequired) &&
        (formData[field.field] === null || formData[field.field] === undefined || formData[field.field] === '')
      ) {
        errors[field.field] = `${field.field} is required`;
      }
      if (
        (field.interface === 'json' || field.type === 'json') &&
        typeof formData[field.field] === 'string' &&
        String(formData[field.field]).trim()
      ) {
        try {
          JSON.parse(String(formData[field.field]));
        } catch {
          errors[field.field] = 'Invalid JSON';
        }
      }
    }

    if (translationsConfig && translationsField) {
      const translations =
        typeof formData.translations === 'object' &&
        formData.translations !== null &&
        !Array.isArray(formData.translations)
          ? (formData.translations as Record<string, Record<string, unknown>>)
          : {};

      for (const fieldName of translationsConfig.translatable_fields) {
        const fieldMeta = fields.find((field) => field.field === fieldName);
        if (!fieldMeta?.required) {
          continue;
        }

        const hasBaseValue =
          formData[fieldName] !== undefined &&
          formData[fieldName] !== null &&
          formData[fieldName] !== '';

        const hasLocalizedValue = translationsConfig.enabled_languages.some((languageKey) => {
          const value = translations[languageKey]?.[fieldName];
          return value !== undefined && value !== null && value !== '';
        });

        if (!hasBaseValue && !hasLocalizedValue) {
          errors.translations = `${fieldName} is required in at least one language`;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collection) return;
    if (!validateClient()) {
      setError('Please fix validation errors before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setFieldErrors({});

    let payload = Object.fromEntries(
      Object.entries(formData).filter(([key]) => {
        const meta = fields.find((field) => field.field === key);
        return meta && !meta.is_system && key !== 'id';
      }),
    );

    if (translationsConfig) {
      payload = mergeTranslationsIntoBaseFields(payload, translationsConfig);
    }

    if (collection === 'pages') {
      payload = {
        ...payload,
        sections: serializePageSectionsForSave(payload.sections),
      };
      delete payload.components;
    }

    try {
      if (isNew) {
        const created = await createItem(collection, payload);
        navigate(returnTo ?? `/content/${collection}/${String(created.id)}`);
      } else if (id) {
        await updateItem(collection, id, payload);
        navigate(returnTo ?? `/content/${collection}`);
      }
    } catch (err) {
      if (isAxiosError(err) && Array.isArray(err.response?.data?.errors)) {
        const errors = err.response.data.errors as Array<{ field?: string; message?: string }>;
        const mapped: Record<string, string> = {};
        const messages: string[] = [];
        for (const entry of errors) {
          if (entry.field) {
            mapped[entry.field] = entry.message ?? 'Invalid value';
          } else if (entry.message) {
            messages.push(entry.message);
          }
        }
        setFieldErrors(mapped);
        setError(messages[0] ?? 'Failed to save item');
      } else {
        setError(getApiErrorMessage(err, 'Failed to save item'));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout
      title={isNew ? `New ${collection}` : `Edit ${collection}`}
      subtitle={`Collection: ${collection}`}
      breadcrumbs={
        [
          { label: 'Content', to: '/content' },
          { label: collection, to: `/content/${collection}` },
          { label: isNew ? 'New item' : 'Edit item' },
        ] satisfies BreadcrumbItem[]
      }
    >
      <div className="w-full">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-card space-y-6">
              <FieldFormLayout
                fields={formFields}
                formData={formData}
                fieldErrors={fieldErrors}
                parentId={formData.id ? String(formData.id) : id !== 'new' ? id : undefined}
                onChange={(fieldName, value) => setFormData((prev) => ({ ...prev, [fieldName]: value }))}
              />
            </div>

            {sectionsField && (
              <section className="form-card">
                <PageSectionsBuilder
                  value={formData.sections}
                  onChange={(sections) => setFormData((prev) => ({ ...prev, sections }))}
                  allowedCollections={getPageSectionAllowedCollections(sectionsField)}
                  returnTo={
                    !isNew && id ? `/content/${collection}/${id}` : undefined
                  }
                />
              </section>
            )}

            {translationsConfig && translationsField && (
              <ContentTranslationsSection
                translationsField={translationsField}
                config={translationsConfig}
                value={formData.translations}
                onChange={(value) => setFormData((prev) => ({ ...prev, translations: value }))}
              />
            )}

            {error && <div className="alert-error">{error}</div>}
            {fieldErrors.translations && (
              <div className="alert-error">{fieldErrors.translations}</div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <Link to={returnTo ?? `/content/${collection}`} className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
