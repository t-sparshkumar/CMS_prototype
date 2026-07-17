import { useState } from 'react';
import ManyToManyPicker from './ManyToManyPicker';
import ManyToAnyPicker from './ManyToAnyPicker';
import PageSectionsBuilder, {
  getPageSectionAllowedCollections,
  isPageSectionsField,
} from './PageSectionsBuilder';
import OneToManyInlineEditor from './OneToManyInlineEditor';
import RelationPicker from './RelationPicker';
import FileUploadField from './FileUploadField';
import BlockEditorField from './fields/BlockEditorField';
import CheckboxesTreeField from './fields/CheckboxesTreeField';
import CodeField from './fields/CodeField';
import FieldReadonlyDisplay from './fields/FieldReadonlyDisplay';
import FilesField from './fields/FilesField';
import MarkdownField from './fields/MarkdownField';
import RepeaterField from './fields/RepeaterField';
import StructuredJsonField from './fields/StructuredJsonField';
import SeoField from './fields/SeoField';
import TagsField from './fields/TagsField';
import ToggleField from './fields/ToggleField';
import TranslationsField from './fields/TranslationsField';
import WysiwygField from './fields/WysiwygField';
import { EmptyChoicesHint, FieldLabel, inputClassName } from './fields/fieldShared';
import { resolveFieldState } from '../lib/conditions';
import { getSelectChoices, isGroupContainer, shouldUseStructuredJsonEditor, slugify } from '../lib/fieldUtils';
import { ICON_OPTIONS } from '../lib/interfaceCatalog';
import type { FieldMeta, ItemRecord } from '../lib/api';

interface InterfaceRendererProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  formData?: ItemRecord;
  disabled?: boolean;
  parentId?: string;
}

