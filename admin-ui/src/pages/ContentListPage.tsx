import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import type { BreadcrumbItem } from '../components/Breadcrumbs';
import ConfirmDialog from '../components/data-model/ConfirmDialog';
import CreateFolderModal from '../components/data-model/CreateFolderModal';
import CreateCollectionModal from '../components/data-model/CreateCollectionModal';
import ContentCollectionList, { buildBreadcrumbs } from '../components/ContentCollectionList';
import Icon from '../components/Icon';
import TableRowActions from '../components/TableRowActions';
import {
  browseFolderSubtitle,
  createCollectionTitle,
  createFolderTitle,
} from '../lib/collectionLabels';
import { getCollectionDisplayName } from '../lib/collectionDisplay';
import {
  deleteItem,
  fetchCollection,
  fetchCollections,
  fetchFields,
  fetchItems,
  getAssetUrl,
  reorderItems,
  type CollectionMeta,
  type FieldMeta,
  type ItemRecord,
} from '../lib/api';
import { formatDisplayTemplate } from '../lib/displayTemplate';

const PAGE_SIZE = 25;

function buildContentBreadcrumbs(
  trail: { collection: string; label: string }[],
  currentLabel: string,
): BreadcrumbItem[] {
  return [
    { label: 'Content', to: '/content' },
    ...trail.map((crumb) => ({ label: crumb.label, to: `/content/${crumb.collection}` })),
    { label: currentLabel },
  ];
}

