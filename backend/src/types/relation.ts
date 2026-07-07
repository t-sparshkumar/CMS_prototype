export type SchemaOnDelete = 'SET NULL' | 'CASCADE' | 'RESTRICT' | 'NO ACTION';

export interface CmsRelationRow {
  id: number;
  many_collection: string;
  many_field: string;
  one_collection: string;
  one_field: string;
  junction_collection: string | null;
  sort_field: string | null;
  schema_on_delete: SchemaOnDelete | null;
}

export interface RelationMeta extends CmsRelationRow {}

export type RelationKind = 'm2o' | 'o2m' | 'm2m' | 'm2a';

export interface RelationFieldOptions {
  related_collection?: string;
  related_field?: string;
  template?: string;
  with_sort?: boolean;
}

export interface CreateRelationFieldInput {
  related_collection: string;
  related_field?: string;
  schema_on_delete?: SchemaOnDelete;
}
