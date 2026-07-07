import { useState } from 'react';
import { ICON_OPTIONS } from '../../lib/interfaceCatalog';

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const filtered = ICON_OPTIONS.filter((icon) => icon.includes(search.toLowerCase()));

  return (
    <div className="space-y-2">
      <input
        type="search"
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input"
      />
      <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto rounded-xl border border-surface-border bg-surface-muted/30 p-2">
        {filtered.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={`rounded-lg border px-2 py-1.5 text-[10px] font-mono transition-all ${
              value === icon
                ? 'border-brand-400 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                : 'border-surface-border bg-surface text-slate-600 hover:border-brand-200'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