function formatCellValue(field: FieldMeta, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (field.interface === 'file' && typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function ContentListPage() {
  const { collection: collectionParam } = useParams<{ collection: string }>();
  const navigate = useNavigate();
  const selectedCollection = collectionParam ?? '';
  const [allCollections, setAllCollections] = useState<CollectionMeta[]>([]);
  const [visibleCollections, setVisibleCollections] = useState<CollectionMeta[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState('-date_created');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [collectionMeta, setCollectionMeta] = useState<CollectionMeta | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [createModal, setCreateModal] = useState<'folder' | 'collection' | null>(null);

  const currentCollectionMeta = useMemo(
    () => allCollections.find((col) => col.collection === selectedCollection) ?? collectionMeta,
    [allCollections, selectedCollection, collectionMeta],
  );

  const isGroupView = Boolean(currentCollectionMeta?.is_group);
  const displayFields = fields.filter((f) => !f.is_system && !f.hidden).slice(0, 4);

  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true);
    try {
      const all = await fetchCollections();
      setAllCollections(all);

      if (!selectedCollection) {
        const roots = await fetchCollections({ parent: null });
        setVisibleCollections(roots);
      } else {
        const meta = all.find((col) => col.collection === selectedCollection) ?? await fetchCollection(selectedCollection);
        setCollectionMeta(meta);
        if (meta.is_group) {
          const children = await fetchCollections({ parent: selectedCollection });
          setVisibleCollections(children);
        } else {
          setVisibleCollections([]);
        }
      }
    } catch {
      setError('Failed to load collections');
    } finally {
      setCollectionsLoading(false);
    }
  }, [selectedCollection]);

  const loadItems = useCallback(async () => {
    if (!selectedCollection) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    if (collectionsLoading) {
      return;
    }

    if (isGroupView) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [fieldList, result, meta] = await Promise.all([
        fetchFields(selectedCollection),
        fetchItems(selectedCollection, {
          limit: PAGE_SIZE,
          offset,
          search: search || undefined,
          sort,
          include_archived: includeArchived,
        }),
        fetchCollection(selectedCollection),
      ]);
      setFields(fieldList);
      setItems(result.items);
      setTotalCount(result.filterCount);
      setCollectionMeta(meta);
      setSelectedIds(new Set());

      if (meta.singleton && !search && offset === 0) {
        const singletonItem = result.items[0];
        if (result.items.length === 1 && singletonItem) {
          navigate(`/content/${selectedCollection}/${String(singletonItem.id)}`, { replace: true });
          return;
        }
        if (result.items.length === 0) {
          navigate(`/content/${selectedCollection}/new`, { replace: true });
          return;
        }
      }
    } catch {
      setError('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection, isGroupView, collectionsLoading, offset, search, sort, includeArchived, navigate]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (!selectedCollection) return;
    if (allCollections.length === 0 && collectionsLoading) return;

    const exists =
      allCollections.some((col) => col.collection === selectedCollection) || collectionMeta?.collection === selectedCollection;

    if (!exists && !collectionsLoading) {
      navigate('/content', { replace: true });
    }
  }, [selectedCollection, allCollections, collectionsLoading, collectionMeta, navigate]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleDelete(id: string) {
    if (!selectedCollection) return;

    try {
      await deleteItem(selectedCollection, id);
      await loadItems();
    } catch {
      setError('Failed to delete item');
    }
  }

  async function handleBulkDelete() {
    if (!selectedCollection || selectedIds.size === 0) return;

    setError(null);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteItem(selectedCollection, id)));
      await loadItems();
    } catch {
      setError('Failed to delete selected items');
    }
  }

  function toggleSort(fieldName: string) {
    setSort((current) => {
      if (current === fieldName) {
        return `-${fieldName}`;
      }
      if (current === `-${fieldName}`) {
        return fieldName;
      }
      return fieldName;
    });
    setOffset(0);
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(items.map((item) => String(item.id))));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  const sortField = collectionMeta?.sort_field ?? null;
  const canReorder = Boolean(sortField) && !search;

  async function handleMoveItem(index: number, direction: -1 | 1) {
    if (!selectedCollection || !sortField) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    await reorderItems(
      selectedCollection,
      reordered.map((item, sortIndex) => ({
        id: String(item.id),
        sort: sortIndex + 1 + offset,
      })),
    );
    await loadItems();
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  if (!selectedCollection) {
    return (
      <AppLayout
        title="Content"
        subtitle="Choose a collection to browse and manage its records"
        breadcrumbs={[{ label: 'Content' }]}
      >
        <ContentCollectionList
          collections={visibleCollections}
          isLoading={collectionsLoading}
          onReorder={() => void loadCollections()}
        />
      </AppLayout>
    );
  }

  if (isGroupView && currentCollectionMeta) {
    const breadcrumbs = buildBreadcrumbs(allCollections, currentCollectionMeta);
    const layoutBreadcrumbs = buildContentBreadcrumbs(
      breadcrumbs,
      getCollectionDisplayName(currentCollectionMeta),
    );

    return (
      <AppLayout
        title={getCollectionDisplayName(currentCollectionMeta)}
        subtitle={currentCollectionMeta.note ?? browseFolderSubtitle()}
        breadcrumbs={layoutBreadcrumbs}
      >
        <ContentCollectionList
          collections={visibleCollections}
          isLoading={collectionsLoading}
          inFolderContext
          parentName={getCollectionDisplayName(currentCollectionMeta)}
          headerActions={
            <>
              <button type="button" onClick={() => setCreateModal('folder')} className="btn-secondary">
                <Icon name="folder" className="h-4 w-4" />
                {createFolderTitle()}
              </button>
              <button type="button" onClick={() => setCreateModal('collection')} className="btn-primary">
                <Icon name="plus" className="h-4 w-4" />
                {createCollectionTitle()}
              </button>
            </>
          }
          onReorder={() => void loadCollections()}
        />

        {createModal === 'folder' && (
          <CreateFolderModal
            parent={currentCollectionMeta.collection}
            onClose={() => setCreateModal(null)}
            onCreated={() => void loadCollections()}
          />
        )}

        {createModal === 'collection' && (
          <CreateCollectionModal
            parent={currentCollectionMeta.collection}
            onClose={() => setCreateModal(null)}
            onCreated={() => void loadCollections()}
          />
        )}
      </AppLayout>
    );
  }

  const breadcrumbs = currentCollectionMeta ? buildBreadcrumbs(allCollections, currentCollectionMeta) : [];
  const layoutBreadcrumbs = buildContentBreadcrumbs(
    breadcrumbs,
    currentCollectionMeta
      ? getCollectionDisplayName(currentCollectionMeta)
      : selectedCollection,
  );

  return (
    <AppLayout
      title={
        currentCollectionMeta
          ? getCollectionDisplayName(currentCollectionMeta)
          : selectedCollection
      }
      subtitle={currentCollectionMeta?.note ?? 'Manage collection items'}
      breadcrumbs={layoutBreadcrumbs}
    >
      <div className="space-y-4">
        <div className="page-toolbar">
          <h2 className="section-title mr-auto">Items</h2>
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Icon name="search" className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="input pl-9 w-full min-w-[10rem] sm:w-56"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Include archived
          </label>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button type="button" onClick={() => setBulkDeleteOpen(true)} className="btn-danger">
                <Icon name="trash" className="h-4 w-4" />
                Delete ({selectedIds.size})
              </button>
            )}
            <Link to={`/content/${selectedCollection}/new`} className="btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              Create Item
            </Link>
          </div>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="table-shell">
            <div className="table-scroll">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="table-head">
                <tr>
                  <th className="table-th w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all"
                    />
                  </th>
                  {displayFields.map((f) => (
                    <th key={f.id} className="table-th">
                      <button
                        type="button"
                        onClick={() => toggleSort(f.field)}
                        className="hover:text-slate-900 transition-colors"
                      >
                        {f.field}
                        {sort === f.field ? ' ↑' : sort === `-${f.field}` ? ' ↓' : ''}
                      </button>
                    </th>
                  ))}
                  {canReorder && <th className="table-th w-20">Order</th>}
                  <th className="table-th w-32 hidden lg:table-cell">ID</th>
                  <th className="table-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={displayFields.length + (canReorder ? 4 : 3)} className="table-td">
                      <div className="empty-state py-8">
                        <p className="text-slate-400">No items found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const itemId = String(item.id);
                    return (
                      <tr key={itemId} className="table-row-hover">
                        <td className="table-td">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(itemId)}
                            onChange={(e) => toggleSelect(itemId, e.target.checked)}
                            aria-label={`Select ${itemId}`}
                          />
                        </td>
                        {displayFields.map((f) => (
                          <td key={f.id} className="table-td truncate max-w-xs">
                            {f.interface === 'file' && typeof item[f.field] === 'string' ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={getAssetUrl(String(item[f.field]), {
                                    width: 40,
                                    height: 40,
                                    fit: 'cover',
                                    format: 'webp',
                                  })}
                                  alt=""
                                  className="h-8 w-8 rounded-lg object-cover border border-surface-border"
                                />
                                <span className="font-mono text-xs truncate">{String(item[f.field])}</span>
                              </div>
                            ) : (
                              formatCellValue(f, item[f.field])
                            )}
                          </td>
                        ))}
                        {canReorder && (
                          <td className="table-td">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => void handleMoveItem(index, -1)}
                                className="btn-secondary px-2 py-1 text-xs min-w-0"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={index === items.length - 1}
                                onClick={() => void handleMoveItem(index, 1)}
                                className="btn-secondary px-2 py-1 text-xs min-w-0"
                              >
                                ↓
                              </button>
                            </div>
                          </td>
                        )}
                        <td className="table-td text-slate-400 text-xs font-mono truncate max-w-[120px] hidden lg:table-cell">
                          {collectionMeta?.display_template
                            ? formatDisplayTemplate(collectionMeta.display_template, item)
                            : itemId}
                        </td>
                        <td className="table-td-actions">
                          <TableRowActions
                            editTo={`/content/${selectedCollection}/${itemId}`}
                            onDelete={() => setDeleteTargetId(itemId)}
                            itemLabel={
                              collectionMeta?.display_template
                                ? formatDisplayTemplate(collectionMeta.display_template, item)
                                : itemId
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-surface-border flex items-center justify-between text-sm text-slate-500 bg-surface-muted/30">
                <span>
                  Page {currentPage} of {totalPages} ({totalCount} items)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={offset + PAGE_SIZE >= totalCount}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title="Delete item"
        message="Delete this item? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteTargetId) return;
          void handleDelete(deleteTargetId).finally(() => setDeleteTargetId(null));
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected items"
        message={`Delete ${selectedIds.size} selected item(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          void handleBulkDelete().finally(() => setBulkDeleteOpen(false));
        }}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </AppLayout>
  );
}
