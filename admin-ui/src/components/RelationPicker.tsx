import { useEffect, useState } from 'react';
import { fetchCollection, fetchItems, type FieldMeta, type ItemRecord } from '../lib/api';
import { formatDisplayTemplate } from '../lib/displayTemplate';

interface RelationPickerProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: string | null) => void;
}

export default function RelationPicker({ field, value, onChange }: RelationPickerProps) {
  const relatedCollection = field.options?.related_collection as string | undefined;
  const [options, setOptions] = useState<ItemRecord[]>([]);
  const [displayTemplate, setDisplayTemplate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!relatedCollection) return;
    const fieldTemplate = field.options?.template as string | undefined;
    if (fieldTemplate) {
      setDisplayTemplate(fieldTemplate);
      return;
    }
    void fetchCollection(relatedCollection).then((c) => setDisplayTemplate(c.display_template));
  }, [relatedCollection, field.options?.template]);

  useEffect(() => {
    if (!relatedCollection) return;

    const timer = setTimeout(() => {
      setIsLoading(true);
      void fetchItems(relatedCollection, { limit: 25, search: search || undefined })
        .then((res) => setOptions(res.items))
        .catch(() => setOptions([]))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [relatedCollection, search]);

  if (!relatedCollection) {
    return <p className="text-xs text-red-500">Missing related collection config</p>;
  }

  return (
    <div>
      <label className="label">
        {field.field}
        {field.required && <span className="text-red-500 normal-case tracking-normal"> *</span>}
      </label>
      <input
        type="search"
        placeholder={`Search ${relatedCollection}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mb-2"
      />
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="select"
      >
        <option value="">{isLoading ? 'Loading...' : 'Select item...'}</option>
        {options.map((item) => (
          <option key={String(item.id)} value={String(item.id)}>
            {formatDisplayTemplate(displayTemplate, item)}
          </option>
        ))}
      </select>
    </div>
  );
}
