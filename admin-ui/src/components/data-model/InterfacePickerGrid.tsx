import { useMemo, useState } from 'react';
import Icon from '../Icon';
import InterfacePickerIcon from './InterfacePickerIcon';
import {
  INTERFACE_CATALOG,
  INTERFACE_GROUP_ORDER,
  type InterfaceGroup,
} from '../../lib/interfaceCatalog';

interface InterfacePickerGridProps {
  onSelect: (interfaceId: string) => void;
}

export default function InterfacePickerGrid({ onSelect }: InterfacePickerGridProps) {
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = INTERFACE_CATALOG.filter(
      (item) =>
        !query ||
        item.label.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );

    const map = new Map<InterfaceGroup, typeof INTERFACE_CATALOG>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [search]);

  const hasResults = groups.size > 0;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search Field..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {!hasResults && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No interfaces match your search</p>
          <p className="mt-1 text-xs text-slate-500">Try a different keyword or clear the search.</p>
        </div>
      )}

      {INTERFACE_GROUP_ORDER.map((group) => {
        const items = groups.get(group);
        if (!items?.length) return null;

        return (
          <section key={group}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{group}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="card-interactive group flex flex-col overflow-hidden text-left active:scale-[0.98]"
                >
                  <div className="border-b border-surface-border bg-surface-muted/60 px-3 py-3 transition-colors group-hover:bg-brand-50/40">
                    <InterfacePickerIcon icon={item.icon} />
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                      {item.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
