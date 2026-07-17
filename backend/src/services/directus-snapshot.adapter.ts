import type { CmsCollectionRow } from '../types/collection.js';
import type { CmsFieldRow } from '../types/field.js';
import type { CmsRelationRow, SchemaOnDelete } from '../types/relation.js';
import type { SchemaSnapshot } from './schema.service.js';

const SYSTEM_COLLECTION_MAP: Record<string, string> = {
  directus_users: 'cms_users',
  directus_files: 'cms_files',
  directus_folders: 'cms_folders',
  directus_roles: 'cms_roles',
  directus_permissions: 'cms_permissions',
};

const INTERFACE_MAP: Record<string, string> = {
  boolean: 'toggle',
  'input-multiline': 'textarea',
  'input-rich-text-html': 'wysiwyg',
  'input-rich-text-md': 'markdown',
  'input-code': 'code',
  list: 'repeater',
  'list-o2m': 'one-to-many',
  'list-m2m': 'many-to-many',
  'list-m2a': 'many-to-any',
  'select-dropdown-m2o': 'many-to-one',
  'directus-labs-experimental-m2a-interface': 'many-to-any',
  'presentation-divider': 'divider',
  'select-color': 'color',
  'select-icon': 'icon',
  'select-multiple-checkbox': 'checkboxes',
  'select-multiple-dropdown': 'select-multiple-dropdown',
  'select-radio': 'radio-buttons',
};

const TYPE_MAP: Record<string, string> = {
  dateTime: 'datetime',
  timestamp: 'datetime',
  alias: 'alias',
};

const WIDTH_MAP: Record<string, number> = {
  full: 12,
  half: 6,
  fill: 12,
};

const IMPORT_SKIP_FIELDS = new Set(['date_created', 'date_updated', 'user_created', 'user_updated']);

export interface DirectusSnapshotInput {
  data?: DirectusSnapshotData;
  version?: number;
  directus?: string;
  collections?: DirectusCollection[];
  fields?: DirectusField[];
  relations?: DirectusRelation[];
}

interface DirectusSnapshotData {
  version?: number;
  directus?: string;
  vendor?: string;
  collections?: DirectusCollection[];
  fields?: DirectusField[];
  relations?: DirectusRelation[];
}

interface DirectusCollection {
  collection: string;
  meta?: {
    icon?: string | null;
    color?: string | null;
    display_template?: string | null;
    note?: string | null;
    singleton?: boolean;
    sort_field?: string | null;
    archive_field?: string | null;
    archive_value?: string | null;
    unarchive_value?: string | null;
    hidden?: boolean;
    group?: string | null;
    sort?: number | null;
  };
  schema?: {
    name?: string;
  } | null;
}

interface DirectusField {
  collection: string;
  field: string;
  type: string;
  meta?: {
    interface?: string | null;
    options?: Record<string, unknown> | null;
    display?: string | null;
    display_options?: Record<string, unknown> | null;
    readonly?: boolean;
    hidden?: boolean;
    sort?: number | null;
    width?: string | number | null;
    required?: boolean;
    group?: string | null;
    conditions?: Record<string, unknown> | null;
    note?: string | null;
    validation?: Record<string, unknown> | null;
    special?: string | string[] | null;
    translations?: unknown;
  } | null;
  schema?: {
    is_nullable?: boolean;
    is_unique?: boolean;
    is_indexed?: boolean;
    default_value?: unknown;
    foreign_key_table?: string | null;
    foreign_key_column?: string | null;
  } | null;
}

interface DirectusRelation {
  collection: string;
  field: string;
  related_collection?: string | null;
  meta?: {
    many_collection?: string;
    many_field?: string;
    one_collection?: string | null;
    one_field?: string | null;
    junction_field?: string | null;
    sort_field?: string | null;
  } | null;
  schema?: {
    on_delete?: string | null;
  } | null;
}

export interface DirectusConversionResult extends SchemaSnapshot {
  source: 'directus';
  warnings: string[];
  stats: {
    collections: number;
    folders: number;
    fields: number;
    skipped_fields: number;
    skipped_collections: number;
  };
}

export function isDirectusSnapshot(input: unknown): input is DirectusSnapshotInput {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const root = input as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;

  return (
    Array.isArray(data.collections) &&
    Array.isArray(data.fields) &&
    (typeof data.version === 'number' || typeof root.directus === 'string' || typeof data.directus === 'string')
  );
}

export function normalizeIdentifier(name: string): string {
  const snake = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!snake) {
    return 'unnamed';
  }

  return /^[a-z]/.test(snake) ? snake : `f_${snake}`;
}

function mapCollectionName(name: string): string {
  const mapped = SYSTEM_COLLECTION_MAP[name] ?? name;
  return normalizeIdentifier(mapped);
}

