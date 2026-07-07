import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ConditionsBuilder, {
  buildConditionsPayload,
  parseConditionsPayload,
  type ConditionRow,
} from '../../components/data-model/ConditionsBuilder';
import FieldDisplayEditor from '../../components/data-model/FieldDisplayEditor';
import FieldInterfaceOptionsEditor from '../../components/data-model/FieldInterfaceOptionsEditor';
import FieldRelationshipEditor from '../../components/data-model/FieldRelationshipEditor';
import ValidationRulesEditor, { type ValidationRules } from '../../components/data-model/ValidationRulesEditor';
import InterfaceRenderer from '../../components/InterfaceRenderer';
import FieldReadonlyDisplay from '../../components/fields/FieldReadonlyDisplay';
import Icon from '../../components/Icon';
import {
  createField,
  fetchCollections,
  fetchField,
  fetchFields,
  updateField,
  type CollectionMeta,
  type CreateFieldInput,
  type FieldMeta,
  type SqlFieldType,
  type UpdateFieldInput,
} from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiErrors';
import {
  getDefaultTypeForInterface,
  getInterfaceOption,
  INTERFACE_CATALOG,
  INTERFACE_GROUP_ORDER,
  isAliasInterface,
  isManyToManyInterface,
  isManyToOneInterface,
  isOneToManyInterface,
  isRelationInterface,
} from '../../lib/interfaceCatalog';
import { getDefaultPreviewValue } from '../../lib/fieldUtils';

const FIELD_TYPES: SqlFieldType[] = [
  'string', 'text', 'integer', 'bigInteger', 'float', 'decimal', 'boolean',
  'datetime', 'date', 'json', 'uuid', 'hash', 'time', 'csv', 'binary',
];

type Tab = 'schema' | 'interface' | 'relationship' | 'layout' | 'validation' | 'conditions' | 'display';

