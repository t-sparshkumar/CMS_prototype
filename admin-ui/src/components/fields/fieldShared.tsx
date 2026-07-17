import { getFieldDisplayLabel, humanizeFieldName } from '../../lib/fieldUtils';
import type { FieldMeta } from '../../lib/api';

export const inputClassName = 'input disabled:bg-slate-50 disabled:text-slate-400';

function shouldHideTechnicalNote(note: string | null | undefined): boolean {
  if (!note) return false;
  return /^array of\s*\{/i.test(note.trim());
}

function noteProvidesDisplayLabel(field: Pick<FieldMeta, 'note'>): boolean {
  if (!field.note) return false;
  const head = field.note.split('.')[0]?.trim();
  return Boolean(head && head.length <= 48);
}

export function FieldLabel({ field, required }: { field: FieldMeta; required?: boolean }) {
  const isRequired = required ?? field.required;
  const displayLabel = getFieldDisplayLabel(field);
  const humanized = humanizeFieldName(field.field);
  const noteIsLabel = noteProvidesDisplayLabel(field);
  const showFieldKey =
    !noteIsLabel && displayLabel.toLowerCase() !== humanized.toLowerCase() && displayLabel !== field.field;
  const showNote =
    field.note &&
    !shouldHideTechnicalNote(field.note) &&
    field.note.split('.')[0]?.trim().toLowerCase() !== displayLabel.trim().toLowerCase();

  return (
    <label className="block mb-2">
      <span className="block min-h-5 text-sm font-semibold leading-5 text-slate-800">
        {displayLabel}
        {isRequired && <span className="text-red-500"> *</span>}
      </span>
      {showFieldKey && (
        <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{field.field}</span>
      )}
      {showNote && (
        <span className="mt-1 block text-xs font-normal text-slate-500">{field.note}</span>
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
