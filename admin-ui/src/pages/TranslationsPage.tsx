import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/AppLayout';
import ConfirmDialog from '../components/data-model/ConfirmDialog';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import {
  createItem,
  deleteItem,
  fetchItems,
  updateItem,
  type ItemRecord,
} from '../lib/api';

interface LanguageFormState {
  key: string;
  language: string;
  value: string;
}

const EMPTY_FORM: LanguageFormState = { key: '', language: '', value: '' };

const LANGUAGE_ICON_GRADIENTS = [
  'from-brand-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
];

export default function TranslationsPage() {
  const [languages, setLanguages] = useState<ItemRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRecord | null>(null);
  const [form, setForm] = useState<LanguageFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ItemRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchItems('languages', { limit: 100, sort: 'sort' });
      setLanguages(result.items);
    } catch {
      setError('Failed to load languages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return languages;
    return languages.filter((row) => {
      const key = String(row.key ?? '').toLowerCase();
      const language = String(row.language ?? '').toLowerCase();
      const value = String(row.value ?? '').toLowerCase();
      return key.includes(query) || language.includes(query) || value.includes(query);
    });
  }, [languages, search]);

  const hasSearchQuery = search.trim().length > 0;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row: ItemRecord) {
    setEditing(row);
    setForm({
      key: String(row.key ?? ''),
      language: String(row.language ?? ''),
      value: String(row.value ?? ''),
    });
    setModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.language.trim()) {
      setError('Key and Language are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        key: form.key.trim(),
        language: form.language.trim(),
        value: form.value.trim() || null,
      };

      if (editing?.id) {
        await updateItem('languages', String(editing.id), payload);
      } else {
        await createItem('languages', payload);
      }

      setModalOpen(false);
      await load();
    } catch {
      setError('Failed to save language');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    try {
      await deleteItem('languages', String(deleteTarget.id));
      setDeleteTarget(null);
      await load();
    } catch {
      setError('Failed to delete language');
    }
  }

  return (
    <AppLayout
      title="Translations"
      subtitle="Define languages used when configuring collection translations."
      breadcrumbs={[
        { label: 'Content & schema' },
        { label: 'Translations' },
      ]}
      fullWidth
      actions={
        <button type="button" onClick={openCreate} className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Add language
        </button>
      }
    >
      <div className="max-w-5xl space-y-5">
        <div className="page-toolbar">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by key, language, or locale..."
              className="input pl-9"
            />
          </div>
          <span className="toolbar-divider" />
          <span className="toolbar-count">
            {filtered.length} language{filtered.length === 1 ? '' : 's'}
            {hasSearchQuery && languages.length !== filtered.length ? (
              <span className="text-slate-400"> of {languages.length}</span>
            ) : null}
          </span>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="table-shell">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="table-th w-28">Key</th>
                <th className="table-th">Language</th>
                <th className="table-th">Locale</th>
                <th className="table-th text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    Loading languages...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state py-12">
                      <span className="empty-state-icon">
                        <Icon name="translate" className="h-7 w-7" />
                      </span>
                      {hasSearchQuery ? (
                        <>
                          <p className="font-medium text-slate-700">No matching languages</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Try a different search term or clear the filter.
                          </p>
                          <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="btn-secondary mt-4"
                          >
                            Clear search
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-slate-700">No languages yet</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Add English, Spanish, or other locales to get started.
                          </p>
                          <button type="button" onClick={openCreate} className="btn-primary mt-4">
                            <Icon name="plus" className="h-4 w-4" />
                            Add language
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const key = String(row.key ?? '');
                  const language = String(row.language ?? '');
                  const value = String(row.value ?? '');

                  return (
                    <tr key={String(row.id)} className="table-row-hover">
                      <td className="table-td">
                        <span className="badge badge-blue font-mono text-xs uppercase tracking-wide">
                          {key}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                              LANGUAGE_ICON_GRADIENTS[index % LANGUAGE_ICON_GRADIENTS.length]
                            } text-white text-xs font-bold shadow-sm`}
                          >
                            {key.slice(0, 2).toUpperCase() || 'L'}
                          </span>
                          <span className="font-semibold text-slate-900">{language}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        {value ? (
                          <code className="rounded-md bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-600 ring-1 ring-inset ring-slate-200">
                            {value}
                          </code>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="table-td">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                            aria-label={`Edit ${language}`}
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            aria-label={`Delete ${language}`}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit language' : 'Add language'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              form="language-form"
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? 'Saving...' : editing ? 'Save changes' : 'Add language'}
            </button>
          </>
        }
      >
        <form id="language-form" onSubmit={(e) => void handleSave(e)} className="space-y-5">
          <div>
            <label className="label">Key</label>
            <input
              value={form.key}
              onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
              className="input font-mono"
              placeholder="en"
              disabled={Boolean(editing)}
              required
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Short code used in collection translation setup.
            </p>
          </div>
          <div>
            <label className="label">Language</label>
            <input
              value={form.language}
              onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
              className="input"
              placeholder="English"
              required
            />
          </div>
          <div>
            <label className="label">Locale</label>
            <input
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
              className="input font-mono"
              placeholder="en-US"
            />
            <p className="mt-1.5 text-xs text-slate-400">Optional full locale tag.</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete language"
        message={`Delete "${deleteTarget ? String(deleteTarget.language) : ''}"? Collections using this language may need to be updated.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </AppLayout>
  );
}
