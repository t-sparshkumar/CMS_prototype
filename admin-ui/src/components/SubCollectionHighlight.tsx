import type { CollectionMeta } from '../lib/api';

export function isSubCollection(collection: CollectionMeta): boolean {
  return Boolean(collection.parent);
}
