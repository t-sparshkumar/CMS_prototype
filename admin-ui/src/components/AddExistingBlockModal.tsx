import { useEffect, useMemo, useState } from 'react';
import { fetchCollection, fetchItems, type CollectionMeta, type ItemRecord } from '../lib/api';
import { getCollectionDisplayName } from '../lib/collectionDisplay';
import { formatDisplayTemplate } from '../lib/displayTemplate';
import Icon from './Icon';
import Modal from './Modal';

export interface PageSectionRef {
  collection: string;
  item: string;
  sort?: number;
  data?: ItemRecord;
}

/** @deprecated Use getCollectionDisplayName with collection meta instead */
export const BLOCK_COLLECTION_LABELS: Record<string, string> = {
  site_header: 'Site Header',
  site_footer: 'Site Footer',
  hero_banners: 'Hero Banner',
  hero_carousels: 'Hero Carousel',
  service_tiles: 'Service Tiles',
  promo_grids: 'Promo Grid',
  paragraphs: 'Paragraph',
  info_boxes: 'Info Box',
};

function getBlockCollectionLabel(name: string, metaByCollection: Record<string, CollectionMeta>): string {
  const meta = metaByCollection[name];
  if (meta) {
    return getCollectionDisplayName(meta);
  }
  return BLOCK_COLLECTION_LABELS[name] ?? name;
}

interface AddExistingBlockModalProps {
  open: boolean;
  allowedCollections: string[];
  selectedRefs: PageSectionRef[];
  onClose: () => void;
  onSelect: (ref: PageSectionRef) => void;
}

export default function AddExistingBlockModal({
  open,
  allowedCollections,
  selectedRefs,
  onClose,
  onSelect,
}: AddExistingBlockModalProps) {
  const [activeCollection, setActiveCollection] = useState(allowedCollections[0] ?? '');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [collectionMeta, setCollectionMeta] = useState<Record<string, CollectionMeta>>({});
  const [isLoading, setIsLoading] = useState(false);

  const displayTemplate = collectionMeta[activeCollection]?.display_template ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveCollection((current) => current || allowedCollections[0] || '');
    setSearch('');
  }, [open, allowedCollections]);

  useEffect(() => {
    if (!open || allowedCollections.length === 0) {
      return;
    }

    void Promise.all(allowedCollections.map((name) => fetchCollection(name))).then((metas) => {
      setCollectionMeta(Object.fromEntries(metas.map((meta) => [meta.collection, meta])));
    });
  }, [open, allowedCollections]);

  useEffect(() => {
    if (!open || !activeCollection) return;

    const timer = setTimeout(() => {
      setIsLoading(true);
      void fetchItems(activeCollection, { limit: 50, search: search || undefined })
        .then((res) => setItems(res.items))
        .catch(() => setItems([]))
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [open, activeCollection, search]);

  const activeLabel = useMemo(
    () => getBlockCollectionLabel(activeCollection, collectionMeta),
    [activeCollection, collectionMeta],
  );

  function isAlreadySelected(collection: string, itemId: string): boolean {
    return selectedRefs.some((ref) => ref.collection === collection && ref.item === itemId);
  }

  function handleSelect(item: ItemRecord) {
    const itemId = String(item.id);
    if (isAlreadySelected(activeCollection, itemId)) {
      return;
    }
    onSelect({
      collection: activeCollection,
      item: itemId,
      sort: selectedRefs.length + 1,
      data: item,
    });
    onClose();
  }

  return (
    <Modal open={open} title="Add Existing Block" onClose={onClose} size="xl">
      <div className="flex flex-col gap-4 -mt-1">
        <div className="flex flex-wrap gap-2">
          {allowedCollections.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setActiveCollection(name);
                setSearch('');
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeCollection === name
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {getBlockCollectionLabel(name, collectionMeta)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeLabel}...`}
            className="input pl-9"
          />
        </div>

        <div className="max-h-[min(50vh,420px)] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Loading blocks...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              No blocks found. Create one in Content first.
            </p>
          ) : (
            items.map((item) => {
              const itemId = String(item.id);
              const selected = isAlreadySelected(activeCollection, itemId);
              const label = formatDisplayTemplate(displayTemplate, item);
              const status = String(item.status ?? 'draft');
              const updated = item.date_updated ? new Date(String(item.date_updated)).toLocaleDateString() : '';

              return (
                <button
                  key={itemId}
                  type="button"
                  disabled={selected}
                  onClick={() => handleSelect(item)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selected ? 'cursor-not-allowed bg-slate-50 opacity-60' : 'hover:bg-brand-50/50'
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      status === 'published' ? 'bg-brand-500' : 'bg-amber-400'
                    }`}
                    title={status}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{label}</span>
                    {updated && <span className="block text-xs text-slate-400">Updated {updated}</span>}
                  </span>
                  {selected ? (
                    <span className="text-xs font-medium text-slate-400">Added</span>
                  ) : (
                    <Icon name="plus" className="h-4 w-4 shrink-0 text-brand-600" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
