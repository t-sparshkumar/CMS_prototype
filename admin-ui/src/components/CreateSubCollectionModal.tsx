import CreateCollectionModal from './data-model/CreateCollectionModal';
import type { CollectionMeta } from '../lib/api';

interface CreateSubCollectionModalProps {
  parent: CollectionMeta;
  onClose: () => void;
  onCreated: (collection: CollectionMeta) => void;
}

/** @deprecated Use CreateCollectionModal instead */
export default function CreateSubCollectionModal({
  parent,
  onClose,
  onCreated,
}: CreateSubCollectionModalProps) {
  return (
    <CreateCollectionModal
      parent={parent.collection}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}
