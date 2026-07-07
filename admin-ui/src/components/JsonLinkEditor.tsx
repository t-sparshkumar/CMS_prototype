import { useEffect, useState } from 'react';
import Icon from './Icon';

export interface NavLink {
  label: string;
  url: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

interface JsonLinkEditorProps {
  label: string;
  value: unknown;
  onChange: (value: NavLink[]) => void;
  columns?: boolean;
}

function parseLinks(value: unknown): NavLink[] {
  if (Array.isArray(value)) {
    return value.map((item) => ({
      label: String((item as NavLink).label ?? ''),
      url: String((item as NavLink).url ?? ''),
    }));
  }
  if (typeof value === 'string') {
    try {
      return parseLinks(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function parseColumns(value: unknown): FooterColumn[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const col = item as FooterColumn;
      return {
        title: String(col.title ?? ''),
        links: parseLinks(col.links),
      };
    });
  }
  if (typeof value === 'string') {
    try {
      return parseColumns(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export function NavLinksEditor({ label, value, onChange }: JsonLinkEditorProps) {
  const [links, setLinks] = useState<NavLink[]>(() => parseLinks(value));

  useEffect(() => {
    setLinks(parseLinks(value));
  }, [value]);

  function update(next: NavLink[]) {
    setLinks(next);
    onChange(next);
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={link.label}
              placeholder="Label"
              onChange={(e) => {
                const next = [...links];
                const current = next[index] ?? { label: '', url: '' };
                next[index] = { ...current, label: e.target.value };
                update(next);
              }}
              className="input flex-1"
            />
            <input
              value={link.url}
              placeholder="URL"
              onChange={(e) => {
                const next = [...links];
                const current = next[index] ?? { label: '', url: '' };
                next[index] = { ...current, url: e.target.value };
                update(next);
              }}
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => update(links.filter((_, i) => i !== index))}
              className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => update([...links, { label: '', url: '' }])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <Icon name="plus" className="h-4 w-4" />
        Add link
      </button>
    </div>
  );
}

export function FooterColumnsEditor({ label, value, onChange }: JsonLinkEditorProps) {
  const [columns, setColumns] = useState<FooterColumn[]>(() => parseColumns(value));

  useEffect(() => {
    setColumns(parseColumns(value));
  }, [value]);

  function update(next: FooterColumn[]) {
    setColumns(next);
    onChange(next as unknown as NavLink[]);
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="space-y-3">
        {columns.map((column, colIndex) => (
          <div key={colIndex} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex gap-2 mb-3">
              <input
                value={column.title}
                placeholder="Column title"
                onChange={(e) => {
                  const next = [...columns];
                  const current = next[colIndex] ?? { title: '', links: [] };
                  next[colIndex] = { ...current, title: e.target.value };
                  update(next);
                }}
                className="input flex-1 font-semibold"
              />
              <button
                type="button"
                onClick={() => update(columns.filter((_, i) => i !== colIndex))}
                className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove column"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
            <NavLinksEditor
              label=""
              value={column.links}
              onChange={(links) => {
                const next = [...columns];
                const current = next[colIndex] ?? { title: '', links: [] };
                next[colIndex] = { ...current, links };
                update(next);
              }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => update([...columns, { title: '', links: [] }])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <Icon name="plus" className="h-4 w-4" />
        Add column
      </button>
    </div>
  );
}
