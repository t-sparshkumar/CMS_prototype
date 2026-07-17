import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DisplayTemplateBuilder from '../../components/data-model/DisplayTemplateBuilder';
import CollectionIconPicker from '../../components/data-model/CollectionIconPicker';
import ColorPickerField from '../../components/data-model/ColorPickerField';
import Icon from '../../components/Icon';
import {
  fetchCollection,
  fetchFields,
  fetchItems,
  fetchTranslationsConfig,
  renameCollection,
  setupTranslations,
  updateCollection,
  type FieldMeta,
  type ItemRecord,
  type TranslationsConfig,
} from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiErrors';
import ConfirmDialog from '../../components/data-model/ConfirmDialog';

const TRANSLATABLE_TYPES = new Set(['string', 'text']);
const RELATION_INTERFACES = new Set([
  'many-to-one',
  'one-to-many',
  'many-to-many',
  'many-to-any',
  'translations',
  'tree-view',
  'collection-item-dropdown',
  'collection-item-multiple-dropdown',
]);

function isTranslatableField(field: FieldMeta): boolean {
  if (field.is_system || field.hidden || field.interface === 'translations') {
    return false;
  }
  if (field.type === 'alias' || RELATION_INTERFACES.has(field.interface)) {
    return false;
  }
  if (field.interface.startsWith('file')) {
    return false;
  }
  return TRANSLATABLE_TYPES.has(field.type);
}

export default function CollectionSetupPage() {
  const { collection = '' } = useParams<{ collection: string }>();
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [icon, setIcon] = useState('');
  const [displayName, setDisplayName] = useState('');
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
  const [isGroup, setIsGroup] = useState(false);
  const [translationsEnabled, setTranslationsEnabled] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<ItemRecord[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedTranslatableFields, setSelectedTranslatableFields] = useState<string[]>([]);
  const [translationsConfig, setTranslationsConfig] = useState<TranslationsConfig | null>(null);
  const [isSettingUpTranslations, setIsSettingUpTranslations] = useState(false);
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
      setDisplayName(m.display_name ?? '');
      setColor(m.color ?? '#6366f1');
      setIsGroup(m.is_group);
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
  const translatableFieldOptions = fields.filter(isTranslatableField);

  useEffect(() => {
    void fetchItems('languages', { limit: 100, sort: 'sort' })
      .then((result) => setAvailableLanguages(result.items))
      .catch(() => setAvailableLanguages([]));
  }, []);

  useEffect(() => {
    if (!collection || isGroup) {
      setTranslationsConfig(null);
      return;
    }

    void fetchTranslationsConfig(collection)
      .then((config) => {
        setTranslationsConfig(config);
        if (config) {
          setTranslationsEnabled(true);
          setSelectedLanguages(config.enabled_languages);
          setSelectedTranslatableFields(config.translatable_fields);
        }
      })
      .catch(() => setTranslationsConfig(null));
  }, [collection, isGroup]);

  function toggleLanguage(key: string) {
    setSelectedLanguages((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );
  }

  function toggleTranslatableField(fieldName: string) {
    setSelectedTranslatableFields((current) =>
      current.includes(fieldName) ? current.filter((entry) => entry !== fieldName) : [...current, fieldName],
    );
  }

  async function handleSetupTranslations() {
    if (selectedTranslatableFields.length === 0) {
      setError('Select at least one translatable field.');
      return;
    }
    if (selectedLanguages.length === 0) {
      setError('Select at least one language from the Translations section.');
      return;
    }

    setIsSettingUpTranslations(true);
    setError(null);
    setMessage(null);
    try {
      const config = await setupTranslations(collection, {
        languages_collection: 'languages',
        languages_field: 'key',
        translations_field: 'translations',
        translatable_fields: selectedTranslatableFields,
        enabled_languages: selectedLanguages,
      });
      setTranslationsConfig(config);
      setTranslationsEnabled(true);
      setMessage('Translations configured for this collection.');
      const refreshedFields = await fetchFields(collection);
      setFields(refreshedFields);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to configure translations'));
    } finally {
      setIsSettingUpTranslations(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateCollection(collection, {
        display_name: displayName.trim() || null,
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
          <div className="sm:col-span-2">
            <label className="label">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Friendly label shown in Content"
              className="input"
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown in Content navigation, breadcrumbs, and page sections. Leave blank to use{' '}
              <span className="font-mono">{collection}</span>.
            </p>
          </div>
          <div>
            <label className="label">Icon</label>
            <CollectionIconPicker
              value={icon || (isGroup ? 'folder' : 'article')}
              onChange={setIcon}
              color={color}
              isGroup={isGroup}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <ColorPickerField value={color} onChange={setColor} />
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

      {!isGroup && (
        <section className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Icon name="translate" className="h-4 w-4 text-slate-400" />
                Translations
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Choose languages from the Translations section and select which fields editors can localize per item.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={translationsEnabled}
              onClick={() => setTranslationsEnabled((value) => !value)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                translationsEnabled ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  translationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {translationsConfig && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
              Translations active on <span className="font-mono">{translationsConfig.translation_collection}</span> with{' '}
              {translationsConfig.enabled_languages.length} language
              {translationsConfig.enabled_languages.length === 1 ? '' : 's'} and{' '}
              {translationsConfig.translatable_fields.length} field
              {translationsConfig.translatable_fields.length === 1 ? '' : 's'}.
            </div>
          )}

          {translationsEnabled && (
            <>
              <div>
                <p className="label mb-2">Languages</p>
                {availableLanguages.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No languages defined yet. Add them in Content &amp; schema → Translations.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableLanguages.map((language) => {
                      const key = String(language.key ?? '');
                      return (
                        <label
                          key={String(language.id)}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-brand-300"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLanguages.includes(key)}
                            onChange={() => toggleLanguage(key)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">
                              {String(language.language ?? key)}
                            </span>
                            <span className="block text-xs text-slate-500 font-mono">{key}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="label mb-2">Translatable fields</p>
                {translatableFieldOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">Add string or text fields to this collection first.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {translatableFieldOptions.map((field) => (
                      <label
                        key={field.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-brand-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTranslatableFields.includes(field.field)}
                          onChange={() => toggleTranslatableField(field.field)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{field.field}</span>
                          <span className="block text-xs text-slate-500">{field.interface}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn-secondary"
                disabled={isSettingUpTranslations}
                onClick={() => void handleSetupTranslations()}
              >
                {isSettingUpTranslations
                  ? 'Saving translation setup...'
                  : translationsConfig
                    ? 'Update translation setup'
                    : 'Save translation setup'}
              </button>
            </>
          )}
        </section>
      )}

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