export default function FieldDetailPage() {
  const { collection = '', field: fieldParam = '' } = useParams<{ collection: string; field: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = fieldParam === '__new__';
  const presetInterface = searchParams.get('interface') ?? 'input';

  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [tab, setTab] = useState<Tab>('schema');
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [collectionFields, setCollectionFields] = useState<FieldMeta[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  const [fieldName, setFieldName] = useState('');
  const [type, setType] = useState<SqlFieldType>('string');
  const [iface, setIface] = useState(presetInterface);
  const [required, setRequired] = useState(false);
  const [unique, setUnique] = useState(false);
  const [nullable, setNullable] = useState(true);
  const [isIndexed, setIsIndexed] = useState(false);
  const [searchable, setSearchable] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [width, setWidth] = useState(12);
  const [group, setGroup] = useState('');
  const [note, setNote] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [display, setDisplay] = useState('');
  const [displayOptionsJson, setDisplayOptionsJson] = useState('{}');
  const [choices, setChoices] = useState('');
  const [relatedCollection, setRelatedCollection] = useState('');
  const [relatedField, setRelatedField] = useState('');
  const [withSort, setWithSort] = useState(false);
  const [schemaOnDelete, setSchemaOnDelete] = useState('SET NULL');
  const [layout, setLayout] = useState('list');
  const [displayTemplate, setDisplayTemplate] = useState('');
  const [allowedCollections, setAllowedCollections] = useState('');
  const [slugSource, setSlugSource] = useState('');
  const [validation, setValidation] = useState<ValidationRules>({});
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>([]);
  const [previewValue, setPreviewValue] = useState<unknown>('');
  const [previewMode, setPreviewMode] = useState<'edit' | 'display'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isRelation = isRelationInterface(iface);
  const isAlias = isAliasInterface(iface);
  const isFileInterface = iface === 'file' || iface.startsWith('file-');
  const interfaceLabel = getInterfaceOption(iface)?.label ?? iface;
  const tabs: Tab[] = isRelation
    ? ['schema', 'interface', 'relationship', 'layout', 'validation', 'conditions', 'display']
    : ['schema', 'interface', 'layout', 'validation', 'conditions', 'display'];

  function safeParseJson(text: string): Record<string, unknown> | null {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  function buildOptions(): Record<string, unknown> | null {
    if (isRelation) {
      const opts: Record<string, unknown> = {
        schema_on_delete: schemaOnDelete,
      };
      if (iface === 'many-to-any') {
        const allowed = allowedCollections
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        if (allowed.length > 0) {
          opts.allowed_collections = allowed;
        }
      } else {
        opts.related_collection = relatedCollection;
      }
      if (isOneToManyInterface(iface)) {
        opts.related_field = relatedField;
        opts.layout = iface === 'tree-view' ? 'tree' : layout;
      }
      if (isManyToManyInterface(iface)) {
        opts.with_sort = withSort;
      }
      if (isManyToOneInterface(iface) && displayTemplate) {
        opts.template = displayTemplate;
      }
      return opts;
    }
    if (iface === 'slug' && slugSource) {
      return { source_field: slugSource };
    }
    if (
      iface === 'select-dropdown' ||
      iface === 'radio-buttons' ||
      iface === 'checkboxes' ||
      iface === 'select-multiple-dropdown' ||
      iface === 'icon'
    ) {
      const list = choices.split('\n').map((c) => c.trim()).filter(Boolean);
      return list.length > 0 ? { choices: list } : null;
    }
    return null;
  }

  function applyFieldToForm(f: FieldMeta) {
    setFieldName(f.field);
    setType((f.type as SqlFieldType) || 'string');
    setIface(f.interface);
    setRequired(f.required);
    setUnique(f.unique ?? false);
    setNullable(f.nullable ?? true);
    setIsIndexed(f.is_indexed ?? false);
    setSearchable(f.searchable ?? true);
    setHidden(f.hidden);
    setReadonly(f.readonly);
    setWidth(f.width ?? 12);
    setGroup(f.group ?? '');
    setNote(f.note ?? '');
    setDefaultValue(f.default_value ?? '');
    setDisplay(f.display ?? '');
    setDisplayOptionsJson(JSON.stringify(f.display_options ?? {}, null, 2));
    setRelatedCollection(String(f.options?.related_collection ?? ''));
    setRelatedField(String(f.options?.related_field ?? ''));
    setWithSort(Boolean(f.options?.with_sort));
    setSchemaOnDelete(String(f.options?.schema_on_delete ?? 'SET NULL'));
    setLayout(String(f.options?.layout ?? 'list'));
    setDisplayTemplate(String(f.options?.template ?? ''));
    const allowedRaw = f.options?.allowed_collections;
    setAllowedCollections(
      Array.isArray(allowedRaw) ? allowedRaw.map(String).join('\n') : '',
    );
    setSlugSource(String(f.options?.source_field ?? ''));
    const rawChoices = f.options?.choices;
    setChoices(Array.isArray(rawChoices) ? rawChoices.map(String).join('\n') : '');
    setValidation((f.validation as ValidationRules) ?? {});
    setConditionRows(parseConditionsPayload(f.conditions));
  }

  function buildPayload(): Omit<CreateFieldInput, 'field'> & UpdateFieldInput {
    return {
      ...(!isRelation && !isAlias ? { type } : {}),
      interface: iface,
      options: buildOptions(),
      display: display || null,
      display_options: safeParseJson(displayOptionsJson),
      required,
      unique,
      nullable,
      is_indexed: isIndexed,
      searchable,
      hidden,
      readonly,
      width,
      group: group || null,
      note: note || null,
      default_value: defaultValue || null,
      validation: Object.keys(validation).length > 0 ? (validation as Record<string, unknown>) : null,
      conditions: buildConditionsPayload(conditionRows),
    };
  }

  useEffect(() => {
    void fetchCollections({ includeHidden: true }).then(setCollections);
    void fetchFields(collection).then(setCollectionFields).catch(() => setCollectionFields([]));
  }, [collection]);

  useEffect(() => {
    if (isNew) {
      setIface(presetInterface);
      const defaultType = getDefaultTypeForInterface(presetInterface);
      if (defaultType && defaultType !== 'alias') {
        setType(defaultType as SqlFieldType);
      }
      if (presetInterface === 'tree-view') {
        setLayout('tree');
      }
      return;
    }
    void fetchField(collection, fieldParam)
      .then(applyFieldToForm)
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load field')));
  }, [collection, fieldParam, isNew, presetInterface]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 3500);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    setPreviewValue(getDefaultPreviewValue(iface, type));
    setPreviewMode('edit');
  }, [iface, type]);

  const previewField: FieldMeta = {
    id: 0,
    collection,
    field: fieldName || 'preview',
    type,
    special: isFileInterface ? 'file' : null,
    interface: iface,
    options: buildOptions(),
    display,
    display_options: safeParseJson(displayOptionsJson),
    readonly,
    hidden,
    sort: 1,
    width,
    required,
    unique,
    nullable,
    is_indexed: isIndexed,
    searchable,
    group: group || null,
    conditions: buildConditionsPayload(conditionRows),
    validation: validation as Record<string, unknown>,
    note,
    default_value: defaultValue,
    is_system: false,
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setWarning(null);
    setSuccess(null);
    try {
      if (isNew) {
        await createField(collection, {
          ...buildPayload(),
          field: fieldName.trim(),
        });
        navigate(`/settings/data-model/${collection}/fields/${fieldName.trim()}`);
      } else {
        const result = await updateField(collection, fieldParam, buildPayload());
        applyFieldToForm(result.field);
        if (result.warning) {
          setWarning(result.warning);
        }
        setSuccess('Field saved successfully.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save field'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to={`/settings/data-model/${collection}`}
            className="back-link"
          >
            <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
            Back to fields
          </Link>
          <div className="tab-bar">
            <button
              type="button"
              onClick={() => setMode('simple')}
              className={mode === 'simple' ? 'tab-item-active' : 'tab-item'}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={mode === 'advanced' ? 'tab-item-active' : 'tab-item'}
            >
              Advanced
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-card !space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isNew ? 'Create Field' : fieldParam}
            </h2>
            {isNew ? (
              <p className="text-sm text-slate-500 mt-0.5">
                Interface: <span className="font-medium text-brand-600">{interfaceLabel}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-0.5">
                Interface: <span className="font-medium text-slate-700">{interfaceLabel}</span>
              </p>
            )}
          </div>

          {(mode === 'simple' || tab === 'schema') && (
            <div className="space-y-4">
              {isNew && (
                <div>
                  <label className="label">Field name</label>
                  <input
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="my_field"
                    pattern="[a-z][a-z0-9_]*"
                    required
                    className="input font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">Lowercase letters, numbers, underscores</p>
                </div>
              )}
              {!isRelation && !isAlias && (
                <div>
                  <label className="label">Database type</label>
                  {isNew ? (
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as SqlFieldType)}
                      className="select"
                      disabled={isFileInterface}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="input bg-surface-muted/50 text-slate-700 font-mono cursor-not-allowed">
                      {type}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">
                    {isNew
                      ? isFileInterface
                        ? 'File fields are always stored as uuid.'
                        : 'Choose the SQL column type for this field.'
                      : 'SQL column type cannot be changed after the field is created.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {mode === 'advanced' && (
            <>
              <div className="flex flex-wrap gap-1 border-b border-surface-border pb-3">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                      tab === t ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {tab === 'interface' && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Interface</label>
                    <select value={iface} onChange={(e) => setIface(e.target.value)} className="select">
                      {INTERFACE_GROUP_ORDER.map((group) => (
                        <optgroup key={group} label={group}>
                          {INTERFACE_CATALOG.filter((item) => item.group === group).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <FieldInterfaceOptionsEditor
                    iface={iface}
                    choices={choices}
                    slugSource={slugSource}
                    collectionFields={collectionFields}
                    onChoicesChange={setChoices}
                    onSlugSourceChange={setSlugSource}
                  />
                </div>
              )}

              {tab === 'relationship' && isRelation && (
                <FieldRelationshipEditor
                  collection={collection}
                  iface={iface}
                  collections={collections}
                  value={{
                    relatedCollection,
                    relatedField,
                    withSort,
                    schemaOnDelete,
                    layout,
                    displayTemplate,
                    allowedCollections,
                  }}
                  onChange={(patch) => {
                    if (patch.relatedCollection !== undefined) setRelatedCollection(patch.relatedCollection);
                    if (patch.relatedField !== undefined) setRelatedField(patch.relatedField);
                    if (patch.withSort !== undefined) setWithSort(patch.withSort);
                    if (patch.schemaOnDelete !== undefined) setSchemaOnDelete(patch.schemaOnDelete);
                    if (patch.layout !== undefined) setLayout(patch.layout);
                    if (patch.displayTemplate !== undefined) setDisplayTemplate(patch.displayTemplate);
                    if (patch.allowedCollections !== undefined) setAllowedCollections(patch.allowedCollections);
                  }}
                />
              )}

              {tab === 'layout' && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Width</label>
                    <select value={width} onChange={(e) => setWidth(Number(e.target.value))} className="select">
                      <option value={4}>Quarter (4)</option>
                      <option value={6}>Half (6)</option>
                      <option value={12}>Full (12)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Group</label>
                    <input value={group} onChange={(e) => setGroup(e.target.value)} className="input" />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Hidden
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={readonly} onChange={(e) => setReadonly(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Read-only
                  </label>
                </div>
              )}

              {tab === 'validation' && <ValidationRulesEditor value={validation} onChange={setValidation} />}
              {tab === 'conditions' && <ConditionsBuilder rows={conditionRows} onChange={setConditionRows} />}
              {tab === 'display' && (
                <FieldDisplayEditor
                  iface={iface}
                  fieldType={type}
                  display={display}
                  displayOptionsJson={displayOptionsJson}
                  onDisplayChange={setDisplay}
                  onDisplayOptionsChange={setDisplayOptionsJson}
                />
              )}

              {tab === 'schema' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Required</label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Unique</label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={nullable} onChange={(e) => setNullable(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Nullable</label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={isIndexed} onChange={(e) => setIsIndexed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Indexed</label>
                  <div>
                    <label className="label">Default value</label>
                    <input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Note</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'simple' && isRelation && iface !== 'many-to-any' && iface !== 'translations' && (
            <div className="form-section !p-4">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">Relationship</p>
              <FieldRelationshipEditor
                collection={collection}
                iface={iface}
                collections={collections}
                value={{
                  relatedCollection,
                  relatedField,
                  withSort,
                  schemaOnDelete,
                  layout,
                  displayTemplate,
                  allowedCollections,
                }}
                onChange={(patch) => {
                  if (patch.relatedCollection !== undefined) setRelatedCollection(patch.relatedCollection);
                  if (patch.relatedField !== undefined) setRelatedField(patch.relatedField);
                  if (patch.withSort !== undefined) setWithSort(patch.withSort);
                  if (patch.schemaOnDelete !== undefined) setSchemaOnDelete(patch.schemaOnDelete);
                  if (patch.layout !== undefined) setLayout(patch.layout);
                  if (patch.displayTemplate !== undefined) setDisplayTemplate(patch.displayTemplate);
                }}
              />
            </div>
          )}

          {success && <div className="alert-success">{success}</div>}
          {warning && <div className="alert-info">{warning}</div>}
          {error && <div className="alert-error">{error}</div>}

          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : isNew ? 'Create field' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="form-card h-fit sticky top-24 !space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="section-title !mb-0">Live Preview</h3>
          {!isAlias && (
            <div className="field-tab-bar !mb-0">
              <button
                type="button"
                onClick={() => setPreviewMode('edit')}
                className={`field-tab ${previewMode === 'edit' ? 'field-tab-active' : ''}`}
              >
                Interface
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('display')}
                className={`field-tab ${previewMode === 'display' ? 'field-tab-active' : ''}`}
              >
                Display
              </button>
            </div>
          )}
        </div>
        {previewMode === 'edit' || isAlias ? (
          <InterfaceRenderer
            field={previewField}
            value={previewValue}
            onChange={setPreviewValue}
            formData={{ title: 'Sample Title', name: 'Sample Name' }}
          />
        ) : (
          <div>
            <p className="text-xs text-slate-400 mb-2">Readonly display preview</p>
            <div className="field-readonly-box">
              <FieldReadonlyDisplay field={previewField} value={previewValue} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
