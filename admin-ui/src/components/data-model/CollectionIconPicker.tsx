import { useMemo, useState } from 'react';
import CollectionMaterialIcon from '../CollectionMaterialIcon';
import {
  filterIcons,
  getIconLabel,
  ICON_CATEGORIES,
  type IconCategory,
} from '../../lib/collectionIconCatalog';

interface CollectionIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  color?: string;
  isGroup?: boolean;
}

export default function CollectionIconPicker({
  value,
  onChange,
  color = '#6366f1',
  isGroup = false,
}: CollectionIconPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<IconCategory | 'all'>('all');

  const filtered = useMemo(
    () => filterIcons(search, category === 'all' ? undefined : category),
    [search, category],
  );

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center gap-3 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand-200"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: color }}
        >
          <CollectionMaterialIcon icon={value} isGroup={isGroup} className="text-white" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-800">{getIconLabel(value)}</span>
          <span className="block text-xs font-mono text-slate-400">{value}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </button>

      {expanded && (
        <div className="rounded-xl border border-surface-border bg-surface-muted/30 p-3 space-y-3">
          <input
            type="search"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                category === 'all'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-surface text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {ICON_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  category === cat.id
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-surface text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
            {filtered.map((icon) => (
              <button
                key={icon.id}
                type="button"
                title={icon.label}
                onClick={() => {
                  onChange(icon.id);
                  setExpanded(false);
                }}
                className={`flex h-10 w-full items-center justify-center rounded-lg border transition-all ${
                  value === icon.id
                    ? 'border-brand-400 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    : 'border-surface-border bg-surface text-slate-600 hover:border-brand-200 hover:bg-white'
                }`}
              >
                <CollectionMaterialIcon icon={icon.id} size={20} />
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400">No icons match your search.</p>
          )}
        </div>
      )}
    </div>
  );
}
