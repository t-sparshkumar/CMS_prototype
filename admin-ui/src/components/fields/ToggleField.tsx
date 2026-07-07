import type { FieldMeta } from '../../lib/api';

interface ToggleFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function ToggleField({ field, value, onChange, disabled, required }: ToggleFieldProps) {
  const checked = Boolean(value);

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <span className="text-sm font-medium text-slate-800">
          {field.field}
          {(required ?? field.required) && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {field.note && <p className="text-xs text-slate-400 mt-0.5">{field.note}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`field-toggle ${checked ? 'field-toggle-on' : 'field-toggle-off'}`}
      >
        <span className="field-toggle-knob" />
      </button>
    </div>
  );
}
