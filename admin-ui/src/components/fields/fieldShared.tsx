import type { FieldMeta } from '../../lib/api';

export const inputClassName = 'input disabled:bg-slate-50 disabled:text-slate-400';

export function FieldLabel({ field, required }: { field: FieldMeta; required?: boolean }) {
  const isRequired = required ?? field.required;
  return (
    <label className="label">
      {field.field}
      {isRequired && <span className="text-red-500 normal-case tracking-normal"> *</span>}
      {field.note && (
        <span className="block font-normal normal-case tracking-normal text-slate-400 mt-0.5">
          {field.note}
        </span>
      )}
    </label>
  );
}

export function FieldTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="field-tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`field-tab ${active === tab.id ? 'field-tab-active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyChoicesHint({ fieldName }: { fieldName: string }) {
  return (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      No choices configured for <span className="font-mono">{fieldName}</span>. Add options in the field settings.
    </p>
  );
}
