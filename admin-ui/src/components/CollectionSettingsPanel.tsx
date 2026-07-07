import { FormEvent, useEffect, useState } from 'react';
import type { CollectionMeta, FieldMeta } from '../lib/api';

interface CollectionSettingsPanelProps {
  collection: CollectionMeta;
  fields: FieldMeta[];
  onSave: (updates: Partial<CollectionMeta>) => Promise<void>;
  onSetupTranslations: (locales: string[]) => Promise<void>;
}

export default function CollectionSettingsPanel({
  collection,
  fields,
  onSave,
  onSetupTranslations,
}: CollectionSettingsPanelProps) {
  const [icon, setIcon] = useState(collection.icon ?? '');
  const [note, setNote] = useState(collection.note ?? '');
  const [singleton, setSingleton] = useState(collection.singleton);
  const [sortField, setSortField] = useState(collection.sort_field ?? '');
  const [archiveField, setArchiveField] = useState(collection.archive_field ?? '');
  const [archiveValue, setArchiveValue] = useState(collection.archive_value ?? '');
  const [unarchiveValue, setUnarchiveValue] = useState(collection.unarchive_value ?? '');
  const [locales, setLocales] = useState('en,es');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIcon(collection.icon ?? '');
    setNote(collection.note ?? '');
    setSingleton(collection.singleton);
    setSortField(collection.sort_field ?? '');
    setArchiveField(collection.archive_field ?? '');
    setArchiveValue(collection.archive_value ?? '');
    setUnarchiveValue(collection.unarchive_value ?? '');
  }, [collection]);

  const physicalFields = fields.filter((f) => !f.is_system || f.field === 'id');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        icon: icon || null,
        note: note || null,
        singleton,
        sort_field: sortField || null,
        archive_field: archiveField || null,
        archive_value: archiveValue || null,
        unarchive_value: unarchiveValue || null,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="form-section">
      <h2 className="form-section-title">Collection Settings</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Icon</label>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="article"
            className="input"
          />
        </div>
        <div>
          <label className="label">Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Sort field</label>
          <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="select">
            <option value="">None</option>
            {physicalFields.map((f) => (
              <option key={f.id} value={f.field}>
                {f.field}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Archive field</label>
          <select value={archiveField} onChange={(e) => setArchiveField(e.target.value)} className="select">
            <option value="">None</option>
            {physicalFields.map((f) => (
              <option key={f.id} value={f.field}>
                {f.field}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Archive value</label>
          <input value={archiveValue} onChange={(e) => setArchiveValue(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Unarchive value</label>
          <input value={unarchiveValue} onChange={(e) => setUnarchiveValue(e.target.value)} className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2 cursor-pointer">
          <input
            type="checkbox"
            checked={singleton}
            onChange={(e) => setSingleton(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Singleton collection
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>

      <div className="border-t border-surface-border pt-4 mt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Translations wizard</h3>
        <div className="flex gap-2">
          <input
            value={locales}
            onChange={(e) => setLocales(e.target.value)}
            placeholder="en,es,fr"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => void onSetupTranslations(locales.split(',').map((l) => l.trim()).filter(Boolean))}
            className="btn-secondary"
          >
            Setup
          </button>
        </div>
      </div>
    </section>
  );
}
