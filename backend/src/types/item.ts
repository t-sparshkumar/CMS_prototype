export type FilterOperator = '_eq' | '_neq' | '_lt' | '_lte' | '_gt' | '_gte' | '_in' | '_contains' | '_null';

export const FILTER_OPERATORS: FilterOperator[] = [
  '_eq',
  '_neq',
  '_lt',
  '_lte',
  '_gt',
  '_gte',
  '_in',
  '_contains',
  '_null',
];

export type ItemRecord = Record<string, unknown>;

export interface ItemQueryOptions {
  filter: Record<string, Partial<Record<FilterOperator, string | string[]>>>;
  sort: Array<{ column: string; order: 'asc' | 'desc' }>;
  limit: number;
  offset: number;
  fields: string[] | null;
  fieldsRaw: string[] | null;
  search: string | null;
  includeArchived: boolean;
}

export interface ItemListResult {
  items: ItemRecord[];
  totalCount: number;
  filterCount: number;
}

export interface CreateItemInput {
  [key: string]: unknown;
}

export interface UpdateItemInput {
  [key: string]: unknown;
}

export interface ReorderItemsInput {
  items: Array<{ id: string; sort: number }>;
}
