import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import CreateFolderModal from './CreateFolderModal';
import CreateCollectionModal from './CreateCollectionModal';
import Icon from '../Icon';
import CollectionMaterialIcon from '../CollectionMaterialIcon';
import {
  addCollectionLabel,
  addFolderLabel,
  childCollectionsLabel,
  folderBadgeLabel,
  nestedCollectionsHeading,
  nestedUnderLabel,
  noCollectionsInFolder,
  openCollectionLabel,
  openFolderLabel,
} from '../../lib/collectionLabels';
import { reorderCollections, type CollectionMeta } from '../../lib/api';
import { getCollectionDisplayName } from '../../lib/collectionDisplay';

interface DataModelSubCollectionsSectionProps {
  collections: CollectionMeta[];
  parentCollection: CollectionMeta;
  isLoading?: boolean;
  onRefresh?: () => void;
}

type CreateModal = 'folder' | 'collection' | null;

interface MenuState {
  collection: string;
  top: number;
  left: number;
}

function sortCollections(collections: CollectionMeta[]): CollectionMeta[] {
  return [...collections].sort(
    (a, b) => a.sort - b.sort || a.collection.localeCompare(b.collection),
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

function CollectionMetaBadges({ col }: { col: CollectionMeta }) {
  return (
    <div className="collection-list-badges">
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
  const menuHeight = 160;
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

function CollectionActionsMenu({
  collectionMeta,
  anchor,
  onClose,
  onAddFolder,
  onAddCollection,
}: {
  collectionMeta: CollectionMeta;
  anchor: MenuState;
  onClose: () => void;
  onAddFolder?: (collection: CollectionMeta) => void;
  onAddCollection?: (collection: CollectionMeta) => void;
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
        <Link
          to={`/settings/data-model/${collection}`}
          className="menu-dropdown-item"
          onClick={onClose}
          role="menuitem"
        >
          {isGroup ? openFolderLabel() : openCollectionLabel()}
        </Link>
        {isGroup && onAddFolder && (
          <button
            type="button"
            className="menu-dropdown-item w-full text-left"
            onClick={() => {
              onAddFolder(collectionMeta);
              onClose();
            }}
            role="menuitem"
          >
            {addFolderLabel()}
          </button>
        )}
        {isGroup && onAddCollection && (
          <button
            type="button"
            className="menu-dropdown-item w-full text-left"
            onClick={() => {
              onAddCollection(collectionMeta);
              onClose();
            }}
            role="menuitem"
          >
            {addCollectionLabel()}
          </button>
        )}
        <Link
          to={`/settings/data-model/${collection}/setup`}
          className="menu-dropdown-item"
          onClick={onClose}
          role="menuitem"
        >
          Collection setup
        </Link>
      </div>
    </>,
    document.body,
  );
}

export default function DataModelSubCollectionsSection({
  collections,
  parentCollection,
  isLoading,
  onRefresh,
}: DataModelSubCollectionsSectionProps) {
  const [createModal, setCreateModal] = useState<CreateModal>(null);
  const [createParent, setCreateParent] = useState<CollectionMeta | null>(null);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<MenuState | null>(null);
  const [orderedCollections, setOrderedCollections] = useState<CollectionMeta[]>(() =>
    sortCollections(collections),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const activeParent = createParent ?? parentCollection;

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

  function openCreate(type: 'folder' | 'collection', parent: CollectionMeta) {
    setCreateParent(parent);
    setCreateModal(type);
  }

  function closeCreate() {
    setCreateModal(null);
    setCreateParent(null);
  }

  async function persistReorder(reordered: CollectionMeta[]) {
    setIsReordering(true);
    const previous = orderedCollections;
    setOrderedCollections(reordered);
    try {
      await reorderCollections(
        reordered.map((col, index) => ({ collection: col.collection, sort: index + 1 })),
      );
      onRefresh?.();
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="collection-list-folder-header mb-0">
          <span className="collection-list-folder-icon">
            <Icon name="folder" className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--app-text)]">{nestedCollectionsHeading()}</h2>
            <p className="text-xs text-[var(--app-text-muted)]">{nestedUnderLabel(parentCollection.collection)}</p>
          </div>
        </div>
        <div className="dm-section-actions">
          <button type="button" onClick={() => openCreate('folder', parentCollection)} className="btn-secondary text-sm">
            <Icon name="folder" className="h-4 w-4" />
            {addFolderLabel()}
          </button>
          <button type="button" onClick={() => openCreate('collection', parentCollection)} className="btn-secondary text-sm">
            <Icon name="plus" className="h-4 w-4" />
            {addCollectionLabel()}
          </button>
        </div>
      </div>

      <div className="page-toolbar collection-list-toolbar">
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
              <Icon name="database" className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-[var(--app-text)]">No collections yet</p>
            <p className="mt-1 text-xs">
              {search ? 'Try a different search term.' : noCollectionsInFolder(parentCollection.collection)}
            </p>
            {!search && (
              <div className="dm-section-actions justify-center mt-4">
                <button type="button" onClick={() => openCreate('folder', parentCollection)} className="btn-secondary text-sm">
                  <Icon name="folder" className="h-4 w-4" />
                  {addFolderLabel()}
                </button>
                <button type="button" onClick={() => openCreate('collection', parentCollection)} className="btn-secondary text-sm">
                  <Icon name="plus" className="h-4 w-4" />
                  {addCollectionLabel()}
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul>
            {filtered.map((col, index) => {
              const isDragging = dragIndex === index;
              const displayName = getCollectionDisplayName(col);

              return (
                <li
                  key={col.collection}
                  className={`collection-list-row group ${isDragging ? 'opacity-40' : ''}`}
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

                  <Link to={`/settings/data-model/${col.collection}`} className="collection-list-link">
                    <CollectionIcon collection={col} />
                    <div className="min-w-0 flex-1">
                      <p className="collection-list-title">{displayName}</p>
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
          onAddFolder={menuCollection.is_group ? (c) => openCreate('folder', c) : undefined}
          onAddCollection={menuCollection.is_group ? (c) => openCreate('collection', c) : undefined}
        />
      )}

      {createModal === 'folder' && (
        <CreateFolderModal
          parent={activeParent.collection}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            onRefresh?.();
          }}
        />
      )}

      {createModal === 'collection' && (
        <CreateCollectionModal
          parent={activeParent.collection}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            onRefresh?.();
          }}
        />
      )}
    </section>
  );
}
