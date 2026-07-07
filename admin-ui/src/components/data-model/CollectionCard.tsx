import { Link } from 'react-router-dom';
import Icon from '../Icon';
import {
  isSubCollection,
  SubCollectionBadge,
  SubCollectionParentLink,
} from '../SubCollectionHighlight';
import type { CollectionMeta } from '../../lib/api';

interface CollectionCardProps {
  collection: CollectionMeta;
  onDelete?: (name: string) => void;
  onDuplicate?: (name: string) => void;
  onAddSubCollection?: (collection: CollectionMeta) => void;
  /** Force sub-collection styling (e.g. inside a parent's sub-collections section). */
  highlightAsSubCollection?: boolean;
}

function NestedCollectionsBadge() {
  return (
    <span className="badge-tag-neutral">
      <Icon name="component" className="h-3 w-3" />
      Has nested
    </span>
  );
}

export default function CollectionCard({
  collection,
  onDelete,
  onDuplicate,
  onAddSubCollection,
  highlightAsSubCollection = false,
}: CollectionCardProps) {
  const color = collection.color ?? '#6366f1';
  const initials = collection.collection.slice(0, 2).toUpperCase();
  const isSub = highlightAsSubCollection || isSubCollection(collection);

  const metaText = collection.is_group
    ? `${collection.child_count} sub-collection${collection.child_count === 1 ? '' : 's'}`
    : `${collection.field_count} field${collection.field_count === 1 ? '' : 's'}`;

  return (
    <article className={`collection-card group ${isSub ? 'collection-card-sub' : ''}`}>
      <div
        className="collection-card-accent"
        style={{ backgroundColor: isSub ? '#8b5cf6' : color }}
      />

      <div className="collection-card-body">
        <div className="collection-card-header">
          <span
            className="collection-card-avatar"
            style={{ backgroundColor: isSub ? '#7c3aed' : color }}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to={`/settings/data-model/${collection.collection}`}
              className="collection-card-title block"
            >
              {collection.collection}
            </Link>
            {isSub && collection.parent && (
              <SubCollectionParentLink
                parent={collection.parent}
                basePath="/settings/data-model"
                className="mt-1"
              />
            )}
            {collection.note ? (
              <p className="collection-card-desc">{collection.note}</p>
            ) : (
              <p className="collection-card-desc text-slate-400/80 italic">No description</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {isSub && <SubCollectionBadge />}
          {!isSub && collection.child_count > 0 && <NestedCollectionsBadge />}
          {collection.is_group && <span className="badge-tag-brand">Group</span>}
          {collection.singleton && <span className="badge-tag-brand">Singleton</span>}
          {collection.system && <span className="badge-tag-neutral">System</span>}
          {collection.hidden && (
            <span className="badge-tag bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10">
              Hidden
            </span>
          )}
        </div>

        <p className="collection-card-meta">{metaText}</p>

        {!collection.system && (
          <div className="collection-card-footer">
            <Link
              to={`/settings/data-model/${collection.collection}`}
              className="collection-card-action"
            >
              Open
            </Link>
            {onAddSubCollection && (
              <button
                type="button"
                onClick={() => onAddSubCollection(collection)}
                className="collection-card-action-muted"
              >
                <Icon name="plus" className="h-3 w-3" />
                Add sub-collection
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={() => onDuplicate(collection.collection)}
                className="collection-card-action-muted"
              >
                Duplicate
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(collection.collection)}
                className="collection-card-action-danger"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