export default function InterfaceRenderer({
  field,
  value,
  onChange,
  formData = {},
  disabled = false,
  parentId,
}: InterfaceRendererProps) {
  const effective = resolveFieldState(field, formData);
  const isHidden = field.effective_hidden ?? effective.hidden;
  const isReadonly = field.effective_readonly ?? effective.readonly;
  const isRequired = field.effective_required ?? effective.required;
  const fieldForLabel = { ...field, required: isRequired };

  if (field.interface === 'divider') {
    return <hr className="border-slate-200" />;
  }

  if (field.interface === 'header') {
    return (
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-slate-900">{field.note ?? field.field}</h3>
      </div>
    );
  }

  if (field.interface === 'super-header') {
    return (
      <div className="pt-2">
        <h2 className="text-lg font-bold text-slate-900">{field.note ?? field.field}</h2>
      </div>
    );
  }

  if (field.interface === 'notice') {
    return (
      <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-brand-900">
        {field.note ?? field.field}
      </div>
    );
  }

  if (field.interface === 'presentation-buttons') {
    const labels = getSelectChoices(field).map((choice) => choice.label);
    return (
      <div className="flex flex-wrap gap-2">
        {(labels.length > 0 ? labels : ['Action']).map((label) => (
          <span
            key={label}
            className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (field.interface === 'presentation-m2a') {
    return (
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-3 text-sm text-brand-700">
        {field.note ?? 'Builder (M2A) block'}
      </div>
    );
  }

  if (isGroupContainer(field)) {
    return null;
  }

  if (isHidden || field.is_system) {
    return null;
  }

  const inputDisabled = disabled || isReadonly;

  if (isReadonly) {
    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <div className="field-readonly-box">
          <FieldReadonlyDisplay field={field} value={value} />
        </div>
      </div>
    );
  }

  if (
    field.interface === 'many-to-one' ||
    field.interface === 'collection-item-dropdown' ||
    field.interface.endsWith('-m2o') ||
    field.special === 'm2o'
  ) {
    return <RelationPicker field={fieldForLabel} value={value} onChange={onChange} />;
  }

  if (field.interface === 'many-to-many' || field.interface === 'collection-item-multiple-dropdown') {
    return <ManyToManyPicker field={fieldForLabel} value={value} onChange={onChange} />;
  }

  if (field.interface === 'many-to-any') {
    if (isPageSectionsField(field)) {
      return (
        <PageSectionsBuilder
          value={value}
          onChange={onChange}
          allowedCollections={getPageSectionAllowedCollections(field)}
        />
      );
    }
    return <ManyToAnyPicker field={fieldForLabel} value={value} onChange={onChange} />;
  }

  if (field.interface === 'translations') {
    return (
      <TranslationsField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />
    );
  }

  if (field.interface === 'one-to-many' || field.interface === 'tree-view') {
    return (
      <OneToManyInlineEditor
        field={field}
        parentId={parentId ?? (formData.id ? String(formData.id) : undefined)}
        disabled={inputDisabled}
      />
    );
  }

  if (field.interface === 'file' || field.interface === 'file-image' || field.interface.startsWith('file-')) {
    return (
      <FileUploadField
        field={fieldForLabel}
        value={value}
        onChange={onChange}
        disabled={inputDisabled}
        accept={field.interface === 'file-image' ? 'image/*' : undefined}
      />
    );
  }

  if (field.interface === 'files') {
    return <FilesField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'toggle' || (field.type === 'boolean' && field.interface !== 'checkboxes')) {
    return (
      <ToggleField
        field={fieldForLabel}
        value={value}
        onChange={onChange}
        disabled={inputDisabled}
        required={isRequired}
      />
    );
  }

  if (field.interface === 'wysiwyg') {
    return <WysiwygField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'markdown') {
    return <MarkdownField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'repeater') {
    return <RepeaterField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'block-editor') {
    return <BlockEditorField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'seo') {
    return <SeoField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'code' || field.interface === 'input-code') {
    const language = typeof field.options?.language === 'string' ? field.options.language : '';
    if (language === 'json' || field.type === 'json') {
      if (shouldUseStructuredJsonEditor(field, value)) {
        return (
          <StructuredJsonField
            field={fieldForLabel}
            value={value}
            onChange={onChange}
            disabled={inputDisabled}
          />
        );
      }
    }
    return <CodeField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'tags') {
    return <TagsField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />;
  }

  if (field.interface === 'checkboxes-tree') {
    return (
      <CheckboxesTreeField field={fieldForLabel} value={value} onChange={onChange} disabled={inputDisabled} />
    );
  }

  if (field.interface === 'select-dropdown' || field.interface === 'radio-buttons' || field.interface === 'icon') {
    const choices =
      field.interface === 'icon'
        ? ICON_OPTIONS.map((icon) => ({ value: icon, label: icon }))
        : getSelectChoices(field);

    if (choices.length === 0) {
      return (
        <div>
          <FieldLabel field={fieldForLabel} />
          <EmptyChoicesHint fieldName={field.field} />
        </div>
      );
    }

    if (field.interface === 'radio-buttons') {
      return (
        <div>
          <FieldLabel field={fieldForLabel} />
          <div className="space-y-2">
            {choices.map((choice) => (
              <label key={choice.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name={field.field}
                  value={choice.value}
                  checked={String(value ?? '') === choice.value}
                  disabled={inputDisabled}
                  onChange={() => onChange(choice.value)}
                />
                {choice.label}
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <select
          value={String(value ?? '')}
          disabled={inputDisabled}
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

  if (field.interface === 'color') {
    const colorValue = typeof value === 'string' && value ? value : '#000000';
    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorValue}
            disabled={inputDisabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 rounded border border-slate-300"
          />
          <input
            type="text"
            value={colorValue}
            disabled={inputDisabled}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClassName} font-mono`}
          />
          <span className="field-color-swatch shrink-0" style={{ backgroundColor: colorValue }} />
        </div>
      </div>
    );
  }

  if (field.interface === 'slug') {
    const sourceField =
      typeof field.options?.source_field === 'string' ? field.options.source_field : 'title';

    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <div className="flex gap-2">
          <input
            type="text"
            value={String(value ?? '')}
            disabled={inputDisabled}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClassName} font-mono`}
          />
          <button
            type="button"
            disabled={inputDisabled}
            onClick={() => {
              const source = formData[sourceField];
              if (typeof source === 'string' && source) {
                onChange(slugify(source));
              }
            }}
            className="btn-secondary shrink-0 text-xs py-2"
          >
            Generate
          </button>
        </div>
      </div>
    );
  }

  if (field.interface === 'map') {
    const coords =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    const lat = coords.lat ?? coords.latitude ?? '';
    const lng = coords.lng ?? coords.longitude ?? '';

    function updateCoord(key: 'lat' | 'lng', next: string) {
      const parsed = next === '' ? null : Number(next);
      onChange({
        lat: key === 'lat' ? parsed : lat === '' ? null : Number(lat),
        lng: key === 'lng' ? parsed : lng === '' ? null : Number(lng),
      });
    }

    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={lat === null ? '' : String(lat)}
            disabled={inputDisabled}
            onChange={(e) => updateCoord('lat', e.target.value)}
            className={inputClassName}
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={lng === null ? '' : String(lng)}
            disabled={inputDisabled}
            onChange={(e) => updateCoord('lng', e.target.value)}
            className={inputClassName}
          />
        </div>
        {lat !== '' && lng !== '' && (
          <p className="text-xs text-slate-400 mt-2 font-mono">
            {String(lat)}, {String(lng)}
          </p>
        )}
      </div>
    );
  }

  if (field.interface === 'json' || field.type === 'json') {
    if (shouldUseStructuredJsonEditor(field, value)) {
      return (
        <StructuredJsonField
          field={fieldForLabel}
          value={value}
          onChange={onChange}
          disabled={inputDisabled}
        />
      );
    }
    return (
      <JsonField
        field={fieldForLabel}
        value={value}
        onChange={onChange}
        disabled={inputDisabled}
      />
    );
  }

  if (field.interface === 'textarea' || field.type === 'text') {
    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <textarea
          value={String(value ?? '')}
          disabled={inputDisabled}
          rows={field.type === 'text' ? 8 : 4}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
      </div>
    );
  }

  if (field.interface === 'datetime' || field.type === 'datetime') {
    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <input
          type="datetime-local"
          value={String(value ?? '').slice(0, 16)}
          disabled={inputDisabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
      </div>
    );
  }

  if (field.interface === 'checkboxes' || field.interface === 'select-multiple-dropdown') {
    const choices = getSelectChoices(field);
    const selected = Array.isArray(value) ? value.map(String) : [];

    if (choices.length === 0) {
      return (
        <div>
          <FieldLabel field={fieldForLabel} />
          <EmptyChoicesHint fieldName={field.field} />
        </div>
      );
    }

    if (field.interface === 'select-multiple-dropdown') {
      return (
        <div>
          <FieldLabel field={fieldForLabel} />
          <select
            multiple
            value={selected}
            disabled={inputDisabled}
            onChange={(e) => {
              onChange(Array.from(e.target.selectedOptions).map((option) => option.value));
            }}
            className={`${inputClassName} min-h-[6rem]`}
          >
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
        <FieldLabel field={fieldForLabel} />
        <div className="space-y-2">
          {choices.map((choice) => (
            <label key={choice.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(choice.value)}
                disabled={inputDisabled}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, choice.value]
                    : selected.filter((item) => item !== choice.value);
                  onChange(next);
                }}
                className="rounded border-slate-300"
              />
              {choice.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.interface === 'hash') {
    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <input
          type="password"
          value={String(value ?? '')}
          disabled={inputDisabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
          autoComplete="new-password"
        />
      </div>
    );
  }

  if (field.interface === 'slider') {
    const min = typeof field.validation?.min === 'number' ? field.validation.min : 0;
    const max = typeof field.validation?.max === 'number' ? field.validation.max : 100;
    const numericValue = typeof value === 'number' ? value : Number(value ?? min);

    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            value={Number.isFinite(numericValue) ? numericValue : min}
            disabled={inputDisabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-brand-600"
          />
          <span className="w-10 text-right text-sm font-medium text-slate-700">{numericValue}</span>
        </div>
      </div>
    );
  }

  if (field.interface === 'autocomplete') {
    const suggestions = getSelectChoices(field).map((choice) => choice.value);
    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <input
          type="text"
          list={`${field.field}-suggestions`}
          value={String(value ?? '')}
          disabled={inputDisabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
        {suggestions.length > 0 && (
          <datalist id={`${field.field}-suggestions`}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        )}
      </div>
    );
  }

  if (field.interface === 'number' || field.type === 'integer' || field.type === 'bigInteger') {
    return (
      <div>
        <FieldLabel field={fieldForLabel} />
        <input
          type="number"
          step={field.type === 'integer' || field.type === 'bigInteger' ? 1 : 'any'}
          value={value === null || value === undefined ? '' : String(value)}
          disabled={inputDisabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={inputClassName}
        />
      </div>
    );
  }

  const inputType =
    field.type === 'float' || field.type === 'decimal'
      ? 'number'
      : field.type === 'date'
        ? 'date'
        : 'text';

  return (
    <div>
      <FieldLabel field={fieldForLabel} />
      <input
        type={inputType}
        step={field.type === 'float' || field.type === 'decimal' ? 'any' : undefined}
        value={String(value ?? '')}
        disabled={inputDisabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

function JsonField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const textValue =
    typeof value === 'string'
      ? value
      : value === undefined || value === null
        ? ''
        : JSON.stringify(value, null, 2);
  const [jsonError, setJsonError] = useState<string | null>(null);

  return (
    <div>
      <FieldLabel field={field} />
      <textarea
        value={textValue}
        disabled={disabled}
        rows={6}
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
        className={`${inputClassName} font-mono text-xs`}
      />
      {jsonError && <p className="mt-1 text-xs text-red-600">{jsonError}</p>}
    </div>
  );
}
