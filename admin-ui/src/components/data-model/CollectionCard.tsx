import { Link } from 'react-router-dom';
import Icon from '../Icon';
import CollectionMaterialIcon from '../CollectionMaterialIcon';
import {
  addCollectionLabel,
  addFolderLabel,
  childCollectionsLabel,
  folderBadgeLabel,
  nestedCollectionBadgeLabel,
  openCollectionLabel,
  openFolderLabel,
} from '../../lib/collectionLabels';
import { isSubCollection } from '../SubCollectionHighlight';
import type { CollectionMeta } from '../../lib/api';
import { getCollectionDisplayName } from '../../lib/collectionDisplay';

interface CollectionCardProps {
  collection: CollectionMeta;
  onDelete?: (name: string) => void;
  onDuplicate?: (name: string) => void;
  onAddFolder?: (collection: CollectionMeta) => void;
  onAddCollection?: (collection: CollectionMeta) => void;
  highlightAsSubCollection?: boolean;
}

export default function CollectionCard({
  collection,
  onDelete,
  onDuplicate,
  onAddFolder,
  onAddCollection,
  highlightAsSubCollection = false,
}: CollectionCardProps) {
  const color = collection.color ?? 'var(--app-accent)';
  const isSub = highlightAsSubCollection || isSubCollection(collection);
  const displayName = getCollectionDisplayName(collection);

  const metaText = collection.is_group
    ? childCollectionsLabel(collection.child_count)
    : `${collection.field_count} field${collection.field_count === 1 ? '' : 's'}`;

  return (
    <article className={`dm-item-card group ${isSub ? 'is-nested' : ''}`}>
      <div className="dm-item-card-body">
        <div className="dm-item-card-header">
          <span
            className="dm-row-icon"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 14%, var(--app-surface))`,
              color,
            }}
          >
            <CollectionMaterialIcon
              icon={collection.icon}
              isGroup={collection.is_group}
              size={16}
            />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to={`/settings/data-model/${collection.collection}`}
              className="dm-row-title block truncate"
            >
              {displayName}
            </Link>
            {isSub && collection.parent && (
              <p className="collection-list-note">Under {collection.parent}</p>
            )}
            {collection.note ? (
              <p className="collection-list-note">{collection.note}</p>
            ) : (
              <p className="collection-list-note italic opacity-70">No description</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {isSub && (
            <span className="dm-badge-neutral dm-badge">
              <Icon name="component" className="h-2.5 w-2.5" />
              {nestedCollectionBadgeLabel()}
            </span>
          )}
          {collection.is_group && <span className="dm-badge">{folderBadgeLabel()}</span>}
          {collection.singleton && <span className="dm-badge">Singleton</span>}
          {collection.system && <span className="dm-badge-neutral dm-badge">System</span>}
          {collection.hidden && (
            <span className="dm-badge-neutral dm-badge">Hidden</span>
          )}
        </div>

        <p className="collection-list-count mt-2">{metaText}</p>

        {!collection.system && (
          <div className="dm-item-card-footer">
            <Link
              to={`/settings/data-model/${collection.collection}`}
              className="dm-item-card-action"
            >
              {collection.is_group ? openFolderLabel() : openCollectionLabel()}
            </Link>
            {collection.is_group && onAddFolder && (
              <button
                type="button"
                onClick={() => onAddFolder(collection)}
                className="dm-item-card-action-muted"
              >
                <Icon name="folder" className="h-3 w-3" />
                {addFolderLabel()}
              </button>
            )}
            {collection.is_group && onAddCollection && (
              <button
                type="button"
                onClick={() => onAddCollection(collection)}
                className="dm-item-card-action-muted"
              >
                <Icon name="plus" className="h-3 w-3" />
                {addCollectionLabel()}
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={() => onDuplicate(collection.collection)}
                className="dm-item-card-action-muted"
              >
                Duplicate
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(collection.collection)}
                className="dm-item-card-action-danger"
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
