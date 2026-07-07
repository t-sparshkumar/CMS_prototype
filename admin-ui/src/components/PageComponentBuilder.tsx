import { useState } from 'react';
import FileUploadField from './FileUploadField';
import Icon from './Icon';
import { getAssetUrl, type ItemRecord } from '../lib/api';

export interface ComponentSchemaField {
  field: string;
  type: string;
  label?: string;
  required?: boolean;
}

export interface PageComponentInstance {
  id: string;
  component_id: string;
  component_name: string;
  component_slug: string;
  component_type: string;
  fields: Record<string, unknown>;
}

function parseSchema(raw: unknown): ComponentSchemaField[] {
  if (Array.isArray(raw)) {
    return raw as ComponentSchemaField[];
  }
  if (typeof raw === 'string') {
    try {
      return parseSchema(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

function defaultSchema(type: string): ComponentSchemaField[] {
  switch (type) {
    case 'hero':
      return [
        { field: 'headline', type: 'string', label: 'Headline', required: true },
        { field: 'subheadline', type: 'text', label: 'Subheadline' },
        { field: 'image', type: 'file', label: 'Background Image' },
        { field: 'cta_label', type: 'string', label: 'CTA Label' },
        { field: 'cta_url', type: 'string', label: 'CTA URL' },
      ];
    case 'banner':
      return [
        { field: 'title', type: 'string', label: 'Title', required: true },
        { field: 'message', type: 'text', label: 'Message' },
      ];
    case 'cards':
      return [
        { field: 'section_title', type: 'string', label: 'Section Title' },
        { field: 'cards', type: 'text', label: 'Cards JSON' },
      ];
    default:
      return [
        { field: 'title', type: 'string', label: 'Title' },
        { field: 'body', type: 'text', label: 'Body' },
      ];
  }
}

export function parsePageComponents(value: unknown): PageComponentInstance[] {
  if (Array.isArray(value)) {
    return value as PageComponentInstance[];
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      return parsePageComponents(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

interface PageComponentBuilderProps {
  value: unknown;
  onChange: (value: PageComponentInstance[]) => void;
  availableComponents: ItemRecord[];
}

function SchemaFieldInput({
  schemaField,
  value,
  onChange,
}: {
  schemaField: ComponentSchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = schemaField.label ?? schemaField.field;

  if (schemaField.type === 'file') {
    return (
      <FileUploadField label={label} required={schemaField.required} value={value} onChange={onChange} />
    );
  }

  if (schemaField.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        {label}
      </label>
    );
  }

  if (schemaField.type === 'text') {
    return (
      <div>
        <label className="label">{label}</label>
        <textarea
          rows={3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="input"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="label">
        {label}
        {schemaField.required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={schemaField.type === 'number' ? 'number' : 'text'}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) =>
          onChange(schemaField.type === 'number' ? Number(e.target.value) : e.target.value)
        }
        className="input"
      />
    </div>
  );
}

export default function PageComponentBuilder({
  value,
  onChange,
  availableComponents,
}: PageComponentBuilderProps) {
  const instances = parsePageComponents(value);
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function updateInstances(next: PageComponentInstance[]) {
    onChange(next);
  }

  function addComponent(component: ItemRecord) {
    const schema = parseSchema(component.schema);
    const type = String(component.component_type ?? 'custom');
    const fieldsDef = schema.length > 0 ? schema : defaultSchema(type);
    const initialFields: Record<string, unknown> = {};
    for (const f of fieldsDef) {
      initialFields[f.field] = f.type === 'boolean' ? false : '';
    }

    const instance: PageComponentInstance = {
      id: crypto.randomUUID(),
      component_id: String(component.id),
      component_name: String(component.name ?? 'Component'),
      component_slug: String(component.slug ?? ''),
      component_type: type,
      fields: initialFields,
    };

    updateInstances([...instances, instance]);
    setExpandedId(instance.id);
    setShowPicker(false);
  }

  function moveInstance(index: number, direction: -1 | 1) {
    const next = [...instances];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    updateInstances(next);
  }

  function updateInstanceFields(id: string, fields: Record<string, unknown>) {
    updateInstances(instances.map((i) => (i.id === id ? { ...i, fields } : i)));
  }

  function removeInstance(id: string) {
    updateInstances(instances.filter((i) => i.id !== id));
  }

  function getSchemaForInstance(instance: PageComponentInstance): ComponentSchemaField[] {
    const source = availableComponents.find((c) => String(c.id) === instance.component_id);
    const schema = parseSchema(source?.schema);
    return schema.length > 0 ? schema : defaultSchema(instance.component_type);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
            <Icon name="component" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Page Components</h2>
            <p className="text-xs text-slate-400">{instances.length} on this page</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowPicker(true)} className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Add Component
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <span className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Icon name="component" className="h-6 w-6" />
          </span>
          <p className="text-sm text-slate-500">No components on this page yet.</p>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Add your first component
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((instance, index) => {
            const schema = getSchemaForInstance(instance);
            const isExpanded = expandedId === instance.id;
            const previewImage = availableComponents.find((c) => String(c.id) === instance.component_id)
              ?.preview_image as string | undefined;

            return (
              <div
                key={instance.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-card"
              >
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/60">
                  <span className="flex flex-col text-slate-300">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveInstance(index, -1)}
                      className="hover:text-slate-600 disabled:opacity-30 -mb-1"
                      title="Move up"
                    >
                      <Icon name="arrow-up" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === instances.length - 1}
                      onClick={() => moveInstance(index, 1)}
                      className="hover:text-slate-600 disabled:opacity-30 -mt-1"
                      title="Move down"
                    >
                      <Icon name="arrow-down" className="h-4 w-4" />
                    </button>
                  </span>
                  {previewImage ? (
                    <img
                      src={getAssetUrl(previewImage, { width: 48, height: 48, fit: 'cover', format: 'webp' })}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                      <Icon name="component" className="h-5 w-5" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{instance.component_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{instance.component_type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : instance.id)}
                      className="px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg"
                    >
                      {isExpanded ? 'Collapse' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInstance(instance.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remove"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-slate-100">
                    {schema.map((schemaField) => (
                      <SchemaFieldInput
                        key={schemaField.field}
                        schemaField={schemaField}
                        value={instance.fields[schemaField.field]}
                        onChange={(v) =>
                          updateInstanceFields(instance.id, {
                            ...instance.fields,
                            [schemaField.field]: v,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-elevated w-full max-w-3xl max-h-[80vh] overflow-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Component</h3>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
            {availableComponents.length === 0 ? (
              <p className="text-sm text-slate-500">
                No components in library.{' '}
                <a href="/content/site_components/new" className="text-brand-600 font-medium">
                  Create one first
                </a>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableComponents.map((component) => (
                  <button
                    key={String(component.id)}
                    type="button"
                    onClick={() => addComponent(component)}
                    className="text-left rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-9 w-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 group-hover:bg-violet-200">
                        <Icon name="component" className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{String(component.name)}</p>
                        <p className="text-xs text-slate-400 capitalize">
                          {String(component.component_type ?? 'custom')}
                          {component.category ? ` · ${String(component.category)}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