function mapFieldType(type: string): string {
  return TYPE_MAP[type] ?? type;
}

function mapInterface(iface: string | null | undefined, type: string): string {
  if (!iface) {
    return type === 'boolean' ? 'toggle' : type === 'json' ? 'json' : 'input';
  }
  return INTERFACE_MAP[iface] ?? iface;
}

function mapWidth(width: string | number | null | undefined): number {
  if (typeof width === 'number') {
    return width;
  }
  if (!width) {
    return 12;
  }
  return WIDTH_MAP[width] ?? 12;
}

function mapSpecial(special: string | string[] | null | undefined): string | null {
  if (!special) {
    return null;
  }
  if (Array.isArray(special)) {
    return special.join(',') || null;
  }
  return special;
}

function mapOnDelete(value: string | null | undefined): SchemaOnDelete | null {
  if (!value) {
    return 'SET NULL';
  }
  const normalized = value.toUpperCase().replace(/\s+/g, ' ');
  if (normalized === 'SET NULL' || normalized === 'CASCADE' || normalized === 'RESTRICT' || normalized === 'NO ACTION') {
    return normalized;
  }
  return 'SET NULL';
}

function unwrapDirectusData(input: DirectusSnapshotInput): DirectusSnapshotData {
  if (input.data) {
    return input.data;
  }
  return input as DirectusSnapshotData;
}

function isFolderCollection(collection: DirectusCollection): boolean {
  return !collection.schema;
}

function remapOptions(
  options: Record<string, unknown> | null | undefined,
  remapName: (name: string) => string,
): Record<string, unknown> | null {
  if (!options) {
    return null;
  }

  const next = JSON.parse(JSON.stringify(options)) as Record<string, unknown>;

  if (typeof next.related_collection === 'string') {
    next.related_collection = remapName(next.related_collection);
  }
  if (typeof next.template === 'string') {
    next.template = next.template;
  }

  return next;
}

/**
 * Convert a Directus schema snapshot into the CMS schema snapshot format.
 */
