import { FormEvent, useEffect, useState } from 'react';
import type { CollectionMeta, CreateFieldInput, FieldMeta, SqlFieldType, UpdateFieldInput } from '../lib/api';
import { INTERFACE_CATALOG, isAliasInterface, isRelationInterface } from '../lib/interfaceCatalog';

const FIELD_TYPES: SqlFieldType[] = [
  'string', 'text', 'integer', 'bigInteger', 'float', 'decimal', 'boolean',
  'datetime', 'date', 'json', 'uuid', 'hash', 'time', 'csv', 'binary',
];

interface FieldBuilderDrawerProps {
  open: boolean;
  collection: string;
  collections: CollectionMeta[];
  editingField: FieldMeta | null;
  onClose: () => void;
  onCreate: (input: CreateFieldInput) => Promise<void>;
  onUpdate: (fieldName: string, input: UpdateFieldInput) => Promise<void>;
}

type Tab = 'schema' | 'interface' | 'layout' | 'display' | 'conditions';

interface ConditionRow {
  watchField: string;
  operator: '_eq' | '_neq';
  value: string;
  hidden?: boolean;
  readonly?: boolean;
  required?: boolean;
}

export default function FieldBuilderDrawer({
  open,
  collection,
  collections,
  editingField,
  onClose,
  onCreate,
  onUpdate,
}: FieldBuilderDrawerProps) {
  const [tab, setTab] = useState<Tab>('schema');
  const [fieldName, setFieldName] = useState('');
  const [type, setType] = useState<SqlFieldType>('string');
  const [iface, setIface] = useState('input');
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
  const [choices, setChoices] = useState('');
  const [relatedCollection, setRelatedCollection] = useState('');
  const [relatedField, setRelatedField] = useState('');
  const [sourceField, setSourceField] = useState('title');
  const [withSort, setWithSort] = useState(false);
  const [validationRequired, setValidationRequired] = useState(false);
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editingField) {
      setFieldName('');
      setType('string');
      setIface('input');
      setRequired(false);
      return;
    }
    setFieldName(editingField.field);
    setType((editingField.type as SqlFieldType) || 'string');
    setIface(editingField.interface);
    setRequired(editingField.required);
    setUnique(editingField.unique ?? false);
    setNullable(editingField.nullable ?? true);
    setIsIndexed(editingField.is_indexed ?? false);
    setSearchable(editingField.searchable ?? true);
    setHidden(editingField.hidden);
    setReadonly(editingField.readonly);
    setWidth(editingField.width ?? 12);
    setGroup(editingField.group ?? '');
    setNote(editingField.note ?? '');
    setDefaultValue(editingField.default_value ?? '');
    setDisplay(editingField.display ?? '');
    const rawChoices = editingField.options?.choices;
    setChoices(Array.isArray(rawChoices) ? rawChoices.map(String).join('\n') : '');
    setRelatedCollection(String(editingField.options?.related_collection ?? ''));
    setRelatedField(String(editingField.options?.related_field ?? ''));
    setSourceField(String(editingField.options?.source_field ?? 'title'));
    setWithSort(Boolean(editingField.options?.with_sort));
    setValidationRequired(Boolean(editingField.validation?.required));
    const rawConditions = editingField.conditions as { conditions?: ConditionRow[] } | ConditionRow[] | null;
    const list = Array.isArray(rawConditions) ? rawConditions : rawConditions?.conditions ?? [];
    setConditionRows(
      list.map((entry) => {
        const condition = entry as {
          rule?: { field?: string; _eq?: unknown; _neq?: unknown };
          hidden?: boolean;
          readonly?: boolean;
          required?: boolean;
        };
        const watchField = condition.rule?.field ?? '';
        const operator = condition.rule?._neq !== undefined ? '_neq' as const : '_eq' as const;
        const value = String(condition.rule?._eq ?? condition.rule?._neq ?? '');
        return {
          watchField,
          operator,
          value,
          hidden: condition.hidden,
          readonly: condition.readonly,
          required: condition.required,
        };
      }),
    );
  }, [editingField]);

  if (!open) return null;

  const isEdit = Boolean(editingField);
  const isRelation = isRelationInterface(iface);
  const isAlias = isAliasInterface(iface);

  function buildOptions(): Record<string, unknown> | null {
    if (isRelation) {
      return {
        related_collection: relatedCollection,
        ...(iface === 'one-to-many' ? { related_field: relatedField } : {}),
        ...(iface === 'many-to-many' && withSort ? { with_sort: true } : {}),
      };
    }
    if (iface === 'slug') {
      return { source_field: sourceField };
    }
    if (iface === 'select-dropdown' || iface === 'radio-buttons') {
      const list = choices.split('\n').map((c) => c.trim()).filter(Boolean);
      return list.length > 0 ? { choices: list } : null;
    }
    return null;
  }

  function buildConditions(): Record<string, unknown> | null {
    const conditions = conditionRows
      .filter((row) => row.watchField.trim())
      .map((row) => ({
        rule: {
          field: row.watchField.trim(),
          [row.operator]: row.operator === '_eq' ? row.value : row.value,
        },
        ...(row.hidden !== undefined ? { hidden: row.hidden } : {}),
        ...(row.readonly !== undefined ? { readonly: row.readonly } : {}),
        ...(row.required !== undefined ? { required: row.required } : {}),
      }));

    return conditions.length > 0 ? { conditions } : null;
  }

  function buildValidation(): Record<string, unknown> | null {
    return validationRequired ? { required: true } : null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        interface: iface,
        options: buildOptions(),
        display: display || null,
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
        conditions: buildConditions(),
        validation: buildValidation(),
      };

      if (isEdit && editingField) {
        await onUpdate(editingField.field, payload);
      } else {
        await onCreate({
          field: fieldName.trim(),
          ...(isRelation || isAlias ? {} : { type }),
          ...payload,
        });
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  const tabs: Tab[] = ['schema', 'interface', 'layout', 'display', 'conditions'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface h-full shadow-elevated flex flex-col border-l border-surface-border">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between glass-header !static">
          <h2 className="font-bold text-slate-900">{isEdit ? `Edit ${editingField?.field}` : 'New field'}</h2>
          <button type="button" onClick={onClose} className="btn-ghost py-1.5 px-2 text-xs">Close</button>
        </div>

        <div className="px-5 py-3 border-b border-surface-border">
          <div className="tab-bar w-full flex">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 capitalize ${tab === t ? 'tab-item-active' : 'tab-item'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-5 space-y-4">
          {tab === 'schema' && (
            <>
              {!isEdit && (
                <div>
                  <label className="label">Field name</label>
                  <input
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    pattern="[a-z][a-z0-9_]*"
                    required
                    className="input"
                  />
                </div>
              )}
              {!isRelation && !isAlias && (
                <div>
                  <label className="label">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SqlFieldType)}
                    className="input"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> Unique</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nullable} onChange={(e) => setNullable(e.target.checked)} /> Nullable</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isIndexed} onChange={(e) => setIsIndexed(e.target.checked)} /> Indexed</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={searchable} onChange={(e) => setSearchable(e.target.checked)} /> Searchable</label>
              <div>
                <label className="label">Default value</label>
                <input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
              </div>
            </>
          )}

          {tab === 'interface' && (
            <>
              <div>
                <label className="label">Interface</label>
                <select value={iface} onChange={(e) => setIface(e.target.value)} className="input">
                  {INTERFACE_CATALOG.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
              {isRelation && (
                <>
                  <div>
                    <label className="label">Related collection</label>
                    <select value={relatedCollection} onChange={(e) => setRelatedCollection(e.target.value)} className="input" required>
                      <option value="">Select...</option>
                      {collections.filter((c) => c.collection !== collection).map((c) => (
                        <option key={c.collection} value={c.collection}>{c.collection}</option>
                      ))}
                    </select>
                  </div>
                  {iface === 'one-to-many' && (
                    <div>
                      <label className="label">FK field on related</label>
                      <input value={relatedField} onChange={(e) => setRelatedField(e.target.value)} className="input" required />
                    </div>
                  )}
                </>
              )}
              {iface === 'many-to-many' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={withSort} onChange={(e) => setWithSort(e.target.checked)} />
                  Enable manual sort on junction
                </label>
              )}
              {(iface === 'select-dropdown' || iface === 'radio-buttons') && (
                <div>
                  <label className="label">Choices (one per line)</label>
                  <textarea value={choices} onChange={(e) => setChoices(e.target.value)} rows={4} className="input font-mono" />
                </div>
              )}
              {iface === 'slug' && (
                <div>
                  <label className="label">Source field</label>
                  <input value={sourceField} onChange={(e) => setSourceField(e.target.value)} className="input" />
                </div>
              )}
            </>
          )}

          {tab === 'layout' && (
            <>
              <div>
                <label className="label">Width (6=half, 12=full)</label>
                <select value={width} onChange={(e) => setWidth(Number(e.target.value))} className="input">
                  <option value={6}>Half</option>
                  <option value={12}>Full</option>
                </select>
              </div>
              <div>
                <label className="label">Group</label>
                <input value={group} onChange={(e) => setGroup(e.target.value)} className="input" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Hidden</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={readonly} onChange={(e) => setReadonly(e.target.checked)} /> Read-only</label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={validationRequired}
                  onChange={(e) => setValidationRequired(e.target.checked)}
                />
                Server validation: required
              </label>
            </>
          )}

          {tab === 'conditions' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">When the rule matches, apply the selected field state overrides.</p>
              {conditionRows.map((row, index) => (
                <div key={index} className="form-section space-y-2 !p-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={row.watchField}
                      onChange={(e) => {
                        const next = [...conditionRows];
                        next[index] = { ...row, watchField: e.target.value };
                        setConditionRows(next);
                      }}
                      placeholder="Watch field"
                      className="input py-2"
                    />
                    <select
                      value={row.operator}
                      onChange={(e) => {
                        const next = [...conditionRows];
                        next[index] = { ...row, operator: e.target.value as '_eq' | '_neq' };
                        setConditionRows(next);
                      }}
                      className="select py-2"
                    >
                      <option value="_eq">equals</option>
                      <option value="_neq">not equals</option>
                    </select>
                    <input
                      value={row.value}
                      onChange={(e) => {
                        const next = [...conditionRows];
                        next[index] = { ...row, value: e.target.value };
                        setConditionRows(next);
                      }}
                      placeholder="Value"
                      className="input py-2"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={row.hidden ?? false}
                        onChange={(e) => {
                          const next = [...conditionRows];
                          next[index] = { ...row, hidden: e.target.checked };
                          setConditionRows(next);
                        }}
                      />
                      Hidden
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={row.readonly ?? false}
                        onChange={(e) => {
                          const next = [...conditionRows];
                          next[index] = { ...row, readonly: e.target.checked };
                          setConditionRows(next);
                        }}
                      />
                      Read-only
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={row.required ?? false}
                        onChange={(e) => {
                          const next = [...conditionRows];
                          next[index] = { ...row, required: e.target.checked };
                          setConditionRows(next);
                        }}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => setConditionRows(conditionRows.filter((_, i) => i !== index))}
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setConditionRows([
                    ...conditionRows,
                    { watchField: '', operator: '_eq', value: '', hidden: false },
                  ])
                }
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                + Add condition
              </button>
            </div>
          )}

          {tab === 'display' && (
            <div>
              <label className="label">Display</label>
              <input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="raw, label, thumbnail" className="input" />
            </div>
          )}

          <button type="submit" disabled={isSaving} className="btn-primary w-full">
            {isSaving ? 'Saving...' : isEdit ? 'Update field' : 'Create field'}
          </button>
        </form>
      </div>
    </div>
  );
}
