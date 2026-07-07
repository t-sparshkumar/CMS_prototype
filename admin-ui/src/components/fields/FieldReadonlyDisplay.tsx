import { getAssetUrl } from '../../lib/api';
import { asStringArray, getSelectChoices, markdownToHtml, stringifyJsonValue } from '../../lib/fieldUtils';
import type { FieldMeta } from '../../lib/api';

interface FieldReadonlyDisplayProps {
  field: FieldMeta;
  value: unknown;
}

export default function FieldReadonlyDisplay({ field, value }: FieldReadonlyDisplayProps) {
  const display = field.display || 'raw';
  const empty = value === null || value === undefined || value === '';

  if (empty) {
    return <span className="field-readonly-empty">—</span>;
  }

  if (display === 'boolean' || field.interface === 'toggle' || field.type === 'boolean') {
    return (
      <span className={`field-badge ${value ? 'field-badge-yes' : 'field-badge-no'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (display === 'color' || field.interface === 'color') {
    const color = String(value);
    return (
      <span className="inline-flex items-center gap-2">
        <span className="field-color-swatch" style={{ backgroundColor: color }} />
        <span className="font-mono text-sm">{color}</span>
      </span>
    );
  }

  if (display === 'image' || field.interface === 'file-image') {
    const fileId = String(value);
    return (
      <img
        src={getAssetUrl(fileId, { width: 160, height: 100, fit: 'cover', format: 'webp' })}
        alt={field.field}
        className="field-readonly-image"
      />
    );
  }

  if (display === 'file' || field.interface === 'file') {
    const fileId = String(value);
    return (
      <a
        href={getAssetUrl(fileId)}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-brand-600 hover:underline font-mono"
      >
        {fileId.slice(0, 8)}…
      </a>
    );
  }

  if (display === 'labels' || ['select-dropdown', 'radio-buttons', 'icon'].includes(field.interface)) {
    const choices = getSelectChoices(field);
    const match = choices.find((c) => c.value === String(value));
    return <span className="text-sm text-slate-700">{match?.label ?? String(value)}</span>;
  }

  if (display === 'datetime' || field.interface === 'datetime' || field.type === 'datetime') {
    try {
      const d = new Date(String(value));
      return <span className="text-sm text-slate-700">{d.toLocaleString()}</span>;
    } catch {
      return <span className="text-sm text-slate-700">{String(value)}</span>;
    }
  }

  if (field.interface === 'tags' || field.type === 'csv') {
    const tags = asStringArray(value);
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="field-tag-chip">
            {tag}
          </span>
        ))}
      </div>
    );
  }

  if (field.interface === 'checkboxes' || field.interface === 'select-multiple-dropdown') {
    const selected = asStringArray(value);
    const choices = getSelectChoices(field);
    return (
      <div className="flex flex-wrap gap-1.5">
        {selected.map((val) => {
          const label = choices.find((c) => c.value === val)?.label ?? val;
          return (
            <span key={val} className="field-tag-chip">
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (field.interface === 'markdown') {
    return (
      <div
        className="field-markdown-preview text-sm text-slate-700"
        dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${markdownToHtml(String(value))}</p>` }}
      />
    );
  }

  if (field.interface === 'wysiwyg') {
    return (
      <div
        className="field-wysiwyg-preview text-sm text-slate-700"
        dangerouslySetInnerHTML={{ __html: String(value) }}
      />
    );
  }

  if (field.interface === 'seo' && typeof value === 'object' && value !== null) {
    const seo = value as Record<string, unknown>;
    return (
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-slate-900">{String(seo.title ?? '')}</p>
        <p className="text-slate-500">{String(seo.description ?? '')}</p>
      </div>
    );
  }

  if (field.interface === 'map' && typeof value === 'object' && value !== null) {
    const coords = value as Record<string, unknown>;
    return (
      <span className="text-sm font-mono text-slate-600">
        {String(coords.lat ?? coords.latitude ?? '—')}, {String(coords.lng ?? coords.longitude ?? '—')}
      </span>
    );
  }

  if (field.interface === 'json' || field.type === 'json' || field.interface === 'repeater' || field.interface === 'block-editor') {
    return (
      <pre className="field-readonly-code">{stringifyJsonValue(value)}</pre>
    );
  }

  if (field.interface === 'hash') {
    return <span className="font-mono text-slate-400 tracking-widest">••••••••</span>;
  }

  if (field.interface === 'slider' || field.interface === 'number') {
    return <span className="text-sm font-medium text-slate-700">{String(value)}</span>;
  }

  if (field.interface === 'files' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((id) => (
          <img
            key={String(id)}
            src={getAssetUrl(String(id), { width: 80, height: 60, fit: 'cover', format: 'webp' })}
            alt=""
            className="h-14 w-20 rounded-lg border border-slate-200 object-cover"
          />
        ))}
      </div>
    );
  }

  return <span className="text-sm text-slate-700 break-words">{String(value)}</span>;
}
