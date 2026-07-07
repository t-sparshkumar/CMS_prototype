export interface ConditionRow {
  watchField: string;
  operator: '_eq' | '_neq' | '_null' | '_nnull' | '_contains' | '_in';
  value: string;
  hidden?: boolean;
  readonly?: boolean;
  required?: boolean;
}

interface ConditionsBuilderProps {
  rows: ConditionRow[];
  onChange: (rows: ConditionRow[]) => void;
}

export default function ConditionsBuilder({ rows, onChange }: ConditionsBuilderProps) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="form-section space-y-2 !p-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              value={row.watchField}
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, watchField: e.target.value };
                onChange(next);
              }}
              placeholder="Field"
              className="input py-2"
            />
            <select
              value={row.operator}
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, operator: e.target.value as ConditionRow['operator'] };
                onChange(next);
              }}
              className="select py-2"
            >
              <option value="_eq">equals</option>
              <option value="_neq">not equals</option>
              <option value="_null">is null</option>
              <option value="_nnull">is not null</option>
              <option value="_contains">contains</option>
              <option value="_in">in list</option>
            </select>
            <input
              value={row.value}
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, value: e.target.value };
                onChange(next);
              }}
              placeholder="Value"
              className="input py-2"
            />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            {(['hidden', 'readonly', 'required'] as const).map((key) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row[key] ?? false}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, [key]: e.target.checked };
                    onChange(next);
                  }}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {key}
              </label>
            ))}
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="font-medium text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...rows, { watchField: '', operator: '_eq', value: '', hidden: false }])
        }
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        + Add condition
      </button>
    </div>
  );
}

export function buildConditionsPayload(rows: ConditionRow[]): Record<string, unknown> | null {
  const conditions = rows
    .filter((row) => row.watchField.trim())
    .map((row) => ({
      rule: {
        field: row.watchField.trim(),
        [row.operator]: row.operator === '_in' ? row.value.split(',').map((v) => v.trim()) : row.value,
      },
      ...(row.hidden !== undefined ? { hidden: row.hidden } : {}),
      ...(row.readonly !== undefined ? { readonly: row.readonly } : {}),
      ...(row.required !== undefined ? { required: row.required } : {}),
    }));
  return conditions.length > 0 ? { conditions } : null;
}

export function parseConditionsPayload(
  raw: Record<string, unknown> | null,
): ConditionRow[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : (raw.conditions as unknown[]) ?? [];
  return list.map((entry) => {
    const condition = entry as {
      rule?: { field?: string; _eq?: unknown; _neq?: unknown; _null?: unknown; _nnull?: unknown; _contains?: unknown; _in?: unknown };
      hidden?: boolean;
      readonly?: boolean;
      required?: boolean;
    };
    const operator = condition.rule?._neq !== undefined ? '_neq'
      : condition.rule?._null !== undefined ? '_null'
      : condition.rule?._nnull !== undefined ? '_nnull'
      : condition.rule?._contains !== undefined ? '_contains'
      : condition.rule?._in !== undefined ? '_in'
      : '_eq';
    const value = String(
      condition.rule?._eq ?? condition.rule?._neq ?? condition.rule?._contains
      ?? (Array.isArray(condition.rule?._in) ? condition.rule._in.join(', ') : '') ?? '',
    );
    return {
      watchField: condition.rule?.field ?? '',
      operator: operator as ConditionRow['operator'],
      value,
      hidden: condition.hidden,
      readonly: condition.readonly,
      required: condition.required,
    };
  });
}
