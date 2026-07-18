import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import DataModelCollectionList from '../../components/data-model/DataModelCollectionList';
import ConfirmDialog from '../../components/data-model/ConfirmDialog';
import Modal from '../../components/Modal';
import SchemaDiffModal from '../../components/data-model/SchemaDiffModal';
import CreateFolderModal from '../../components/data-model/CreateFolderModal';
import CreateCollectionModal from '../../components/data-model/CreateCollectionModal';
import DataModelGuide from '../../components/data-model/DataModelGuide';
import Icon from '../../components/Icon';
import { createCollectionTitle, createFolderTitle } from '../../lib/collectionLabels';
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

type CreateModal = 'folder' | 'collection' | null;

export default function CollectionsListPage() {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [search, setSearch] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<CreateModal>(null);
  const [createParent, setCreateParent] = useState<string | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<Record<string, unknown> | null>(null);
  const [schemaDiff, setSchemaDiff] = useState<SchemaDiff | null>(null);
  const [importMeta, setImportMeta] = useState<{ source?: string; warnings?: string[]; stats?: Record<string, number> } | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

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

  function openCreate(type: 'folder' | 'collection', parent: string | null = null) {
    setCreateParent(parent);
    setCreateModal(type);
  }

  function closeCreate() {
    setCreateModal(null);
    setCreateParent(null);
  }

  async function handleImportSchema() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const snapshot = JSON.parse(await file.text()) as Record<string, unknown>;
      const { diff, meta } = await diffSchemaSnapshot(snapshot);
      setPendingSnapshot(snapshot);
      setSchemaDiff(diff);
      setImportMeta(meta ?? null);
      setDiffOpen(true);
    };
    input.click();
  }

  return (
    <AppLayout
      title="Data Model"
      subtitle="Manage collections, fields, and schema"
      breadcrumbs={[{ label: 'Data Model' }]}
    >
      <>
        <div className="mb-5">
          <DataModelGuide />
        </div>
        <div className="page-toolbar dm-toolbar">
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

          <label className="dm-toolbar-toggle flex items-center gap-2 text-sm font-medium text-[var(--app-text-muted)] cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showSystem}
              onChange={(e) => setShowSystem(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[var(--app-border)] text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
            />
            Show system
          </label>

          <span className="dm-toolbar-divider" aria-hidden="true" />

          <span className="collection-list-meta dm-toolbar-meta">
            {filteredCount} collection{filteredCount === 1 ? '' : 's'}
          </span>

          <div className="dm-toolbar-buttons">
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
              className="btn-secondary text-sm"
            >
              Export
            </button>
            <button type="button" onClick={() => void handleImportSchema()} className="btn-secondary text-sm">
              Import
            </button>
            <button type="button" onClick={() => openCreate('folder')} className="btn-secondary text-sm">
              <Icon name="folder" className="h-4 w-4" />
              {createFolderTitle()}
            </button>
            <button type="button" onClick={() => openCreate('collection')} className="btn-primary text-sm">
              <Icon name="plus" className="h-4 w-4" />
              {createCollectionTitle()}
            </button>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {isLoading ? (
          <div className="dm-shell">
            <div className="dm-empty text-sm">Loading collections...</div>
          </div>
        ) : (
          <DataModelCollectionList
            collections={collections}
            isLoading={false}
            search={search}
            onDelete={setDeleteTarget}
            onDuplicate={(name) => {
              setDuplicateSource(name);
              setDuplicateName(`${name}_copy`);
            }}
            onAddFolder={(col) => openCreate('folder', col.collection)}
            onAddCollection={(col) => openCreate('collection', col.collection)}
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

      {createModal === 'folder' && (
        <CreateFolderModal
          parent={createParent}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            void load();
          }}
        />
      )}

      {createModal === 'collection' && (
        <CreateCollectionModal
          parent={createParent}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            void load();
          }}
        />
      )}

      <SchemaDiffModal
        open={diffOpen}
        diff={schemaDiff}
        importMeta={importMeta}
        onCancel={() => {
          setDiffOpen(false);
          setPendingSnapshot(null);
          setImportMeta(null);
        }}
        onConfirm={() => {
          if (!pendingSnapshot) return;
          void applySchemaSnapshot(pendingSnapshot).then(() => {
            setDiffOpen(false);
            setPendingSnapshot(null);
            setImportMeta(null);
            return load();
          });
        }}
      />

      <Modal
        open={duplicateSource !== null}
        title="Duplicate collection"
        onClose={() => setDuplicateSource(null)}
        footer={
          <>
            <button type="button" onClick={() => setDuplicateSource(null)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              disabled={!duplicateName.trim()}
              onClick={() => {
                if (!duplicateSource || !duplicateName.trim()) return;
                void duplicateCollection(duplicateSource, duplicateName.trim())
                  .then(load)
                  .finally(() => setDuplicateSource(null));
              }}
              className="btn-primary"
            >
              Duplicate
            </button>
          </>
        }
      >
        <label className="label">New collection name</label>
        <input
          autoFocus
          value={duplicateName}
          onChange={(e) => setDuplicateName(e.target.value)}
          className="input"
          placeholder="collection_name"
        />
      </Modal>
    </AppLayout>
  );
}
