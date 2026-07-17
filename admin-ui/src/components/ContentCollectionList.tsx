import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import CollectionMaterialIcon from './CollectionMaterialIcon';
import {
  childCollectionsLabel,
  folderBadgeLabel,
  nestedCollectionBadgeLabel,
  nestedCollectionsHeading,
  nestedUnderLabel,
  openFolderLabel,
} from '../lib/collectionLabels';
import { reorderCollections, type CollectionMeta } from '../lib/api';
import { getCollectionDisplayName } from '../lib/collectionDisplay';
import { isSubCollection } from './SubCollectionHighlight';

export interface BreadcrumbItem {
  collection: string;
  label: string;
}

interface ContentCollectionListProps {
  collections: CollectionMeta[];
  isLoading?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  inFolderContext?: boolean;
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
            {openFolderLabel()}
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
  const color = collection.color ?? 'var(--app-accent)';

  return (
    <span
      className="collection-list-icon"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, var(--app-surface))`,
        color,
      }}
      aria-hidden="true"
    >
      <CollectionMaterialIcon
        icon={collection.icon}
        isGroup={collection.is_group}
        size={16}
      />
    </span>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="5" cy="4" r="1.1" fill="currentColor" />
      <circle cx="11" cy="4" r="1.1" fill="currentColor" />
      <circle cx="5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="11" cy="8" r="1.1" fill="currentColor" />
      <circle cx="5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="11" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

function CollectionMetaBadges({ col }: { col: CollectionMeta }) {
  const isSub = isSubCollection(col);

  return (
    <div className="collection-list-badges">
      {isSub && (
        <span className="collection-list-sub-badge">
          <Icon name="component" className="h-2.5 w-2.5" />
          {nestedCollectionBadgeLabel()}
        </span>
      )}
      {col.is_group && <span className="collection-list-badge">{folderBadgeLabel()}</span>}
      {col.singleton && <span className="collection-list-badge">Singleton</span>}
      {col.is_group ? (
        <span className="collection-list-count">{childCollectionsLabel(col.child_count)}</span>
      ) : (
        <span className="collection-list-count">{col.field_count} fields</span>
      )}
      <Icon name="chevron-right" className="collection-list-chevron h-3.5 w-3.5" />
    </div>
  );
}

export default function ContentCollectionList({
  collections,
  isLoading,
  breadcrumbs = [],
  inFolderContext = false,
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
        getCollectionDisplayName(col).toLowerCase().includes(query) ||
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
    <div className={`space-y-3 ${inFolderContext ? 'collection-list-nested-wrap' : ''}`}>
      {inFolderContext && parentName && (
        <div className="collection-list-folder-header">
          <span className="collection-list-folder-icon">
            <Icon name="folder" className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--app-text)]">{nestedCollectionsHeading()}</h2>
            <p className="text-xs text-[var(--app-text-muted)]">{nestedUnderLabel(parentName)}</p>
          </div>
        </div>
      )}

      {breadcrumbs.length > 0 && (
        <nav className="collection-list-breadcrumb flex flex-wrap items-center gap-1.5">
          <Link to="/content">All collections</Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.collection} className="flex items-center gap-1.5">
              <Icon name="chevron-right" className="collection-list-breadcrumb-sep h-3 w-3" />
              <Link to={`/content/${crumb.collection}`}>{crumb.label}</Link>
            </span>
          ))}
        </nav>
      )}

      <div className="collection-list-header">
        <div className="collection-list-search">
          <Icon name="search" className="collection-list-search-icon h-3.5 w-3.5" />
          <input
            type="search"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="collection-list-search-input"
          />
        </div>
        <span className="collection-list-meta">
          {filtered.length} collection{filtered.length === 1 ? '' : 's'}
          {canReorder && filtered.length > 1 && ' · drag to reorder'}
        </span>
      </div>

      <div className="collection-list-shell">
        {isLoading ? (
          <div className="collection-list-empty text-sm">Loading collections...</div>
        ) : filtered.length === 0 ? (
          <div className="collection-list-empty">
            <span className="collection-list-empty-icon">
              <Icon name="content" className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-[var(--app-text)]">No collections found</p>
            <p className="mt-1 text-xs">
              {search ? 'Try a different search term.' : 'Create a collection in Data Model first.'}
            </p>
            {!search && (
              <Link to="/settings/data-model" className="btn-primary mt-4 inline-flex text-sm">
                Go to Data Model
              </Link>
            )}
          </div>
        ) : (
          <ul>
            {filtered.map((col, index) => {
              const isSub = isSubCollection(col);
              const isDragging = dragIndex === index;
              const displayName = getCollectionDisplayName(col);

              return (
                <li
                  key={col.collection}
                  className={`collection-list-row group ${isSub ? 'is-nested' : ''} ${isDragging ? 'opacity-40' : ''}`}
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
                    aria-label={`Reorder ${displayName}`}
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
                    className="collection-list-grip"
                    disabled={!canReorder}
                  >
                    <GripIcon />
                  </button>

                  <Link to={`/content/${col.collection}`} className="collection-list-link">
                    <CollectionIcon collection={col} />
                    <div className="min-w-0 flex-1">
                      <p className="collection-list-title">{displayName}</p>
                      {isSub && col.parent && (
                        <p className="collection-list-note">Under {col.parent}</p>
                      )}
                      {col.note && <p className="collection-list-note">{col.note}</p>}
                    </div>
                    <CollectionMetaBadges col={col} />
                  </Link>

                  <button
                    type="button"
                    aria-label={`Actions for ${displayName}`}
                    aria-expanded={openMenu?.collection === col.collection}
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openMenuAtButton(e.currentTarget, col.collection, setOpenMenu, openMenu);
                    }}
                    className="collection-list-menu-btn"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
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
    crumbs.unshift({
      collection: parent.collection,
      label: getCollectionDisplayName(parent),
    });
    parentName = parent.parent;
  }

  return crumbs;
}

export { buildBreadcrumbs };
