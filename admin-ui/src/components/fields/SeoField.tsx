import FileUploadField from '../FileUploadField';
import { FieldLabel, inputClassName } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface SeoFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

interface SeoValue {
  title: string;
  description: string;
  og_image: unknown;
}

function parseSeo(value: unknown): SeoValue {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    return {
      title: String(v.title ?? ''),
      description: String(v.description ?? ''),
      og_image: v.og_image ?? null,
    };
  }
  return { title: '', description: '', og_image: null };
}

export default function SeoField({ field, value, onChange, disabled }: SeoFieldProps) {
  const seo = parseSeo(value);

  function patch(partial: Partial<SeoValue>) {
    onChange({ ...seo, ...partial });
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="field-seo space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Title</label>
          <input
            type="text"
            value={seo.title}
            disabled={disabled}
            maxLength={70}
            onChange={(e) => patch({ title: e.target.value })}
            className={inputClassName}
            placeholder="Page title for search engines"
          />
          <p className="text-xs text-slate-400 mt-1">{seo.title.length}/70 characters</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
          <textarea
            value={seo.description}
            disabled={disabled}
            rows={3}
            maxLength={160}
            onChange={(e) => patch({ description: e.target.value })}
            className={inputClassName}
            placeholder="Meta description"
          />
          <p className="text-xs text-slate-400 mt-1">{seo.description.length}/160 characters</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-slate-50 p-4">
          <p className="text-xs text-slate-400 mb-2">Search preview</p>
          <p className="text-brand-700 text-base font-medium truncate">{seo.title || 'Page Title'}</p>
          <p className="text-emerald-700 text-xs truncate">example.com/page-slug</p>
          <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">
            {seo.description || 'Meta description will appear here.'}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">OG Image</label>
          <FileUploadField
            label=""
            value={seo.og_image}
            onChange={(fileId) => patch({ og_image: fileId })}
            disabled={disabled}
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
}
