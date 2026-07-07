import { useEffect, useState } from 'react';
import Icon from './Icon';
import {
  fetchFields,
  upsertPermission,
  type FieldMeta,
  type PermissionMeta,
  type UpsertPermissionInput,
} from '../lib/api';
import { getApiErrorMessage } from '../lib/apiErrors';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

const FILTER_OPERATORS = [
  { value: '_eq', label: 'equals' },
  { value: '_neq', label: 'not equals' },
  { value: '_contains', label: 'contains' },
  { value: '_gt', label: 'greater than' },
  { value: '_gte', label: 'greater or equal' },
  { value: '_lt', label: 'less than' },
  { value: '_lte', label: 'less or equal' },
  { value: '_null', label: 'is null' },
] as const;

export interface RowFilterRow {
  field: string;
  operator: string;
  value: string;
}

interface PermissionDrawerProps {
  open: boolean;
  roleId: string;
  roleName: string;
  collection: string;
  action: PermissionAction;
  permission: PermissionMeta | null;
  onClose: () => void;
  onSaved: () => void;
}

function parseRowFilters(rowFilter: Record<string, unknown>): RowFilterRow[] {
  const rows: RowFilterRow[] = [];
  for (const [field, operators] of Object.entries(rowFilter)) {
    if (typeof operators !== 'object' || operators === null) continue;
    for (const [operator, value] of Object.entries(operators)) {
      rows.push({
        field,
        operator,
        value: operator === '_null' ? String(value) : String(value ?? ''),
      });
    }
  }
  return rows;
}

function buildPermissionsPayload(rows: RowFilterRow[]): Record<string, unknown> | null {
  const filter: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (!row.field.trim()) continue;
    filter[row.field] = { [row.operator]: row.value };
  }
  return Object.keys(filter).length > 0 ? { filter } : null;
}

export default function PermissionDrawer({
  open,
  roleId,
  roleName,
  collection,
  action,
  permission,
  onClose,
  onSaved,
}: PermissionDrawerProps) {
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [allFields, setAllFields] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filterRows, setFilterRows] = useState<RowFilterRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetchFields(collection)
      .then(setFields)
      .catch(() => setFields([]));
  }, [open, collection]);

  useEffect(() => {
    if (!open) return;
    if (permission) {
      const isAll = permission.fields === '*';
      setAllFields(isAll);
      setSelectedFields(isAll ? [] : [...permission.fields]);
      setFilterRows(parseRowFilters(permission.rowFilter ?? {}));
    } else {
      setAllFields(true);
      setSelectedFields([]);
      setFilterRows([]);
    }
    setError(null);
  }, [open, permission]);

  if (!open) return null;

  const editableFields = fields.filter((f) => !f.is_system || f.field === 'status');

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const payload: UpsertPermissionInput = {
        role: roleId,
        collection,
        action,
        fields: allFields ? '*' : selectedFields.length > 0 ? selectedFields : ['*'],
        permissions: buildPermissionsPayload(filterRows),
      };
      await upsertPermission(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save permission'));
    } finally {
      setIsSaving(false);
    }
  }

  function toggleField(fieldName: string) {
    setSelectedFields((prev) =>
      prev.includes(fieldName) ? prev.filter((f) => f !== fieldName) : [...prev, fieldName],
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-elevated flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-1">
                Custom Access
              </p>
              <h2 className="text-lg font-bold text-slate-900 capitalize">{action}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                <span className="font-medium text-slate-700">{roleName}</span>
                {' · '}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{collection}</code>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Field Access</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-brand-300 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/40">
                <input
                  type="radio"
                  name="fieldAccess"
                  checked={allFields}
                  onChange={() => setAllFields(true)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">All fields</p>
                  <p className="text-xs text-slate-500">Full read/write on every field</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-brand-300 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/40">
                <input
                  type="radio"
                  name="fieldAccess"
                  checked={!allFields}
                  onChange={() => setAllFields(false)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Specific fields</p>
                  <p className="text-xs text-slate-500">Limit to selected fields only</p>
                </div>
              </label>
            </div>

            {!allFields && (
              <div className="mt-3 rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {editableFields.length === 0 ? (
                  <p className="p-3 text-sm text-slate-400">No fields found.</p>
                ) : (
                  editableFields.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.field)}
                        onChange={() => toggleField(field.field)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm font-medium text-slate-800">{field.field}</span>
                      <span className="text-xs text-slate-400 ml-auto">{field.type}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Row Filters</h3>
              <button
                type="button"
                onClick={() =>
                  setFilterRows((prev) => [...prev, { field: '', operator: '_eq', value: '' }])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Add rule
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Restrict which rows this role can access (e.g. only published items).
            </p>

            {filterRows.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-400">No row filters — access applies to all rows.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filterRows.map((row, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <select
                      value={row.field}
                      onChange={(e) => {
                        const next = [...filterRows];
                        const current = next[index] ?? row;
                        next[index] = { ...current, field: e.target.value };
                        setFilterRows(next);
                      }}
                      className="input flex-1 min-w-0"
                    >
                      <option value="">Field</option>
                      {editableFields.map((f) => (
                        <option key={f.id} value={f.field}>
                          {f.field}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.operator}
                      onChange={(e) => {
                        const next = [...filterRows];
                        const current = next[index] ?? row;
                        next[index] = { ...current, operator: e.target.value };
                        setFilterRows(next);
                      }}
                      className="input w-32 shrink-0"
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    {row.operator !== '_null' ? (
                      <input
                        value={row.value}
                        onChange={(e) => {
                          const next = [...filterRows];
                          const current = next[index] ?? row;
                          next[index] = { ...current, value: e.target.value };
                          setFilterRows(next);
                        }}
                        placeholder="Value"
                        className="input flex-1 min-w-0"
                      />
                    ) : (
                      <select
                        value={row.value}
                        onChange={(e) => {
                          const next = [...filterRows];
                          const current = next[index] ?? row;
                          next[index] = { ...current, value: e.target.value };
                          setFilterRows(next);
                        }}
                        className="input w-24 shrink-0"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setFilterRows((prev) => prev.filter((_, i) => i !== index))}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="btn-primary flex-1"
          >
            {isSaving ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
