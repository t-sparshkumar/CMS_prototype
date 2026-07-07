import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DisplayTemplateBuilder from '../../components/data-model/DisplayTemplateBuilder';
import IconPicker from '../../components/data-model/IconPicker';
import Icon from '../../components/Icon';
import {
  fetchCollection,
  fetchFields,
  renameCollection,
  setupTranslations,
  updateCollection,
  type FieldMeta,
} from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiErrors';
import ConfirmDialog from '../../components/data-model/ConfirmDialog';

export default function CollectionSetupPage() {
  const { collection = '' } = useParams<{ collection: string }>();
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [note, setNote] = useState('');
  const [displayTemplate, setDisplayTemplate] = useState('');
  const [hidden, setHidden] = useState(false);
  const [singleton, setSingleton] = useState(false);
  const [activityTracking, setActivityTracking] = useState(true);
  const [sortField, setSortField] = useState('');
  const [archiveField, setArchiveField] = useState('');
  const [archiveValue, setArchiveValue] = useState('');
  const [unarchiveValue, setUnarchiveValue] = useState('');
  const [languagesCollection, setLanguagesCollection] = useState('languages');
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasAccountabilityFields = fields.some((f) => f.field === 'date_created');

  useEffect(() => {
    void Promise.all([fetchCollection(collection), fetchFields(collection)]).then(([m, f]) => {
      setFields(f);
      setIcon(m.icon ?? '');
      setColor(m.color ?? '#6366f1');
      setNote(m.note ?? '');
      setDisplayTemplate(m.display_template ?? '');
      setHidden(m.hidden);
      setSingleton(m.singleton);
      setActivityTracking(m.activity_tracking !== false);
      setSortField(m.sort_field ?? '');
      setArchiveField(m.archive_field ?? '');
      setArchiveValue(m.archive_value ?? '');
      setUnarchiveValue(m.unarchive_value ?? '');
    });
  }, [collection]);

  const physicalFields = fields.filter((f) => !f.is_system || f.field === 'id');

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateCollection(collection, {
        icon: icon || null,
        color: color || null,
        note: note || null,
        display_template: displayTemplate || null,
        hidden,
        singleton,
        activity_tracking: activityTracking,
        sort_field: sortField || null,
        archive_field: archiveField || null,
        archive_value: archiveValue || null,
        unarchive_value: unarchiveValue || null,
      });
      setMessage('Settings saved successfully');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save settings'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Icon name="settings" className="h-4 w-4 text-slate-400" />
          Appearance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Icon</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{color}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Display template</label>
            <DisplayTemplateBuilder fields={fields} value={displayTemplate} onChange={setDisplayTemplate} />
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Icon name="shield" className="h-4 w-4 text-slate-400" />
          Behavior
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-brand-300 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/30">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Hidden in navigation</p>
              <p className="text-xs text-slate-500 mt-0.5">Hide from content sidebar</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-brand-300 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/30">
            <input
              type="checkbox"
              checked={singleton}
              onChange={(e) => setSingleton(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Singleton</p>
              <p className="text-xs text-slate-500 mt-0.5">Only one item allowed</p>
            </div>
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Icon name="history" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Activity logging</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Record create, update, and delete events in the audit trail for this collection.
              </p>
              {hasAccountabilityFields && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Accountability fields (date_created, user_created) are present on this collection.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={activityTracking}
            onClick={() => setActivityTracking((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              activityTracking ? 'bg-brand-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                activityTracking ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Sorting & Archive</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Sort field</label>
            <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="input">
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
            <select value={archiveField} onChange={(e) => setArchiveField(e.target.value)} className="input">
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
        </div>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Translations</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={languagesCollection}
            onChange={(e) => setLanguagesCollection(e.target.value)}
            placeholder="Languages collection"
            className="input"
          />
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            void setupTranslations(collection, {
              languages_collection: languagesCollection,
              translations_field: 'translations',
            })
          }
        >
          Setup translations field
        </button>
      </section>

      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSaving} className="btn-primary">
          {isSaving ? 'Saving...' : 'Save settings'}
        </button>
        <button type="button" onClick={() => setRenameOpen(true)} className="btn-secondary">
          Rename collection
        </button>
      </div>

      <ConfirmDialog
        open={renameOpen}
        title="Rename collection"
        message={`Rename "${collection}" — this alters the database table name.`}
        confirmLabel="Rename"
        destructive
        onCancel={() => setRenameOpen(false)}
        onConfirm={() => {
          if (!newName.trim()) return;
          void renameCollection(collection, newName.trim()).then(() => {
            window.location.href = `/settings/data-model/${newName.trim()}/setup`;
          });
        }}
      />
      {renameOpen && (
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="new_collection_name"
          className="input max-w-sm"
        />
      )}
    </form>
  );
}
