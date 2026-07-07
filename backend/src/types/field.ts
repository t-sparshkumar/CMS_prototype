export const SQL_FIELD_TYPES = [
  'string',
  'text',
  'integer',
  'bigInteger',
  'float',
  'decimal',
  'boolean',
  'datetime',
  'date',
  'time',
  'json',
  'uuid',
  'hash',
  'csv',
  'binary',
] as const;

export type SqlFieldType = (typeof SQL_FIELD_TYPES)[number];

export const FIELD_INTERFACES = [
  'input',
  'autocomplete',
  'block-editor',
  'code',
  'textarea',
  'wysiwyg',
  'markdown',
  'tags',
  'seo',
  'number',
  'slug',
  'toggle',
  'datetime',
  'repeater',
  'map',
  'color',
  'select-dropdown',
  'icon',
  'checkboxes',
  'checkboxes-tree',
  'select-multiple-dropdown',
  'radio-buttons',
  'file',
  'file-image',
  'files',
  'many-to-one',
  'one-to-many',
  'many-to-many',
  'many-to-any',
  'tree-view',
  'translations',
  'collection-item-dropdown',
  'collection-item-multiple-dropdown',
  'header',
  'divider',
  'presentation-buttons',
  'notice',
  'presentation-m2a',
  'super-header',
  'group-accordion',
  'group-detail',
  'group-raw',
  'group-tabs',
  'group-tab',
  'hash',
  'slider',
  'json',
] as const;

export type FieldInterface = (typeof FIELD_INTERFACES)[number];

export const PRESENTATIONAL_INTERFACES = [
  'header',
  'divider',
  'presentation-buttons',
  'notice',
  'presentation-m2a',
  'super-header',
  'group-accordion',
  'group-detail',
  'group-raw',
  'group-tabs',
  'group-tab',
] as const;

export interface CmsFieldRow {
  id: number;
  collection: string;
  field: string;
  type: string;
  special: string | null;
  interface: string;
  options: Record<string, unknown> | null;
  display: string | null;
  display_options: Record<string, unknown> | null;
  readonly: boolean;
  hidden: boolean;
  sort: number;
  width: number;
  required: boolean;
  group: string | null;
  conditions: Record<string, unknown> | null;
  note: string | null;
  default_value: string | null;
  unique: boolean;
  nullable: boolean;
  is_indexed: boolean;
  searchable: boolean;
  validation: Record<string, unknown> | null;
}

export interface CreateFieldInput {
  field: string;
  type?: SqlFieldType | 'alias';
  interface?: string;
  options?: Record<string, unknown> | null;
  display?: string | null;
  display_options?: Record<string, unknown> | null;
  readonly?: boolean;
  hidden?: boolean;
  sort?: number;
  width?: number;
  required?: boolean;
  group?: string | null;
  note?: string | null;
  default_value?: string | null;
  unique?: boolean;
  nullable?: boolean;
  is_indexed?: boolean;
  searchable?: boolean;
  validation?: Record<string, unknown> | null;
}

export interface UpdateFieldInput {
  type?: string;
  interface?: string;
  options?: Record<string, unknown> | null;
  display?: string | null;
  display_options?: Record<string, unknown> | null;
  readonly?: boolean;
  hidden?: boolean;
  sort?: number;
  width?: number;
  required?: boolean;
  group?: string | null;
  conditions?: Record<string, unknown> | null;
  note?: string | null;
  default_value?: string | null;
  unique?: boolean;
  nullable?: boolean;
  is_indexed?: boolean;
  searchable?: boolean;
  validation?: Record<string, unknown> | null;
}

export interface FieldMeta extends CmsFieldRow {
  is_system: boolean;
  effective_hidden?: boolean;
  effective_readonly?: boolean;
  effective_required?: boolean;
}

export interface FieldValidationRules {
  min_length?: number;
  max_length?: number;
  regex?: string;
  min?: number;
  max?: number;
}
