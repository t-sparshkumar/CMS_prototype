import Icon from '../Icon';
import { FieldLabel, inputClassName } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface RepeaterFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

interface RepeaterSubField {
  field: string;
  type?: string;
  interface?: string;
}

function getSubFields(field: FieldMeta): RepeaterSubField[] {
  const raw = field.options?.fields ?? field.options?.template;
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        return {
          field: String(record.field ?? record.name ?? 'value'),
          type: record.type ? String(record.type) : 'string',
          interface: record.interface ? String(record.interface) : 'input',
        };
      }
      return { field: String(item), type: 'string', interface: 'input' };
    });
  }
  return [{ field: 'value', type: 'string', interface: 'input' }];
}

export default function RepeaterField({ field, value, onChange, disabled }: RepeaterFieldProps) {
  const subFields = getSubFields(field);
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  function updateRow(index: number, key: string, val: unknown) {
    const next = rows.map((row, i) => (i === index ? { ...row, [key]: val } : row));
    onChange(next);
  }

  function addRow() {
    const blank: Record<string, unknown> = {};
    for (const sf of subFields) {
      blank[sf.field] = '';
    }
    onChange([...rows, blank]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="field-repeater-row">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Row {index + 1}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  aria-label="Remove row"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subFields.map((sf) => (
                <div key={sf.field}>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">{sf.field}</label>
                  <input
                    type="text"
                    value={String(row[sf.field] ?? '')}
                    disabled={disabled}
                    onChange={(e) => updateRow(index, sf.field, e.target.value)}
                    className={inputClassName}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {!disabled && (
          <button type="button" onClick={addRow} className="btn-secondary text-xs">
            <Icon name="plus" className="h-4 w-4" />
            Add row
          </button>
        )}
        {rows.length === 0 && (
          <p className="text-xs text-slate-400">No rows yet. Click &quot;Add row&quot; to start.</p>
        )}
      </div>
    </div>
  );
}
