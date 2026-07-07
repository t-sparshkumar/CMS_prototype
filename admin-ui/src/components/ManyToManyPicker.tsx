import { useEffect, useState } from 'react';
import { fetchItems, type FieldMeta, type ItemRecord } from '../lib/api';

interface ManyToManyPickerProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: string[]) => void;
}

export default function ManyToManyPicker({ field, value, onChange }: ManyToManyPickerProps) {
  const relatedCollection = field.options?.related_collection as string | undefined;
  const withSort = Boolean(field.options?.with_sort);
  const selected = Array.isArray(value) ? value.map(String) : [];
  const [options, setOptions] = useState<ItemRecord[]>([]);
  const [search, setSearch] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!relatedCollection) return;

    const timer = setTimeout(() => {
      void fetchItems(relatedCollection, { limit: 50, search: search || undefined })
        .then((res) => setOptions(res.items))
        .catch(() => setOptions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [relatedCollection, search]);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= selected.length) return;
    const next = [...selected];
    const [item] = next.splice(from, 1);
    if (item) {
      next.splice(to, 0, item);
      onChange(next);
    }
  }

  function labelForId(id: string): string {
    const match = options.find((item) => String(item.id) === id);
    return match ? String(match.title ?? match.name ?? id) : `${id.slice(0, 8)}...`;
  }

  if (!relatedCollection) {
    return <p className="text-xs text-red-500">Missing related collection config</p>;
  }

  return (
    <div>
      <label className="label">{field.field}</label>
      <input
        type="search"
        placeholder={`Search ${relatedCollection}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mb-2"
      />
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map((id, index) => (
          <span
            key={id}
            draggable={withSort}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) {
                moveItem(dragIndex, index);
              }
              setDragIndex(null);
            }}
            className={`inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 px-2.5 py-1 text-xs ${
              withSort ? 'cursor-grab' : ''
            }`}
          >
            {withSort && <span className="text-brand-400">⋮⋮</span>}
            {labelForId(id)}
            {withSort && (
              <>
                <button type="button" onClick={() => moveItem(index, index - 1)} className="hover:text-brand-900">
                  ↑
                </button>
                <button type="button" onClick={() => moveItem(index, index + 1)} className="hover:text-brand-900">
                  ↓
                </button>
              </>
            )}
            <button type="button" onClick={() => toggle(id)} className="hover:text-brand-900">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="max-h-40 overflow-y-auto rounded-xl border border-surface-border divide-y divide-surface-border/60">
        {options.map((item) => {
          const id = String(item.id);
          const isSelected = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-surface-muted ${
                isSelected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'
              }`}
            >
              {String(item.title ?? item.name ?? id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
