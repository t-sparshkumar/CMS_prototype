import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import {
  isSubCollection,
  SubCollectionBadge,
  SubCollectionParentLink,
  subCollectionRowClass,
  subCollectionSectionClass,
} from './SubCollectionHighlight';
import { reorderCollections, type CollectionMeta } from '../lib/api';

export interface BreadcrumbItem {
  collection: string;
  label: string;
}

interface ContentCollectionListProps {
  collections: CollectionMeta[];
  isLoading?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  /** When true, wraps the list in sub-collection section styling (e.g. inside a group). */
  inSubCollectionContext?: boolean;
  parentName?: string;
  onReorder?: () => void;
}

function sortCollections(collections: CollectionMeta[]): CollectionMeta[] {
  return [...collections].sort(
    (a, b) => a.sort - b.sort || a.collection.localeCompare(b.collection),
  );
}

interface MenuState {
  collection: string;
  top: number;
  left: number;
}

function CollectionActionsMenu({
  collectionMeta,
  anchor,
  onClose,
}: {
  collectionMeta: CollectionMeta;
  anchor: MenuState;
  onClose: () => void;
}) {
  const { collection, is_group: isGroup } = collectionMeta;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-52 menu-dropdown"
        style={{ top: anchor.top, left: anchor.left }}
        role="menu"
      >
        {isGroup ? (
          <Link
            to={`/content/${collection}`}
            className="menu-dropdown-item"
            onClick={onClose}
            role="menuitem"
          >
            Open group
          </Link>
        ) : (
          <>
            <Link
              to={`/content/${collection}`}
              className="menu-dropdown-item"
              onClick={onClose}
              role="menuitem"
            >
              View items
            </Link>
            <Link
              to={`/content/${collection}/new`}
              className="menu-dropdown-item"
              onClick={onClose}
              role="menuitem"
            >
              Create item
            </Link>
          </>
        )}
        <Link
          to={`/settings/data-model/${collection}`}
          className="menu-dropdown-item"
          onClick={onClose}
          role="menuitem"
        >
          Data model
        </Link>
      </div>
    </>,
    document.body,
  );
}

function openMenuAtButton(
  button: HTMLButtonElement,
  collection: string,
  setMenu: (menu: MenuState | null) => void,
  currentMenu: MenuState | null,
) {
  if (currentMenu?.collection === collection) {
    setMenu(null);
    return;
  }

  const rect = button.getBoundingClientRect();
  const menuWidth = 208;
  const menuHeight = 132;
  const padding = 8;

  let top = rect.bottom + 4;
  let left = rect.right - menuWidth;

  if (left < padding) left = padding;
  if (left + menuWidth > window.innerWidth - padding) {
    left = window.innerWidth - menuWidth - padding;
  }
  if (top + menuHeight > window.innerHeight - padding) {
    top = rect.top - menuHeight - 4;
  }

  setMenu({ collection, top, left });
}

function CollectionIcon({ collection }: { collection: CollectionMeta }) {
  const color = collection.color ?? '#6366f1';
  const label = collection.collection.slice(0, 2).toUpperCase();

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-slate-300" aria-hidden="true">
      <circle cx="5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="11" cy="4" r="1.2" fill="currentColor" />
      <circle cx="5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="11" cy="8" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="11" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function HiddenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" aria-hidden="true" fill="currentColor">
      <path d="M12 6.5c2.76 0 5.26 1.56 6.5 4-1.24 2.44-3.74 4-6.5 4s-5.26-1.56-6.5-4c1.24-2.44 3.74-4 6.5-4zm0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
      <path d="M2.71 3.16 1.29 4.58l2.07 2.07C2.56 8.03 1.5 9.68 1 11.5 2.73 15.89 7 19 12 19c1.78 0 3.44-.43 4.91-1.18l2.38 2.38 1.41-1.41L2.71 3.16zM12 17c-3.31 0-6.5-2.44-7.93-6 .56-1.34 1.42-2.52 2.48-3.44l1.57 1.57A4.48 4.48 0 0 0 12 15.5c.62 0 1.21-.13 1.74-.36l1.53 1.53C14.09 16.82 13.07 17 12 17z" />
    </svg>
  );
}

function CollectionMetaBadges({ col }: { col: CollectionMeta }) {
  const isSub = isSubCollection(col);

  return (
    <div className="flex shrink-0 items-center gap-1 text-slate-400">
      {isSub && <SubCollectionBadge className="mr-1 normal-case tracking-normal" />}
      {col.is_group && <span className="badge-blue text-[10px] mr-1">Group</span>}
      {col.singleton && <span className="badge-blue text-[10px] mr-1">Singleton</span>}
      {col.is_group ? (
        <span className="text-xs text-slate-400 mr-1">
          {col.child_count} sub-collection{col.child_count === 1 ? '' : 's'}
        </span>
      ) : (
        <span className="text-xs text-slate-400 mr-1">{col.field_count} fields</span>
      )}
      <Icon name="chevron-right" className="h-4 w-4 text-slate-300 group-hover:text-brand-500" />
    </div>
  );
}

