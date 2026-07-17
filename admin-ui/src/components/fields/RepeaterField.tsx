import Icon from '../Icon';
import FileUploadField from '../FileUploadField';
import ResponsiveImageGroupField from './ResponsiveImageGroupField';
import { FieldLabel, inputClassName } from './fieldShared';
import { buildRepeaterSegments } from '../../lib/responsiveImageFields';
import { getSelectChoices, humanizeFieldName, parseJsonValue } from '../../lib/fieldUtils';
import type { FieldMeta } from '../../lib/api';

interface RepeaterFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export interface RepeaterSubField {
  field: string;
  type?: string;
  interface?: string;
  note?: string;
  required?: boolean;
  options?: Record<string, unknown>;
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
          note: record.note ? String(record.note) : undefined,
          required: Boolean(record.required),
          options:
            typeof record.options === 'object' && record.options !== null
              ? (record.options as Record<string, unknown>)
              : undefined,
        };
      }
      return { field: String(item), type: 'string', interface: 'input' };
    });
  }
  return [{ field: 'value', type: 'string', interface: 'input' }];
}

function normalizeRows(value: unknown): Record<string, unknown>[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null);
}

function subFieldLabel(subField: RepeaterSubField): string {
  return subField.note ?? humanizeFieldName(subField.field);
}

function isLinkRowRepeater(subFields: RepeaterSubField[]): boolean {
  if (subFields.length !== 2) {
    return false;
  }

  const names = subFields.map((sf) => sf.field.toLowerCase());
  const simpleInputs = subFields.every(
    (sf) => (sf.interface ?? 'input') === 'input' && sf.type !== 'text' && !sf.interface?.startsWith('file'),
  );

  return (
    simpleInputs &&
    names.some((name) => name === 'label' || name === 'title' || name === 'name') &&
    names.some((name) => name === 'url' || name === 'href' || name === 'link')
  );
}

function getSubFieldColClass(subField: RepeaterSubField, count: number): string {
  if (subField.interface === 'file-image' || subField.interface === 'textarea' || subField.type === 'text') {
    return 'md:col-span-12';
  }
  if (count === 1) {
    return 'md:col-span-12';
  }
  if (count === 2) {
    const name = subField.field.toLowerCase();
    if (name === 'url' || name === 'href' || name === 'link' || name.includes('url')) {
      return 'md:col-span-7';
    }
    return 'md:col-span-5';
  }
  if (count === 3) {
    return 'md:col-span-4';
  }
  return 'md:col-span-6';
}

function getLinkRowFields(subFields: RepeaterSubField[]) {
  const labelField =
    subFields.find((sf) => ['label', 'title', 'name'].includes(sf.field.toLowerCase())) ?? subFields[0];
  const urlField =
    subFields.find((sf) => ['url', 'href', 'link'].includes(sf.field.toLowerCase())) ?? subFields[1];
  return { labelField, urlField };
}

function RepeaterSubFieldInput({
  subField,
  value,
  onChange,
  disabled,
}: {
  subField: RepeaterSubField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const label = subFieldLabel(subField);
  const iface = subField.interface ?? 'input';

  if (iface === 'file' || iface === 'file-image' || iface.startsWith('file-')) {
    return (
      <FileUploadField
        label={label}
        required={subField.required}
        value={value}
        onChange={onChange}
        disabled={disabled}
        accept={iface === 'file-image' ? 'image/*' : undefined}
      />
    );
  }

  if (iface === 'repeater' || (subField.type === 'json' && Array.isArray(subField.options?.fields))) {
    const nestedField: FieldMeta = {
      id: 0,
      collection: '',
      field: subField.field,
      type: 'json',
      interface: 'repeater',
      options: subField.options ?? {},
      display: null,
      display_options: null,
      readonly: false,
      hidden: false,
      sort: 0,
      width: 12,
      required: subField.required ?? false,
      unique: false,
      nullable: true,
      is_indexed: false,
      searchable: true,
      group: null,
      conditions: null,
      validation: null,
      note: subField.note ?? null,
      default_value: null,
      is_system: false,
      special: null,
    };

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <RepeaterField field={nestedField} value={value} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  if (iface === 'textarea' || subField.type === 'text') {
    return (
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
        <textarea
          value={String(value ?? '')}
          disabled={disabled}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
      </div>
    );
  }

  if (iface === 'select-dropdown' || iface === 'radio-buttons') {
    const choices = getSelectChoices({
      field: subField.field,
      options: subField.options ?? {},
    } as FieldMeta);

    return (
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
        <select
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        >
          <option value="">Select...</option>
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      <input
        type="text"
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

export default function RepeaterField({ field, value, onChange, disabled }: RepeaterFieldProps) {
  const subFields = getSubFields(field);
  const segments = buildRepeaterSegments(subFields);
  const rows = normalizeRows(value);
  const compactLinks = isLinkRowRepeater(subFields);
  const { labelField, urlField } = compactLinks ? getLinkRowFields(subFields) : { labelField: null, urlField: null };

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
        {compactLinks && labelField && urlField && rows.length > 0 && (
          <div className="hidden gap-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,2fr)_2.5rem]">
            <span />
            <span>{subFieldLabel(labelField)}</span>
            <span>{subFieldLabel(urlField)}</span>
            <span />
          </div>
        )}

        {rows.map((row, index) =>
          compactLinks && labelField && urlField ? (
            <div
              key={index}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,2fr)_2.5rem]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                {index + 1}
              </span>
              <div className="min-w-0">
                <label className="mb-1 block text-[11px] font-medium text-slate-500 md:sr-only">
                  {subFieldLabel(labelField)}
                </label>
                <input
                  type="text"
                  value={String(row[labelField.field] ?? '')}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, labelField.field, e.target.value)}
                  className={inputClassName}
                  placeholder={subFieldLabel(labelField)}
                />
              </div>
              <div className="col-span-2 min-w-0 md:col-span-1">
                <label className="mb-1 block text-[11px] font-medium text-slate-500 md:sr-only">
                  {subFieldLabel(urlField)}
                </label>
                <input
                  type="text"
                  value={String(row[urlField.field] ?? '')}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, urlField.field, e.target.value)}
                  className={inputClassName}
                  placeholder={subFieldLabel(urlField)}
                />
              </div>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove item"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ) : (
            <div key={index} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">Item {index + 1}</span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                {segments.map((segment, segmentIndex) =>
                  segment.type === 'responsive-images' ? (
                    <div key={`responsive-${segmentIndex}`} className="md:col-span-12">
                      <ResponsiveImageGroupField
                        values={row}
                        disabled={disabled}
                        onChange={(fieldName, val) => updateRow(index, fieldName, val)}
                      />
                    </div>
                  ) : (
                    segment.fields.map((sf) => (
                      <div key={sf.field} className={`min-w-0 ${getSubFieldColClass(sf, segment.fields.length)}`}>
                        <RepeaterSubFieldInput
                          subField={sf}
                          value={row[sf.field]}
                          disabled={disabled}
                          onChange={(val) => updateRow(index, sf.field, val)}
                        />
                      </div>
                    ))
                  ),
                )}
              </div>
            </div>
          ),
        )}
        {!disabled && (
          <button type="button" onClick={addRow} className="btn-secondary text-sm">
            <Icon name="plus" className="h-4 w-4" />
            Add item
          </button>
        )}
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">No items yet.</p>
            {!disabled && (
              <button type="button" onClick={addRow} className="btn-secondary mt-3 text-sm">
                <Icon name="plus" className="h-4 w-4" />
                Add first item
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
