/**
 * Convert a collection name to a GraphQL type name (e.g. articles -> Article).
 */
export function toTypeName(collection: string): string {
  const pascal = collection
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  if (pascal.endsWith('s') && pascal.length > 1) {
    return pascal.slice(0, -1);
  }

  return pascal;
}

/**
 * Build the list query field name for a collection.
 */
export function toListFieldName(collection: string): string {
  return collection;
}

/**
 * Build the single-item query field name for a collection.
 */
export function toByIdFieldName(collection: string): string {
  return `${collection}_by_id`;
}

/**
 * Build create mutation field name for a collection.
 */
export function toCreateMutationName(collection: string): string {
  return `create_${collection}_item`;
}

/**
 * Build update mutation field name for a collection.
 */
export function toUpdateMutationName(collection: string): string {
  return `update_${collection}_item`;
}

/**
 * Build delete mutation field name for a collection.
 */
export function toDeleteMutationName(collection: string): string {
  return `delete_${collection}_item`;
}
