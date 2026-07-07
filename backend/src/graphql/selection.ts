import type { GraphQLResolveInfo, SelectionNode } from 'graphql';

/**
 * Convert a GraphQL selection set into REST-style fields with dot notation.
 */
export function getRequestedFields(info: GraphQLResolveInfo): string[] | null {
  const root = info.fieldNodes[0];
  if (!root?.selectionSet) {
    return null;
  }

  const fields = new Set<string>();
  collectFields(root.selectionSet.selections, '', fields);
  return fields.size > 0 ? Array.from(fields) : null;
}

function collectFields(
  selections: readonly SelectionNode[],
  prefix: string,
  out: Set<string>,
): void {
  for (const node of selections) {
    if (node.kind !== 'Field') {
      continue;
    }

    const name = node.name.value;
    const path = prefix ? `${prefix}.${name}` : name;

    if (node.selectionSet) {
      collectFields(node.selectionSet.selections, path, out);
      continue;
    }

    out.add(path);
  }
}

/**
 * Top-level physical field names requested in a selection set.
 */
export function getTopLevelFields(fieldsRaw: string[] | null): string[] | null {
  if (!fieldsRaw) {
    return null;
  }

  return Array.from(new Set(fieldsRaw.map((field) => field.split('.')[0] ?? field)));
}
