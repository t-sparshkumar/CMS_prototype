import { useEffect, useState } from 'react';
import { fetchCollection, fetchItems, type FieldMeta, type ItemRecord } from '../lib/api';
import { formatDisplayTemplate } from '../lib/displayTemplate';

export interface M2aItemRef {
  collection: string;
  item: string;
  sort?: number;
}

interface ManyToAnyPickerProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: M2aItemRef[]) => void;
}

export default function ManyToAnyPicker({ field, value, onChange }: ManyToAnyPickerProps) {
  const allowedRaw = field.options?.allowed_collections;
  const allowed = Array.isArray(allowedRaw)
    ? allowedRaw.map(String)
    : typeof allowedRaw === 'string'
      ? allowedRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const selected: M2aItemRef[] = Array.isArray(value)
    ? value.filter(
        (entry): entry is M2aItemRef =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as M2aItemRef).collection === 'string' &&
          typeof (entry as M2aItemRef).item === 'string',
      )
    : [];

  const [targetCollection, setTargetCollection] = useState(allowed[0] ?? '');
  const [options, setOptions] = useState<ItemRecord[]>([]);
  const [search, setSearch] = useState('');
  const [displayTemplate, setDisplayTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!targetCollection) return;
    void fetchCollection(targetCollection).then((c) => setDisplayTemplate(c.display_template));
  }, [targetCollection]);

  useEffect(() => {
    if (!targetCollection) return;
    const timer = setTimeout(() => {
      void fetchItems(targetCollection, { limit: 25, search: search || undefined })
        .then((res) => setOptions(res.items))
        .catch(() => setOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [targetCollection, search]);

  function addItem(itemId: string) {
    if (!targetCollection || !itemId) return;
    if (selected.some((s) => s.collection === targetCollection && s.item === itemId)) return;
    onChange([...selected, { collection: targetCollection, item: itemId, sort: selected.length + 1 }]);
  }

  function removeAt(index: number) {
    onChange(selected.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <label className="label">{field.field}</label>
      <div className="flex flex-wrap gap-2">
        {selected.map((ref, index) => (
          <span
            key={`${ref.collection}:${ref.item}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 px-2.5 py-1 text-xs"
          >
            {ref.collection}:{ref.item.slice(0, 8)}
            <button type="button" onClick={() => removeAt(index)} className="text-brand-500 hover:text-red-600">
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <select value={targetCollection} onChange={(e) => setTargetCollection(e.target.value)} className="select">
          <option value="">Select collection...</option>
          {(allowed.length > 0 ? allowed : []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="input"
          disabled={!targetCollection}
        />
      </div>

      {allowed.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Configure allowed collections on this field in the Data Model to enable picking items.
        </p>
      )}

      {targetCollection && (
        <select
          defaultValue=""
          onChange={(e) => {
            addItem(e.target.value);
            e.target.value = '';
          }}
          className="select"
        >
          <option value="">Add item from {targetCollection}...</option>
          {options.map((item) => (
            <option key={String(item.id)} value={String(item.id)}>
              {formatDisplayTemplate(displayTemplate, item)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