export default function ContentCollectionList({
  collections,
  isLoading,
  breadcrumbs = [],
  inSubCollectionContext = false,
  parentName,
  onReorder,
}: ContentCollectionListProps) {
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<MenuState | null>(null);
  const [orderedCollections, setOrderedCollections] = useState<CollectionMeta[]>(() =>
    sortCollections(collections),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    setOrderedCollections(sortCollections(collections));
  }, [collections]);

  const canReorder = !search.trim() && !isReordering;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orderedCollections;
    return orderedCollections.filter(
      (col) =>
        col.collection.toLowerCase().includes(query) ||
        (col.note?.toLowerCase().includes(query) ?? false),
    );
  }, [orderedCollections, search]);

  async function persistReorder(reordered: CollectionMeta[]) {
    setIsReordering(true);
    const previous = orderedCollections;
    setOrderedCollections(reordered);
    try {
      await reorderCollections(
        reordered.map((col, index) => ({ collection: col.collection, sort: index + 1 })),
      );
      onReorder?.();
    } catch {
      setOrderedCollections(previous);
    } finally {
      setIsReordering(false);
      setDragIndex(null);
    }
  }

  function handleDrop(targetIndex: number) {
    if (!canReorder || dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }

    const reordered = [...filtered];
    const [moved] = reordered.splice(dragIndex, 1);
    if (!moved) {
      setDragIndex(null);
      return;
    }
    reordered.splice(targetIndex, 0, moved);
    void persistReorder(reordered);
  }

  const menuCollection = openMenu
    ? orderedCollections.find((col) => col.collection === openMenu.collection)
    : null;

  return (
    <div className={`space-y-4 ${inSubCollectionContext ? subCollectionSectionClass() : ''}`}>
      {inSubCollectionContext && parentName && (
        <div className="flex items-center gap-2 -mt-1 mb-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Icon name="component" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Sub-collections</h2>
            <p className="text-xs text-violet-600/80">Nested under {parentName}</p>
          </div>
        </div>
      )}

      {breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1.5 text-sm">
          <Link to="/content" className="font-medium text-slate-500 hover:text-brand-600">
            All collections
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.collection} className="flex items-center gap-1.5">
              <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-300" />
              <Link
                to={`/content/${crumb.collection}`}
                className="font-medium text-slate-500 hover:text-brand-600"
              >
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>
      )}

      <div className="page-toolbar">
        <div className="relative flex-1 min-w-[240px] max-w-lg">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <span className="toolbar-count">
          {filtered.length} collection{filtered.length === 1 ? '' : 's'}
          {canReorder && filtered.length > 1 && (
            <span className="text-slate-400 font-normal"> · drag to reorder</span>
          )}
        </span>
      </div>

      <div className="table-shell">
        <div className="collection-card-accent bg-gradient-to-r from-brand-500 to-violet-500" />
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading collections...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon name="content" className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-slate-700">No collections found</p>
            <p className="mt-1 text-xs text-slate-500">
              {search ? 'Try a different search term.' : 'Create a collection in Data Model first.'}
            </p>
            {!search && (
              <Link to="/settings/data-model" className="btn-primary mt-4 inline-flex">
                Go to Data Model
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y-0">
            {filtered.map((col, index) => {
              const isSub = isSubCollection(col);
              const isDragging = dragIndex === index;

              return (
              <li
                key={col.collection}
                className={`list-row group ${subCollectionRowClass(isSub)} ${isDragging ? 'opacity-50' : ''}`}
                onDragOver={(e) => {
                  if (canReorder) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(index);
                }}
              >
                <button
                  type="button"
                  draggable={canReorder}
                  aria-label={`Reorder ${col.collection}`}
                  aria-disabled={!canReorder}
                  onDragStart={(e) => {
                    if (!canReorder) {
                      e.preventDefault();
                      return;
                    }
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`shrink-0 touch-none p-1 -ml-1 rounded-md transition-opacity ${
                    canReorder
                      ? 'cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100 hover:bg-slate-100'
                      : 'cursor-not-allowed opacity-30'
                  } ${isSub ? 'text-violet-300 hover:bg-violet-50' : 'text-slate-300'}`}
                >
                  <GripIcon />
                </button>
                <Link to={`/content/${col.collection}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <CollectionIcon collection={col} />
                  {col.hidden && (
                    <span title="Hidden collection" className="shrink-0">
                      <HiddenIcon />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold group-hover:text-brand-700 ${isSub ? 'text-violet-900' : 'text-slate-900'}`}>
                      {col.collection}
                    </p>
                    {isSub && col.parent && (
                      <SubCollectionParentLink parent={col.parent} basePath="/content" />
                    )}
                    {col.note && (
                      <p className="truncate text-xs text-slate-500 mt-0.5">{col.note}</p>
                    )}
                  </div>
                  <CollectionMetaBadges col={col} />
                </Link>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    aria-label={`Actions for ${col.collection}`}
                    aria-expanded={openMenu?.collection === col.collection}
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openMenuAtButton(e.currentTarget, col.collection, setOpenMenu, openMenu);
                    }}
                    className={`rounded-lg p-1.5 transition-colors ${
                      openMenu?.collection === col.collection
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-slate-400 hover:bg-white hover:text-slate-600'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </div>

      {openMenu && menuCollection && (
        <CollectionActionsMenu
          collectionMeta={menuCollection}
          anchor={openMenu}
          onClose={() => setOpenMenu(null)}
        />
      )}
    </div>
  );
}

function buildBreadcrumbs(
  allCollections: CollectionMeta[],
  current: CollectionMeta,
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [];
  let parentName = current.parent;

  while (parentName) {
    const parent = allCollections.find((col) => col.collection === parentName);
    if (!parent) break;
    crumbs.unshift({ collection: parent.collection, label: parent.collection });
    parentName = parent.parent;
  }

  return crumbs;
}

export { buildBreadcrumbs };
