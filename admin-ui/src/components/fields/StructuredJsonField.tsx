import { useMemo, useState } from 'react';
import RepeaterField from './RepeaterField';
import { FieldLabel, inputClassName } from './fieldShared';
import {
  inferRepeaterSubFields,
  parseJsonValue,
  stringifyJsonValue,
} from '../../lib/fieldUtils';
import type { FieldMeta } from '../../lib/api';

interface StructuredJsonFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export default function StructuredJsonField({
  field,
  value,
  onChange,
  disabled,
}: StructuredJsonFieldProps) {
  const subFields = useMemo(() => inferRepeaterSubFields(field, value), [field, value]);
  const [showRawJson, setShowRawJson] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (subFields && !showRawJson) {
    const repeaterField: FieldMeta = {
      ...field,
      interface: 'repeater',
      options: {
        ...(field.options ?? {}),
        fields: subFields,
      },
    };

    return (
      <div className="space-y-3">
        <RepeaterField
          field={repeaterField}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowRawJson(true)}
            className="text-xs font-medium text-slate-500 hover:text-brand-600"
          >
            Edit as JSON
          </button>
        )}
      </div>
    );
  }

  const textValue = stringifyJsonValue(parseJsonValue(value));

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      {subFields && !disabled && (
        <button
          type="button"
          onClick={() => {
            setShowRawJson(false);
            setJsonError(null);
          }}
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Back to visual editor
        </button>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          JSON
        </div>
        <textarea
          value={textValue}
          disabled={disabled}
          rows={8}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value;
            if (!next.trim()) {
              setJsonError(null);
              onChange(null);
              return;
            }
            try {
              onChange(JSON.parse(next) as unknown);
              setJsonError(null);
            } catch {
              onChange(next);
              setJsonError('Invalid JSON syntax');
            }
          }}
          className={`${inputClassName} rounded-none border-0 bg-white font-mono text-xs`}
        />
      </div>
      {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
    </div>
  );
}
