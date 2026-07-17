import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCollection,
  fetchItem,
  type CollectionMeta,
  type FieldMeta,
  type ItemRecord,
} from '../lib/api';
import { getCollectionDisplayName } from '../lib/collectionDisplay';
import { formatDisplayTemplate } from '../lib/displayTemplate';
import AddExistingBlockModal, {
  BLOCK_COLLECTION_LABELS,
  type PageSectionRef,
} from './AddExistingBlockModal';
import Icon from './Icon';

export type { PageSectionRef };
export { BLOCK_COLLECTION_LABELS };

export const PAGE_SECTION_COLLECTIONS = [
  'site_header',
  'site_footer',
  'hero_banners',
  'hero_carousels',
  'service_tiles',
  'promo_grids',
  'paragraphs',
  'info_boxes',
] as const;

export function getPageSectionAllowedCollections(field?: Pick<FieldMeta, 'options'>): string[] {
  const allowedRaw = field?.options?.allowed_collections;
  if (Array.isArray(allowedRaw)) {
    return allowedRaw.map(String);
  }
  if (typeof allowedRaw === 'string') {
    return allowedRaw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [...PAGE_SECTION_COLLECTIONS];
}

export function isPageSectionsField(field: Pick<FieldMeta, 'collection' | 'field' | 'interface'>): boolean {
  return field.collection === 'pages' && field.field === 'sections' && field.interface === 'many-to-any';
}

export function parsePageSections(value: unknown): PageSectionRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is PageSectionRef =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as PageSectionRef).collection === 'string' &&
        typeof (entry as PageSectionRef).item === 'string',
    )
    .map((ref, index) => ({
      collection: ref.collection,
      item: ref.item,
      sort: ref.sort ?? index + 1,
      ...(ref.data ? { data: ref.data } : {}),
    }));
}

interface PageSectionsBuilderProps {
  value: unknown;
  onChange: (value: PageSectionRef[]) => void;
  allowedCollections: string[];
}

function SectionGripIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M4 9h16M4 15h16" />
    </svg>
  );
}

function sectionLabel(
  ref: PageSectionRef,
  template: string | null | undefined,
  collectionLabel: string,
  cached?: ItemRecord,
): string {
  const item = ref.data ?? cached;
  if (item) {
    return formatDisplayTemplate(template, item);
  }
  return `${collectionLabel} (${ref.item.slice(0, 8)})`;
}

function getTypeLabel(collection: string, metaByCollection: Record<string, CollectionMeta>): string {
  const meta = metaByCollection[collection];
  if (meta) {
    return getCollectionDisplayName(meta);
  }
  return BLOCK_COLLECTION_LABELS[collection] ?? collection;
}

function getItemStatus(item?: ItemRecord): string | null {
  if (!item || item.status === undefined || item.status === null) {
    return null;
  }
  return String(item.status);
}

export default function PageSectionsBuilder({
  value,
  onChange,
  allowedCollections,
}: PageSectionsBuilderProps) {
  const sections = parsePageSections(value);
  const [showModal, setShowModal] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [collectionMeta, setCollectionMeta] = useState<Record<string, CollectionMeta>>({});
  const [itemCache, setItemCache] = useState<Record<string, ItemRecord>>({});

  const sectionKeys = useMemo(
    () => sections.map((ref) => `${ref.collection}:${ref.item}`).join('|'),
    [sections],
  );

  useEffect(() => {
    void Promise.all(
      allowedCollections.map(async (collection) => {
        const meta = await fetchCollection(collection);
        return [collection, meta] as const;
      }),
    ).then((entries) => {
      setCollectionMeta(Object.fromEntries(entries));
    });
  }, [allowedCollections]);

  useEffect(() => {
    for (const ref of sections) {
      const key = `${ref.collection}:${ref.item}`;
      if (ref.data || itemCache[key]) {
        continue;
      }
      void fetchItem(ref.collection, ref.item)
        .then((item) => {
          setItemCache((prev) => (prev[key] ? prev : { ...prev, [key]: item }));
        })
        .catch(() => undefined);
    }
  }, [sectionKeys, sections]);

  function updateSections(next: PageSectionRef[]) {
    onChange(
      next.map((ref, index) => ({
        collection: ref.collection,
        item: ref.item,
        sort: index + 1,
      })),
    );
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }

    const next = [...sections];
    const [moved] = next.splice(dragIndex, 1);
    if (!moved) {
      setDragIndex(null);
      return;
    }
    next.splice(targetIndex, 0, moved);
    updateSections(next);
    setDragIndex(null);
  }

  function removeSection(index: number) {
    updateSections(sections.filter((_, i) => i !== index));
  }

  function appendSection(ref: PageSectionRef) {
    updateSections([...sections, ref]);
  }

  return (
    <div>
      <h2 className="form-section-title !border-0 !pb-0 !mb-4">Sections</h2>

      {sections.length > 0 && (
        <div className="section-list">
          <ul>
            {sections.map((ref, index) => {
              const meta = collectionMeta[ref.collection];
              const template = meta?.display_template;
              const typeLabel = getTypeLabel(ref.collection, collectionMeta);
              const cachedItem = itemCache[`${ref.collection}:${ref.item}`];
              const label = sectionLabel(ref, template, typeLabel, cachedItem);
              const status = getItemStatus(ref.data ?? cachedItem);
              const isDragging = dragIndex === index;

              return (
                <li
                  key={`${ref.collection}:${ref.item}:${index}`}
                  className={`section-list-row group ${isDragging ? 'section-list-row-dragging' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(index);
                  }}
                >
                  <button
                    type="button"
                    draggable
                    aria-label={`Reorder ${label}`}
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className="section-list-grip"
                  >
                    <SectionGripIcon />
                  </button>

                  <div className="min-w-0 flex-1 truncate text-sm">
                    <span className="section-list-type">{typeLabel}:</span>{' '}
                    <Link to={`/content/${ref.collection}/${ref.item}`} className="section-list-value">
                      {label}
                    </Link>
                    {status === 'published' && (
                      <span className="section-list-status ml-2 inline-block align-middle" title="Published" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="section-list-remove"
                    title="Remove from page"
                    aria-label={`Remove ${label}`}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {sections.length === 0 && (
        <p className="mb-3 text-sm text-slate-500">
          No sections yet. Add existing blocks from{' '}
          <Link to="/content" className="font-medium text-brand-600 hover:text-brand-700">
            Content
          </Link>
          .
        </p>
      )}

      <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
        Add Existing
        <Icon name="chevron-down" className="h-4 w-4" />
      </button>

      <AddExistingBlockModal
        open={showModal}
        allowedCollections={allowedCollections}
        selectedRefs={sections}
        onClose={() => setShowModal(false)}
        onSelect={appendSection}
      />
    </div>
  );
}
