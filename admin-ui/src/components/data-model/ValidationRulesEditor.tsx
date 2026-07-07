export interface ValidationRules {
  required?: boolean;
  min_length?: number;
  max_length?: number;
  regex?: string;
  min?: number;
  max?: number;
}

interface ValidationRulesEditorProps {
  value: ValidationRules;
  onChange: (value: ValidationRules) => void;
}

export default function ValidationRulesEditor({ value, onChange }: ValidationRulesEditorProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value.required)}
          onChange={(e) => onChange({ ...value, required: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Required
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Min length</label>
          <input
            type="number"
            value={value.min_length ?? ''}
            onChange={(e) =>
              onChange({ ...value, min_length: e.target.value ? Number(e.target.value) : undefined })
            }
            className="input"
          />
        </div>
        <div>
          <label className="label">Max length</label>
          <input
            type="number"
            value={value.max_length ?? ''}
            onChange={(e) =>
              onChange({ ...value, max_length: e.target.value ? Number(e.target.value) : undefined })
            }
            className="input"
          />
        </div>
        <div>
          <label className="label">Min value</label>
          <input
            type="number"
            value={value.min ?? ''}
            onChange={(e) => onChange({ ...value, min: e.target.value ? Number(e.target.value) : undefined })}
            className="input"
          />
        </div>
        <div>
          <label className="label">Max value</label>
          <input
            type="number"
            value={value.max ?? ''}
            onChange={(e) => onChange({ ...value, max: e.target.value ? Number(e.target.value) : undefined })}
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label">Regex pattern</label>
        <input
          value={value.regex ?? ''}
          onChange={(e) => onChange({ ...value, regex: e.target.value || undefined })}
          className="input font-mono"
        />
      </div>
    </div>
  );
}
