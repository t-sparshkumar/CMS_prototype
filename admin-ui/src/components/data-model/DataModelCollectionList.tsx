import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import CollectionMaterialIcon from '../CollectionMaterialIcon';
import { isSubCollection } from '../SubCollectionHighlight';
import {
  addCollectionLabel,
  addFolderLabel,
  collectionTypeLabel,
  folderBadgeLabel,
  openCollectionLabel,
  openFolderLabel,
} from '../../lib/collectionLabels';
import { reorderCollections, type CollectionMeta } from '../../lib/api';
import { getCollectionDisplayName } from '../../lib/collectionDisplay';

interface DataModelCollectionListProps {
  collections: CollectionMeta[];
  isLoading?: boolean;
  search: string;
  onDelete?: (name: string) => void;
  onDuplicate?: (name: string) => void;
  onAddFolder?: (collection: CollectionMeta) => void;
  onAddCollection?: (collection: CollectionMeta) => void;
  onRefresh?: () => void;
}

interface VisibleRow {
  collection: CollectionMeta;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

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

function buildChildrenMap(collections: CollectionMeta[]): Map<string, CollectionMeta[]> {
  const map = new Map<string, CollectionMeta[]>();
  for (const col of collections) {
    if (!col.parent) continue;
    const siblings = map.get(col.parent) ?? [];
    siblings.push(col);
    map.set(col.parent, siblings);
  }
  for (const [parent, children] of map) {
    map.set(parent, sortCollections(children));
  }
  return map;
}

function collectionMatchesSearch(col: CollectionMeta, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    col.collection.toLowerCase().includes(q) ||
    getCollectionDisplayName(col).toLowerCase().includes(q) ||
    (col.note?.toLowerCase().includes(q) ?? false)
  );
}

function collectExpandableParents(
  collections: CollectionMeta[],
  childrenByParent: Map<string, CollectionMeta[]>,
): string[] {
  return collections
    .filter((col) => (childrenByParent.get(col.collection)?.length ?? 0) > 0)
    .map((col) => col.collection);
}

function DataModelActionsMenu({
  collection,
  anchor,
  onClose,
  onDelete,
  onDuplicate,
  onAddFolder,
  onAddCollection,
}: {
  collection: CollectionMeta;
  anchor: MenuState;
  onClose: () => void;
  onDelete?: (name: string) => void;
  onDuplicate?: (name: string) => void;
  onAddFolder?: (collection: CollectionMeta) => void;
  onAddCollection?: (collection: CollectionMeta) => void;
}) {
  const canAddChildren = collection.is_group && !collection.system;

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
          to={`/settings/data-model/${collection.collection}`}
          className="menu-dropdown-item"
          onClick={onClose}
          role="menuitem"
        >
          {collection.is_group ? openFolderLabel() : openCollectionLabel()}
        </Link>
        <Link
          to={`/settings/data-model/${collection.collection}/setup`}
          className="menu-dropdown-item"
          onClick={onClose}
          role="menuitem"
        >
          Collection setup
        </Link>
        {canAddChildren && onAddFolder && (
          <button
            type="button"
            className="menu-dropdown-item w-full text-left"
            onClick={() => {
              onAddFolder(collection);
              onClose();
            }}
            role="menuitem"
          >
            {addFolderLabel()}
          </button>
        )}
        {canAddChildren && onAddCollection && (
          <button
            type="button"
            className="menu-dropdown-item w-full text-left"
            onClick={() => {
              onAddCollection(collection);
              onClose();
            }}
            role="menuitem"
          >
            {addCollectionLabel()}
          </button>
        )}
        {onDuplicate && !collection.system && (
          <button
            type="button"
            className="menu-dropdown-item w-full text-left"
            onClick={() => {
              onDuplicate(collection.collection);
              onClose();
            }}
            role="menuitem"
          >
            Duplicate
          </button>
        )}
        {onDelete && !collection.system && (
          <button
            type="button"
            className="menu-dropdown-item w-full text-left text-red-600"
            onClick={() => {
              onDelete(collection.collection);
              onClose();
            }}
            role="menuitem"
          >
            Delete
          </button>
        )}
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
  const left = Math.min(Math.max(rect.right - menuWidth, 8), window.innerWidth - menuWidth - 8);
  const top = rect.bottom + 4;
  setMenu({ collection, top, left });
}