export function convertDirectusSnapshot(input: DirectusSnapshotInput): DirectusConversionResult {
  const data = unwrapDirectusData(input);
  const warnings: string[] = [];

  const rawCollections = data.collections ?? [];
  const rawFields = data.fields ?? [];
  const rawRelations = data.relations ?? [];

  const collectionNameMap = new Map<string, string>();
  for (const collection of rawCollections) {
    const normalized = mapCollectionName(collection.collection);
    if (collectionNameMap.has(collection.collection) && collectionNameMap.get(collection.collection) !== normalized) {
      warnings.push(`Collection "${collection.collection}" collides after normalization`);
    }
    collectionNameMap.set(collection.collection, normalized);
  }

  const remapName = (name: string): string => {
    if (collectionNameMap.has(name)) {
      return collectionNameMap.get(name)!;
    }
    const mapped = mapCollectionName(name);
    collectionNameMap.set(name, mapped);
    return mapped;
  };

  const folderNames = new Set(
    rawCollections.filter(isFolderCollection).map((collection) => remapName(collection.collection)),
  );

  const collections: CmsCollectionRow[] = [];
  let skippedCollections = 0;

  for (const collection of rawCollections) {
    const name = remapName(collection.collection);
    const meta = collection.meta ?? {};
    const isGroup = isFolderCollection(collection);

    if (name.startsWith('cms_') && !['cms_users', 'cms_files', 'cms_folders'].includes(name)) {
      skippedCollections += 1;
      warnings.push(`Skipped reserved/system collection "${collection.collection}"`);
      continue;
    }

    collections.push({
      collection: name,
      display_name: null,
      icon: meta.icon ?? null,
      color: meta.color ?? null,
      display_template: meta.display_template ?? null,
      note: meta.note ?? null,
      singleton: Boolean(meta.singleton),
      sort_field: meta.sort_field ? normalizeIdentifier(meta.sort_field) : null,
      archive_field: meta.archive_field ? normalizeIdentifier(meta.archive_field) : null,
      archive_value: meta.archive_value ?? null,
      unarchive_value: meta.unarchive_value ?? null,
      hidden: Boolean(meta.hidden),
      system: false,
      activity_tracking: true,
      parent: meta.group ? remapName(meta.group) : null,
      is_group: isGroup,
      sort: Number(meta.sort ?? 0),
    });
  }

  const fields: Array<Omit<CmsFieldRow, 'id'>> = [];
  let skippedFields = 0;
  const seenFieldKeys = new Set<string>();

  for (const field of rawFields) {
    const collection = remapName(field.collection);
    const fieldName = normalizeIdentifier(field.field);
    const key = `${collection}.${fieldName}`;

    if (folderNames.has(collection)) {
      skippedFields += 1;
      continue;
    }

    if (IMPORT_SKIP_FIELDS.has(fieldName)) {
      skippedFields += 1;
      continue;
    }

    if (seenFieldKeys.has(key)) {
      skippedFields += 1;
      warnings.push(`Skipped duplicate field "${field.collection}.${field.field}"`);
      continue;
    }
    seenFieldKeys.add(key);

    const meta = field.meta ?? {};
    const schema = field.schema ?? {};
    const mappedType = mapFieldType(field.type);
    const mappedInterface = mapInterface(meta.interface, mappedType);

    if (mappedType === 'alias' || mappedInterface.startsWith('group-') || mappedInterface === 'presentation-m2a') {
      fields.push({
        collection,
        field: fieldName,
        type: 'alias',
        special: mapSpecial(meta.special),
        interface: mappedInterface,
        options: remapOptions(meta.options, remapName),
        display: meta.display ?? null,
        display_options: meta.display_options ?? null,
        readonly: Boolean(meta.readonly),
        hidden: Boolean(meta.hidden),
        sort: Number(meta.sort ?? 99),
        width: mapWidth(meta.width),
        required: Boolean(meta.required),
        group: meta.group ? normalizeIdentifier(meta.group) : null,
        conditions: meta.conditions ?? null,
        note: meta.note ?? null,
        default_value: schema.default_value != null ? String(schema.default_value) : null,
        unique: Boolean(schema.is_unique),
        nullable: schema.is_nullable !== false,
        is_indexed: Boolean(schema.is_indexed),
        searchable: true,
        validation: meta.validation ?? null,
      });
      continue;
    }

    fields.push({
      collection,
      field: fieldName,
      type: mappedType,
      special: mapSpecial(meta.special),
      interface: mappedInterface,
      options: remapOptions(meta.options, remapName),
      display: meta.display ?? null,
      display_options: meta.display_options ?? null,
      readonly: Boolean(meta.readonly),
      hidden: Boolean(meta.hidden),
      sort: Number(meta.sort ?? 99),
      width: mapWidth(meta.width),
      required: Boolean(meta.required),
      group: meta.group ? normalizeIdentifier(meta.group) : null,
      conditions: meta.conditions ?? null,
      note: meta.note ?? null,
      default_value: schema.default_value != null ? String(schema.default_value) : null,
      unique: Boolean(schema.is_unique),
      nullable: schema.is_nullable !== false,
      is_indexed: Boolean(schema.is_indexed),
      searchable: true,
      validation: meta.validation ?? null,
    });
  }

  const relationFieldKeys = new Set(
    fields
      .filter((field) => ['many-to-one', 'one-to-many', 'many-to-many', 'many-to-any', 'file', 'file-image', 'files'].includes(field.interface))
      .map((field) => `${field.collection}.${field.field}`),
  );

  const relations: Array<Omit<CmsRelationRow, 'id'> & { id: number }> = [];
  let relationId = 1;

  for (const relation of rawRelations) {
    const manyCollection = remapName(relation.meta?.many_collection ?? relation.collection);
    const manyField = normalizeIdentifier(relation.meta?.many_field ?? relation.field);
    const relationKey = `${manyCollection}.${manyField}`;

    if (relationFieldKeys.has(relationKey)) {
      continue;
    }

    const oneCollection = remapName(relation.meta?.one_collection ?? relation.related_collection ?? '');
    if (!oneCollection) {
      continue;
    }

    relations.push({
      id: relationId++,
      many_collection: manyCollection,
      many_field: manyField,
      one_collection: oneCollection,
      one_field: relation.meta?.one_field ? normalizeIdentifier(relation.meta.one_field) : 'id',
      junction_collection: null,
      sort_field: relation.meta?.sort_field ? normalizeIdentifier(relation.meta.sort_field) : null,
      schema_on_delete: mapOnDelete(relation.schema?.on_delete),
    });
  }

  return {
    source: 'directus',
    warnings,
    stats: {
      collections: collections.length,
      folders: collections.filter((collection) => collection.is_group).length,
      fields: fields.length,
      skipped_fields: skippedFields,
      skipped_collections: skippedCollections,
    },
    collections,
    fields: fields as CmsFieldRow[],
    relations: relations as CmsRelationRow[],
    captured_at: new Date().toISOString(),
  };
}

export function normalizeIncomingSnapshot(input: unknown): SchemaSnapshot {
  if (isDirectusSnapshot(input)) {
    return convertDirectusSnapshot(input);
  }

  const snapshot = input as SchemaSnapshot;
  return {
    collections: snapshot.collections ?? [],
    fields: snapshot.fields ?? [],
    relations: snapshot.relations ?? [],
    captured_at: snapshot.captured_at ?? new Date().toISOString(),
  };
}
