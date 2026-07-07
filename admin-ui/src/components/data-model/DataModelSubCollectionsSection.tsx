import { useState } from 'react';
import CollectionCard from './CollectionCard';
import CreateSubCollectionModal from '../CreateSubCollectionModal';
import Icon from '../Icon';
import { subCollectionSectionClass } from '../SubCollectionHighlight';
import type { CollectionMeta } from '../../lib/api';

interface DataModelSubCollectionsSectionProps {
  collections: CollectionMeta[];
  parentCollection: CollectionMeta;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function DataModelSubCollectionsSection({
  collections,
  parentCollection,
  isLoading,
  onRefresh,
}: DataModelSubCollectionsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParent, setCreateParent] = useState<CollectionMeta | null>(null);
  const activeParent = createParent ?? parentCollection;

  function openCreate(parent: CollectionMeta) {
    setCreateParent(parent);
    setShowCreateModal(true);
  }

  function closeCreate() {
    setShowCreateModal(false);
    setCreateParent(null);
  }

  return (
    <section className={`space-y-3 ${collections.length > 0 ? subCollectionSectionClass() : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Icon name="component" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Sub-collections</h2>
            <p className="text-xs text-violet-600/80">Nested under {parentCollection.collection}</p>
          </div>
        </div>
        <button type="button" onClick={() => openCreate(parentCollection)} className="btn-secondary text-sm">
          <Icon name="plus" className="h-4 w-4" />
          Add sub-collection
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading sub-collections...</p>
      ) : collections.length === 0 ? (
        <div className="card px-6 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No sub-collections yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Add a sub-collection under {parentCollection.collection}.
          </p>
          <button type="button" onClick={() => openCreate(parentCollection)} className="btn-secondary mt-4 inline-flex">
            <Icon name="plus" className="h-4 w-4" />
            Add sub-collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((col) => (
            <CollectionCard
              key={col.collection}
              collection={col}
              onAddSubCollection={openCreate}
              highlightAsSubCollection
            />
          ))}
        </div>
      )}

      {showCreateModal && activeParent && (
        <CreateSubCollectionModal
          parent={activeParent}
          onClose={closeCreate}
          onCreated={() => onRefresh?.()}
        />
      )}
    </section>
  );
}
