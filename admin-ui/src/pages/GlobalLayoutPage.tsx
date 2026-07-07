import { FormEvent, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import FileUploadField from '../components/FileUploadField';
import { FooterColumnsEditor, NavLinksEditor } from '../components/JsonLinkEditor';
import {
  createItem,
  fetchItems,
  updateItem,
  type ItemRecord,
} from '../lib/api';

export default function GlobalLayoutPage() {
  const [itemId, setItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ItemRecord>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchItems('global_layout', { limit: 1 });
        if (result.items[0]) {
          setItemId(String(result.items[0].id));
          setFormData(result.items[0]);
        } else {
          setItemId(null);
          setFormData({
            header_nav_links: [],
            footer_links: [],
          });
        }
      } catch {
        setError('Global layout is not set up yet. Run: npm run seed:run -w backend');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (itemId) {
        await updateItem('global_layout', itemId, formData);
      } else {
        const created = await createItem('global_layout', formData);
        setItemId(String(created.id));
        setFormData(created);
      }
      setMessage('Global layout saved successfully.');
    } catch {
      setError('Failed to save global layout');
    } finally {
      setIsSaving(false);
    }
  }

  function setField(field: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <AppLayout
      title="Global Header & Footer"
      subtitle="Changes here apply to all pages by default — individual pages can override later"
      actions={
        <button
          type="button"
          form="global-layout-form"
          disabled={isSaving}
          onClick={(e) => void handleSubmit(e as unknown as FormEvent)}
          className="btn-primary"
        >
          <Icon name="check" className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Layout'}
        </button>
      }
    >
      <div className="max-w-3xl">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <form id="global-layout-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <section className="card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="h-8 w-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
                  <Icon name="layout" className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900">Header</h2>
              </div>
              <div className="space-y-4">
                <FileUploadField
                  label="Logo"
                  value={formData.header_logo}
                  onChange={(v) => setField('header_logo', v)}
                />
                <div>
                  <label className="label">Site Title</label>
                  <input
                    value={String(formData.header_title ?? '')}
                    onChange={(e) => setField('header_title', e.target.value)}
                    className="input"
                  />
                </div>
                <NavLinksEditor
                  label="Navigation Links"
                  value={formData.header_nav_links}
                  onChange={(links) => setField('header_nav_links', links)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">CTA Button Label</label>
                    <input
                      value={String(formData.header_cta_label ?? '')}
                      onChange={(e) => setField('header_cta_label', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">CTA Button URL</label>
                    <input
                      value={String(formData.header_cta_url ?? '')}
                      onChange={(e) => setField('header_cta_url', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Icon name="content" className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900">Footer</h2>
              </div>
              <div className="space-y-4">
                <FileUploadField
                  label="Footer Logo"
                  value={formData.footer_logo}
                  onChange={(v) => setField('footer_logo', v)}
                />
                <div>
                  <label className="label">Description</label>
                  <textarea
                    rows={3}
                    value={String(formData.footer_description ?? '')}
                    onChange={(e) => setField('footer_description', e.target.value)}
                    className="input"
                  />
                </div>
                <FooterColumnsEditor
                  label="Footer Link Columns"
                  value={formData.footer_links}
                  onChange={(columns) => setField('footer_links', columns)}
                  columns
                />
                <div>
                  <label className="label">Copyright Text</label>
                  <input
                    value={String(formData.footer_copyright ?? '')}
                    onChange={(e) => setField('footer_copyright', e.target.value)}
                    placeholder="© 2026 Your Company. All rights reserved."
                    className="input"
                  />
                </div>
              </div>
            </section>

            <div className="rounded-xl bg-brand-50/60 border border-brand-100 px-4 py-3 flex items-start gap-3">
              <Icon name="shield" className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
              <p className="text-sm text-brand-900/80">
                This layout applies globally. Pages without custom header/footer overrides will inherit
                these settings.
              </p>
            </div>

            {message && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : 'Save Global Layout'}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
