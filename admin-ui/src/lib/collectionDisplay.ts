import type { CollectionMeta } from './api';
import { humanizeFieldName } from './fieldUtils';

export function getCollectionDisplayName(
  meta: Pick<CollectionMeta, 'collection' | 'display_name'>,
): string {
  const trimmed = meta.display_name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return humanizeFieldName(meta.collection);
}
