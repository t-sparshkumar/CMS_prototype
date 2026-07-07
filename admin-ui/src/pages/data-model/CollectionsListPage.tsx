import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import DataModelCollectionList from '../../components/data-model/DataModelCollectionList';
import ConfirmDialog from '../../components/data-model/ConfirmDialog';
import SchemaDiffModal from '../../components/data-model/SchemaDiffModal';
import CreateSubCollectionModal from '../../components/CreateSubCollectionModal';
import DataModelGuide from '../../components/data-model/DataModelGuide';
import Icon from '../../components/Icon';
import {
  applySchemaSnapshot,
  deleteCollection,
  diffSchemaSnapshot,
  duplicateCollection,
  fetchCollections,
  fetchSchemaSnapshot,
  type CollectionMeta,
  type SchemaDiff,
} from '../../lib/api';

export default function CollectionsListPage() {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [search, setSearch] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [subCollectionParent, setSubCollectionParent] = useState<CollectionMeta | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<Record<string, unknown> | null>(null);
  const [schemaDiff, setSchemaDiff] = useState<SchemaDiff | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCollections(await fetchCollections({ includeHidden: showSystem }));
    } catch {
      setError('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  }, [showSystem]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCount = useMemo(() => {
    if (!search.trim()) return collections.filter((c) => !c.parent).length;
    const q = search.toLowerCase();
    return collections.filter(
      (c) =>
        c.collection.toLowerCase().includes(q) ||
        (c.note?.toLowerCase().includes(q) ?? false),
    ).length;
  }, [collections, search]);

  async function handleImportSchema() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const snapshot = JSON.parse(await file.text()) as Record<string, unknown>;
      const diff = await diffSchemaSnapshot(snapshot);
      setPendingSnapshot(snapshot);
      setSchemaDiff(diff);
      setDiffOpen(true);
    };
    input.click();
  }

  return (
    <AppLayout title="Data Model" subtitle="Manage collections, fields, and schema">
      <>
        <div className="mb-5">
          <DataModelGuide />
        </div>
        <div className="page-toolbar">
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          <span className="toolbar-divider" aria-hidden="true" />

          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showSystem}
              onChange={(e) => setShowSystem(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Show system
          </label>

          <span className="toolbar-count">
            {filteredCount} collection{filteredCount === 1 ? '' : 's'}
          </span>

          <span className="toolbar-divider" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() =>
                void fetchSchemaSnapshot().then((s) => {
                  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'cms-schema-snapshot.json';
                  a.click();
                  URL.revokeObjectURL(url);
                })
              }
              className="btn-secondary"
            >
              Export
            </button>
            <button type="button" onClick={() => void handleImportSchema()} className="btn-secondary">
              Import
            </button>
            <Link to="/settings/data-model/new" className="btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              Create Collection
            </Link>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {isLoading ? (
          <div className="dm-collection-shell">
            <div className="px-6 py-12 text-center text-sm text-slate-400">Loading collections...</div>
          </div>
        ) : (
          <DataModelCollectionList
            collections={collections}
            isLoading={false}
            search={search}
            onDelete={setDeleteTarget}
            onDuplicate={(name) => {
              const target = window.prompt('Duplicate as collection name:', `${name}_copy`);
              if (target) void duplicateCollection(name, target).then(load);
            }}
            onAddSubCollection={setSubCollectionParent}
            onRefresh={() => void load()}
          />
        )}
      </>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete collection"
        message={`Delete "${deleteTarget}"? This drops the table and all data.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return;
          void deleteCollection(deleteTarget).then(load).finally(() => setDeleteTarget(null));
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {subCollectionParent && (
        <CreateSubCollectionModal
          parent={subCollectionParent}
          onClose={() => setSubCollectionParent(null)}
          onCreated={() => void load()}
        />
      )}

      <SchemaDiffModal
        open={diffOpen}
        diff={schemaDiff}
        onCancel={() => {
          setDiffOpen(false);
          setPendingSnapshot(null);
        }}
        onConfirm={() => {
          if (!pendingSnapshot) return;
          void applySchemaSnapshot(pendingSnapshot).then(() => {
            setDiffOpen(false);
            setPendingSnapshot(null);
            return load();
          });
        }}
      />
    </AppLayout>
  );
}
