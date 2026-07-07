import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import FieldFormLayout from '../components/FieldFormLayout';
import { applyFieldConditions } from '../lib/conditions';
import {
  createItem,
  fetchFields,
  fetchItem,
  updateItem,
  type FieldMeta,
  type ItemRecord,
} from '../lib/api';
import { isAxiosError } from 'axios';

export default function ContentItemPage() {
  const { collection = '', id } = useParams<{ collection: string; id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [formData, setFormData] = useState<ItemRecord>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resolvedFields = useMemo(
    () => applyFieldConditions(fields, formData),
    [fields, formData],
  );

  useEffect(() => {
    if (!collection) return;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const fieldList = await fetchFields(collection);
        setFields(fieldList.filter((f) => !f.is_system));

        if (!isNew && id) {
          const item = await fetchItem(collection, id);
          setFormData(item);
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

    for (const field of resolvedFields) {
      if (field.effective_hidden || field.hidden) {
        continue;
      }
      const required = field.effective_required ?? field.required;
      const validationRequired = Boolean(field.validation?.required);
      if ((required || validationRequired) && (formData[field.field] === null || formData[field.field] === undefined || formData[field.field] === '')) {
        errors[field.field] = `${field.field} is required`;
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
    try {
      if (isNew) {
        const created = await createItem(collection, formData);
        navigate(`/content/${collection}/${String(created.id)}`);
      } else if (id) {
        await updateItem(collection, id, formData);
        navigate(`/content/${collection}`);
      }
    } catch (err) {
      if (isAxiosError(err) && Array.isArray(err.response?.data?.errors)) {
        const errors = err.response.data.errors as Array<{ field?: string; message?: string }>;
        const mapped: Record<string, string> = {};
        for (const entry of errors) {
          if (entry.field) {
            mapped[entry.field] = entry.message ?? 'Invalid value';
          }
        }
        setFieldErrors(mapped);
      }
      setError('Failed to save item');
      setIsSaving(false);
    }
  }

  return (
    <AppLayout title={isNew ? `New ${collection}` : `Edit ${collection}`} subtitle={`Collection: ${collection}`}>
      <div className="max-w-3xl">
        <Link to={`/content/${collection}`} className="back-link mb-5">
          <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
          Back to {collection}
        </Link>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="form-card">
            <FieldFormLayout
              fields={resolvedFields}
              formData={formData}
              fieldErrors={fieldErrors}
              parentId={formData.id ? String(formData.id) : id !== 'new' ? id : undefined}
              onChange={(fieldName, value) => setFormData((prev) => ({ ...prev, [fieldName]: value }))}
            />

            {error && <div className="alert-error">{error}</div>}

            <div className="flex gap-2 pt-4 border-t border-surface-border">
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <Link to={`/content/${collection}`} className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
