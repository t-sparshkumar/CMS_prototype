import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ContentCollectionList, { buildBreadcrumbs } from '../components/ContentCollectionList';
import Icon from '../components/Icon';
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
    } catch {
      setError('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection, isGroupView, collectionsLoading, offset, search, sort, includeArchived]);

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
    if (!window.confirm('Delete this item?')) return;

    try {
      await deleteItem(selectedCollection, id);
      await loadItems();
    } catch {
      setError('Failed to delete item');
    }
  }

  async function handleBulkDelete() {
    if (!selectedCollection || selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected item(s)?`)) return;

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
      <AppLayout title="Content" subtitle="Choose a collection to browse and manage its records">
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

    return (
      <AppLayout
        title={currentCollectionMeta.collection}
        subtitle={currentCollectionMeta.note ?? 'Browse sub-collections in this group'}
      >
        <ContentCollectionList
          collections={visibleCollections}
          isLoading={collectionsLoading}
          breadcrumbs={breadcrumbs}
          inSubCollectionContext
          parentName={currentCollectionMeta.collection}
          onReorder={() => void loadCollections()}
        />
      </AppLayout>
    );
  }

  const breadcrumbs = currentCollectionMeta ? buildBreadcrumbs(allCollections, currentCollectionMeta) : [];

  return (
    <AppLayout
      title={currentCollectionMeta?.collection ?? selectedCollection}
      subtitle={currentCollectionMeta?.note ?? 'Manage collection items'}
    >
      <div className="space-y-6">
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
            <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-medium text-slate-700">{selectedCollection}</span>
          </nav>
        )}

        <div className="space-y-4">
        <div className="page-toolbar">
          <h2 className="section-title mr-auto">Items</h2>
          <div className="flex flex-wrap items-center gap-3">
          {breadcrumbs.length === 0 && (
            <Link
              to="/content"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"
            >
              <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
              All collections
            </Link>
          )}

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
              className="input pl-9 w-56"
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
              <button type="button" onClick={() => void handleBulkDelete()} className="btn-danger">
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
            <table className="w-full text-sm">
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
                  <th className="table-th">ID</th>
                  <th className="table-th" />
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
                        <td className="table-td text-slate-400 text-xs font-mono truncate max-w-[120px]">
                          {collectionMeta?.display_template
                            ? formatDisplayTemplate(collectionMeta.display_template, item)
                            : itemId}
                        </td>
                        <td className="table-td text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              to={`/content/${selectedCollection}/${itemId}`}
                              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-semibold"
                            >
                              <Icon name="edit" className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDelete(itemId)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-semibold"
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

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
      </div>
    </AppLayout>
  );
}
