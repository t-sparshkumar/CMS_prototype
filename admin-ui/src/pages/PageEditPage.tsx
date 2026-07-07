import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import PageComponentBuilder, { parsePageComponents } from '../components/PageComponentBuilder';
import RelationPicker from '../components/RelationPicker';
import {
  createItem,
  fetchFields,
  fetchItem,
  fetchItems,
  updateItem,
  type FieldMeta,
  type ItemRecord,
} from '../lib/api';

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = location.pathname.endsWith('/new') || id === 'new';

  const [pageGroupField, setPageGroupField] = useState<FieldMeta | null>(null);
  const [componentLibrary, setComponentLibrary] = useState<ItemRecord[]>([]);
  const [formData, setFormData] = useState<ItemRecord>({
    active: true,
    status: 'draft',
    components: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [fields, componentsResult] = await Promise.all([
          fetchFields('pages'),
          fetchItems('site_components', { limit: 200 }),
        ]);

        const pgField = fields.find((f) => f.field === 'page_group');
        if (pgField) {
          setPageGroupField(pgField);
        }
        setComponentLibrary(componentsResult.items);

        if (!isNew && id) {
          const page = await fetchItem('pages', id);
          setFormData({
            ...page,
            components: parsePageComponents(page.components),
          });
        }
      } catch {
        setError('Failed to load page. Ensure website collections are seeded.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [id, isNew]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.slug) {
      setError('Title and slug are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        components: parsePageComponents(formData.components),
      };

      if (isNew) {
        const created = await createItem('pages', payload);
        navigate(`/pages/${String(created.id)}/edit`);
      } else if (id) {
        await updateItem('pages', id, payload);
        navigate('/pages');
      }
    } catch {
      setError('Failed to save page');
      setIsSaving(false);
    }
  }

  function setField(field: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <AppLayout
      title={isNew ? 'Create Page' : 'Edit Page'}
      subtitle={isNew ? 'Compose a new website page from components' : 'Update page content and layout'}
    >
      <div className="max-w-4xl">
        <Link to="/pages" className="back-link mb-5">
          <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
          Back to Pages
        </Link>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <section className="form-card !space-y-4">
              <h2 className="form-section-title !border-0 !pb-0 !mb-0">Page Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    required
                    value={String(formData.title ?? '')}
                    onChange={(e) => setField('title', e.target.value)}
                    className="input"
                    placeholder="Home Page"
                  />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input
                    required
                    value={String(formData.slug ?? '')}
                    onChange={(e) => setField('slug', e.target.value)}
                    className="input font-mono"
                    placeholder="home"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pageGroupField && (
                  <div>
                    <RelationPicker
                      field={pageGroupField}
                      value={formData.page_group}
                      onChange={(v) => setField('page_group', v)}
                    />
                  </div>
                )}
                <div>
                  <label className="label">Status</label>
                  <select
                    value={String(formData.status ?? 'draft')}
                    onChange={(e) => setField('status', e.target.value)}
                    className="input"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.active)}
                      onChange={(e) => setField('active', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Active
                  </label>
                </div>
              </div>
            </section>

            <section className="form-card">
              <PageComponentBuilder
                value={formData.components}
                onChange={(components) => setField('components', components)}
                availableComponents={componentLibrary}
              />
            </section>

            {error && <div className="alert-error">{error}</div>}

            <div className="flex gap-2">
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? 'Saving...' : 'Save Page'}
              </button>
              <Link to="/pages" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