export default function DataModelCollectionList({
  collections,
  isLoading,
  search,
  onDelete,
  onDuplicate,
  onAddFolder,
  onAddCollection,
  onRefresh,
}: DataModelCollectionListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<MenuState | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const childrenByParent = useMemo(() => buildChildrenMap(collections), [collections]);
  const roots = useMemo(
    () => sortCollections(collections.filter((col) => !col.parent)),
    [collections],
  );

  const query = search.trim().toLowerCase();
  const canReorder = !query && !isReordering;

  const expandableParents = useMemo(
    () => collectExpandableParents(collections, childrenByParent),
    [collections, childrenByParent],
  );

  useEffect(() => {
    if (!query) return;
    const next = new Set<string>();
    for (const col of collections) {
      if (!col.parent) continue;
      if (collectionMatchesSearch(col, query)) {
        next.add(col.parent);
        let ancestor = collections.find((c) => c.collection === col.parent)?.parent;
        while (ancestor) {
          next.add(ancestor);
          ancestor = collections.find((c) => c.collection === ancestor)?.parent ?? null;
        }
      }
    }
    setExpanded(next);
  }, [query, collections]);

  function isExpanded(name: string): boolean {
    return expanded.has(name);
  }

  function toggleExpanded(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(expandableParents));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function hasMatchingDescendant(col: CollectionMeta): boolean {
    const children = childrenByParent.get(col.collection) ?? [];
    for (const child of children) {
      if (collectionMatchesSearch(child, query)) return true;
      if (hasMatchingDescendant(child)) return true;
    }
    return false;
  }

  function buildVisibleRows(
    items: CollectionMeta[],
    depth: number,
    acc: VisibleRow[] = [],
  ): VisibleRow[] {
    for (const col of items) {
      const children = childrenByParent.get(col.collection) ?? [];
      const hasChildren = children.length > 0;
      const rowExpanded = isExpanded(col.collection);

      if (query) {
        const keep = collectionMatchesSearch(col, query) || hasMatchingDescendant(col);
        if (!keep) continue;
      }

      acc.push({
        collection: col,
        depth,
        hasChildren,
        isExpanded: rowExpanded,
      });

      if (hasChildren && (rowExpanded || query)) {
        buildVisibleRows(children, depth + 1, acc);
      }
    }
    return acc;
  }

  const visibleRows = useMemo(
    () => buildVisibleRows(roots, 0),
    [roots, childrenByParent, expanded, query, collections],
  );

  async function persistSiblingReorder(reordered: CollectionMeta[]) {
    setIsReordering(true);
    try {
      await reorderCollections(
        reordered.map((col, index) => ({ collection: col.collection, sort: index + 1 })),
      );
      onRefresh?.();
    } finally {
      setIsReordering(false);
      setDragKey(null);
    }
  }

  function handleDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    const dragged = collections.find((c) => c.collection === dragKey);
    const target = collections.find((c) => c.collection === targetKey);
    if (!dragged || !target) return;
    if ((dragged.parent ?? null) !== (target.parent ?? null)) {
      setDragKey(null);
      return;
    }

    const siblings = sortCollections(
      collections.filter((c) => (c.parent ?? null) === (target.parent ?? null)),
    );
    const fromIndex = siblings.findIndex((c) => c.collection === dragKey);
    const toIndex = siblings.findIndex((c) => c.collection === targetKey);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(toIndex, 0, moved);
    void persistSiblingReorder(reordered);
  }

  function moveSibling(collectionName: string, direction: -1 | 1) {
    const col = collections.find((c) => c.collection === collectionName);
    if (!col) return;
    const siblings = sortCollections(
      collections.filter((c) => (c.parent ?? null) === (col.parent ?? null)),
    );
    const index = siblings.findIndex((c) => c.collection === collectionName);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);
    void persistSiblingReorder(reordered);
  }

  const menuCollection = openMenu
    ? collections.find((col) => col.collection === openMenu.collection)
    : null;

  if (isLoading) {
    return (
      <div className="dm-shell">
        <div className="dm-empty text-sm">Loading collections...</div>
      </div>
    );
  }

  if (visibleRows.length === 0) {
    return (
      <div className="dm-shell">
        <div className="dm-empty">
          <span className="dm-empty-icon">
            <Icon name="database" className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-[var(--app-text)]">No collections found</p>
          <p className="mt-1 text-xs">
            {search ? 'Try a different search term.' : 'Create your first collection to get started.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-shell">
      <div className="dm-shell-header">
        <span>
          {visibleRows.length} item{visibleRows.length === 1 ? '' : 's'}
        </span>
        {expandableParents.length > 0 && (
          <button
            type="button"
            onClick={() => (expanded.size > 0 ? collapseAll() : expandAll())}
          >
            {expanded.size > 0 ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      <ul>
        {visibleRows.map((row) => {
          const { collection: col, depth, hasChildren, isExpanded: rowExpanded } = row;
          const isSub = isSubCollection(col);
          const isDragging = dragKey === col.collection;
          const displayName = getCollectionDisplayName(col);
          const color = col.color ?? 'var(--app-accent)';
          const siblings = sortCollections(
            collections.filter((c) => (c.parent ?? null) === (col.parent ?? null)),
          );
          const siblingIndex = siblings.findIndex((c) => c.collection === col.collection);
          const canMoveUp = canReorder && siblingIndex > 0;
          const canMoveDown = canReorder && siblingIndex >= 0 && siblingIndex < siblings.length - 1;

          return (
            <li
              key={col.collection}
              className={`dm-row group ${isSub ? 'is-nested' : ''} ${isDragging ? 'is-dragging' : ''}`}
              style={{ paddingLeft: `${12 + depth * 20}px` }}
              onDragOver={(e) => {
                if (canReorder) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.collection);
              }}
            >
              <button
                type="button"
                draggable={canReorder}
                aria-label={`Reorder ${displayName}`}
                onDragStart={(e) => {
                  if (!canReorder) {
                    e.preventDefault();
                    return;
                  }
                  setDragKey(col.collection);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDragKey(null)}
                className="dm-grip"
                disabled={!canReorder}
              >
                <GripIcon />
              </button>

              {hasChildren ? (
                <button
                  type="button"
                  aria-label={rowExpanded ? 'Collapse' : 'Expand'}
                  onClick={() => toggleExpanded(col.collection)}
                  className="dm-expand-btn"
                >
                  <Icon
                    name="chevron-right"
                    className={`h-3.5 w-3.5 transition-transform ${rowExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <span className="w-6 shrink-0" aria-hidden="true" />
              )}

              <Link
                to={`/settings/data-model/${col.collection}`}
                className="dm-row-link"
              >
                <span
                  className="dm-row-icon"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 14%, var(--app-surface))`,
                    color,
                  }}
                >
                  <CollectionMaterialIcon
                    icon={col.icon}
                    isGroup={col.is_group}
                    size={16}
                  />
                </span>
                <span className="dm-row-title truncate">{displayName}</span>
                {col.is_group && <span className="dm-row-tag">{folderBadgeLabel()}</span>}
                {!col.is_group && col.parent && (
                  <span className="dm-row-tag">{collectionTypeLabel(col)}</span>
                )}
                {col.hidden && <span className="dm-row-tag">Hidden</span>}
                {col.system && <span className="dm-row-tag">System</span>}
              </Link>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={!canMoveUp}
                  onClick={() => moveSibling(col.collection, -1)}
                  className="dm-sort-btn"
                >
                  <Icon name="arrow-up" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={!canMoveDown}
                  onClick={() => moveSibling(col.collection, 1)}
                  className="dm-sort-btn"
                >
                  <Icon name="arrow-down" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Actions for ${displayName}`}
                  aria-expanded={openMenu?.collection === col.collection}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openMenuAtButton(e.currentTarget, col.collection, setOpenMenu, openMenu);
                  }}
                  className="dm-menu-btn"
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

      {openMenu && menuCollection && (
        <DataModelActionsMenu
          collection={menuCollection}
          anchor={openMenu}
          onClose={() => setOpenMenu(null)}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onAddFolder={onAddFolder}
          onAddCollection={onAddCollection}
        />
      )}
    </div>
  );
}
