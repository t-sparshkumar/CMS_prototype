import { useMemo, useState } from 'react';
import Icon from '../Icon';
import InterfacePickerIcon from './InterfacePickerIcon';
import {
  INTERFACE_CATALOG,
  INTERFACE_GROUP_ORDER,
  type InterfaceGroup,
  type InterfaceIconId,
} from '../../lib/interfaceCatalog';

interface InterfacePickerGridProps {
  onSelect: (interfaceId: string) => void;
}

function resolvePreviewIcon(id: string, icon: InterfaceIconId): InterfaceIconId {
  if (id === 'slug') return 'slug';
  return icon;
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
  const hasSearch = search.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="interface-picker-search">
        <Icon name="search" className="interface-picker-search-icon h-4 w-4" />
        <input
          type="search"
          placeholder="Search interfaces…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="interface-picker-search-input"
          aria-label="Search field interfaces"
        />
        {hasSearch && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="interface-picker-search-clear"
            aria-label="Clear search"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>

      {!hasResults && (
        <div className="interface-picker-empty">
          <p className="interface-picker-empty-title">No interfaces match your search</p>
          <p className="interface-picker-empty-hint">Try a different keyword or clear the search.</p>
        </div>
      )}

      {INTERFACE_GROUP_ORDER.map((group) => {
        const items = groups.get(group);
        if (!items?.length) return null;

        return (
          <section key={group} className="interface-picker-section">
            <div className="interface-picker-section-header">
              <h3 className="interface-picker-section-title">{group}</h3>
              <span className="interface-picker-section-count" aria-label={`${items.length} interfaces`}>
                {items.length}
              </span>
            </div>
            <div className="interface-picker-grid">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="interface-picker-card group"
                  aria-label={`${item.label}: ${item.description}`}
                >
                  <div className="interface-picker-card-preview">
                    <InterfacePickerIcon icon={resolvePreviewIcon(item.id, item.icon)} />
                  </div>
                  <div className="interface-picker-card-body">
                    <p className="interface-picker-card-label">{item.label}</p>
                    <p className="interface-picker-card-desc">{item.description}</p>
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
