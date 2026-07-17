import { v4 as uuidv4 } from 'uuid';
import type { Knex } from 'knex';
import { isRelationInterface, isVirtualRelationInterface } from '../core/relation.js';
import { AppError } from '../middleware/errorHandler.js';
import type { FieldMeta } from '../types/field.js';
import type { ItemRecord } from '../types/item.js';
import { createCollection, getCollection } from './collections.service.js';
import { createField, isPhysicalField, listFields } from './fields.service.js';
import { LANGUAGES_COLLECTION } from './languages.service.js';

export interface TranslationsSetupInput {
  languages_collection?: string;
  languages_field?: string;
  translations_field?: string;
  translatable_fields: string[];
  enabled_languages?: string[];
}

export interface TranslationsConfig {
  translations_field: string;
  languages_collection: string;
  languages_field: string;
  translation_collection: string;
  parent_fk_field: string;
  translatable_fields: string[];
  enabled_languages: string[];
}

const TRANSLATABLE_TYPES = new Set(['string', 'text']);

export function getTranslationTableName(collectionName: string): string {
  return `${collectionName}_translations`;
}

export function getParentFkField(collectionName: string): string {
  return `${collectionName}_id`;
}

export function isTranslatableParentField(field: FieldMeta): boolean {
  if (field.is_system || field.hidden) {
    return false;
  }
  if (field.type === 'alias' || isVirtualRelationInterface(field.interface)) {
    return false;
  }
  if (isRelationInterface(field.interface)) {
    return false;
  }
  if (field.interface.startsWith('file')) {
    return false;
  }
  return TRANSLATABLE_TYPES.has(field.type);
}

function parseFieldOptions(options: unknown): Record<string, unknown> {
  if (!options) {
    return {};
  }
  if (typeof options === 'string') {
    try {
      return JSON.parse(options) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof options === 'object') {
    return options as Record<string, unknown>;
  }
  return {};
}

export function parseTranslationsFieldOptions(options: unknown): Partial<TranslationsConfig> {
  const parsed = parseFieldOptions(options);
  return {
    languages_collection: parsed.languages_collection as string | undefined,
    languages_field: parsed.languages_field as string | undefined,
    translation_collection: parsed.translation_collection as string | undefined,
    parent_fk_field: parsed.parent_fk_field as string | undefined,
    translatable_fields: parsed.translatable_fields as string[] | undefined,
    enabled_languages: parsed.enabled_languages as string[] | undefined,
  };
}

function isConfiguredTranslationsOptions(options: unknown): boolean {
  const parsed = parseTranslationsFieldOptions(options);
  return Boolean(parsed.translation_collection && parsed.translatable_fields?.length);
}

/**
 * Pick the translations virtual field that has been configured via collection setup.
 */
export function findConfiguredTranslationsField(fieldsMeta: FieldMeta[]): FieldMeta | null {
  for (const field of fieldsMeta) {
    if (field.interface !== 'translations') {
      continue;
    }
    if (isConfiguredTranslationsOptions(field.options)) {
      return field;
    }
  }
  return null;
}

/**
 * Read translation configuration from the parent collection translations field.
 */
export async function getTranslationsConfig(
  db: Knex,
  collectionName: string,
): Promise<TranslationsConfig | null> {
  const fields = await db('cms_fields')
    .where({ collection: collectionName, interface: 'translations' })
    .orderBy('sort', 'asc')
    .select<{ field: string; options: string | Record<string, unknown> | null }[]>('field', 'options');

  for (const field of fields) {
    const options = parseTranslationsFieldOptions(field.options);
    if (!options.translation_collection || !options.translatable_fields?.length) {
      continue;
    }

    return {
      translations_field: field.field,
      languages_collection: options.languages_collection ?? LANGUAGES_COLLECTION,
      languages_field: options.languages_field ?? 'key',
      translation_collection: options.translation_collection,
      parent_fk_field: options.parent_fk_field ?? getParentFkField(collectionName),
      translatable_fields: options.translatable_fields,
      enabled_languages: options.enabled_languages ?? [],
    };
  }

  return null;
}

async function validateTranslatableFields(
  db: Knex,
  collectionName: string,
  fieldNames: string[],
): Promise<FieldMeta[]> {
  if (fieldNames.length === 0) {
    throw new AppError('At least one translatable field is required', 400, 'VALIDATION_ERROR');
  }

  const parentFields = await listFields(db, collectionName);
  const selected: FieldMeta[] = [];

  for (const name of fieldNames) {
    const meta = parentFields.find((field) => field.field === name);
    if (!meta) {
      throw new AppError(`Field "${name}" not found on "${collectionName}"`, 404, 'NOT_FOUND');
    }
    if (!isTranslatableParentField(meta)) {
      throw new AppError(`Field "${name}" cannot be translated`, 400, 'VALIDATION_ERROR');
    }
    selected.push(meta);
  }

  return selected;
}

async function validateEnabledLanguages(
  db: Knex,
  languagesCollection: string,
  languagesField: string,
  enabledLanguages: string[] | undefined,
): Promise<string[]> {
  const rows = await db(languagesCollection).select('*');
  const available = rows
    .map((row) => String((row as Record<string, unknown>)[languagesField] ?? ''))
    .filter(Boolean);

  if (available.length === 0) {
    throw new AppError('No languages configured. Add languages in the Translations section first.', 400, 'VALIDATION_ERROR');
  }

  const enabled = enabledLanguages?.length ? enabledLanguages : available;
  for (const code of enabled) {
    if (!available.includes(code)) {
      throw new AppError(`Language "${code}" is not defined in ${languagesCollection}`, 400, 'VALIDATION_ERROR');
    }
  }

  return enabled;
}

async function ensureTranslationCollection(
  db: Knex,
  parentCollection: string,
  translatableFields: FieldMeta[],
): Promise<string> {
  const translationCollection = getTranslationTableName(parentCollection);
  const parentFkField = getParentFkField(parentCollection);
  const exists = await db('cms_collections').where({ collection: translationCollection }).first();

  if (!exists) {
    await createCollection(db, {
      collection: translationCollection,
      icon: 'translate',
      display_name: `${parentCollection} translations`,
      note: `Translation rows for ${parentCollection}`,
      hidden: true,
      system: false,
      optional_system_fields: { status: false, sort: false, accountability: true },
    });
  } else {
    await db('cms_collections').where({ collection: translationCollection }).update({ hidden: true });
  }

  const parentFkExists = await db('cms_fields')
    .where({ collection: translationCollection, field: parentFkField })
    .first();

  if (!parentFkExists) {
    await createField(db, translationCollection, {
      field: parentFkField,
      type: 'uuid',
      interface: 'many-to-one',
      required: true,
      options: { related_collection: parentCollection, schema_on_delete: 'CASCADE' },
      sort: 10,
      width: 6,
    });
  }

  const languageKeyExists = await db('cms_fields')
    .where({ collection: translationCollection, field: 'languages_key' })
    .first();

  if (!languageKeyExists) {
    await createField(db, translationCollection, {
      field: 'languages_key',
      type: 'string',
      interface: 'input',
      required: true,
      sort: 11,
      width: 6,
      note: 'Language key from languages registry',
    });
  }

  for (const parentField of translatableFields) {
    const mirrorExists = await db('cms_fields')
      .where({ collection: translationCollection, field: parentField.field })
      .first();

    if (mirrorExists) {
      continue;
    }

    await createField(db, translationCollection, {
      field: parentField.field,
      type: parentField.type as 'string' | 'text',
      interface: parentField.interface,
      required: false,
      sort: parentField.sort + 100,
      width: parentField.width,
      note: parentField.note,
      options: parentField.options,
    });
  }

  if (await db.schema.hasTable(translationCollection)) {
    const hasParentColumn = await db.schema.hasColumn(translationCollection, parentFkField);
    const hasLanguageColumn = await db.schema.hasColumn(translationCollection, 'languages_key');
    if (hasParentColumn && hasLanguageColumn) {
      try {
        await db.schema.alterTable(translationCollection, (table) => {
          table.unique([parentFkField, 'languages_key'], `${translationCollection}_parent_lang_unique`);
        });
      } catch {
        // Unique index may already exist.
      }
    }
  }

  return translationCollection;
}

async function ensureTranslationsVirtualField(
  db: Knex,
  collectionName: string,
  input: {
    translationsField: string;
    languagesCollection: string;
    languagesField: string;
    translationCollection: string;
    parentFkField: string;
    translatableFields: string[];
    enabledLanguages: string[];
  },
): Promise<void> {
  const options = {
    languages_collection: input.languagesCollection,
    languages_field: input.languagesField,
    translation_collection: input.translationCollection,
    parent_fk_field: input.parentFkField,
    parent_collection: collectionName,
    translatable_fields: input.translatableFields,
    enabled_languages: input.enabledLanguages,
  };

  await db('cms_fields')
    .where({ collection: collectionName, interface: 'translations' })
    .whereNot({ field: input.translationsField })
    .delete();

  const existing = await db('cms_fields')
    .where({ collection: collectionName, field: input.translationsField })
    .first();

  if (existing) {
    await db('cms_fields')
      .where({ collection: collectionName, field: input.translationsField })
      .update({
        interface: 'translations',
        type: 'alias',
        special: 'translations',
        options: JSON.stringify(options),
        hidden: false,
        readonly: false,
      });
    return;
  }

  await createField(db, collectionName, {
    field: input.translationsField,
    type: 'alias',
    interface: 'translations',
    options,
    hidden: false,
    readonly: false,
    sort: 90,
    width: 12,
    note: 'Localized field values per language',
  });
}

/**
 * Provision translation storage and virtual field for a collection.
 */
export async function setupTranslations(
  db: Knex,
  collectionName: string,
  input: TranslationsSetupInput,
): Promise<TranslationsConfig> {
  await getCollection(db, collectionName);

  const languagesCollection = input.languages_collection ?? LANGUAGES_COLLECTION;
  const languagesField = input.languages_field ?? 'key';
  const translationsField = input.translations_field ?? 'translations';

  await getCollection(db, languagesCollection);

  const translatableFieldMeta = await validateTranslatableFields(db, collectionName, input.translatable_fields);
  const enabledLanguages = await validateEnabledLanguages(
    db,
    languagesCollection,
    languagesField,
    input.enabled_languages,
  );

  const translationCollection = await ensureTranslationCollection(db, collectionName, translatableFieldMeta);
  const parentFkField = getParentFkField(collectionName);

  await ensureTranslationsVirtualField(db, collectionName, {
    translationsField,
    languagesCollection,
    languagesField,
    translationCollection,
    parentFkField,
    translatableFields: translatableFieldMeta.map((field) => field.field),
    enabledLanguages,
  });

  return {
    translations_field: translationsField,
    languages_collection: languagesCollection,
    languages_field: languagesField,
    translation_collection: translationCollection,
    parent_fk_field: parentFkField,
    translatable_fields: translatableFieldMeta.map((field) => field.field),
    enabled_languages: enabledLanguages,
  };
}

function pickTranslationFieldValues(
  source: Record<string, unknown>,
  translatableFields: string[],
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const fieldName of translatableFields) {
    if (fieldName in source) {
      row[fieldName] = source[fieldName];
    }
  }
  return row;
}

/**
 * Load translation values keyed by language code for an item.
 */
export async function loadTranslationValues(
  db: Knex,
  collectionName: string,
  item: ItemRecord,
  fieldsMeta: FieldMeta[],
): Promise<ItemRecord> {
  const transField = findConfiguredTranslationsField(fieldsMeta);
  if (!transField || !item.id) {
    return item;
  }

  const config = parseTranslationsFieldOptions(transField.options);
  const translationCollection = config.translation_collection;
  const parentFkField = config.parent_fk_field ?? getParentFkField(collectionName);
  const translatableFields = config.translatable_fields ?? [];

  if (!translationCollection || translatableFields.length === 0) {
    return item;
  }

  const hasTable = await db.schema.hasTable(translationCollection);
  if (!hasTable) {
    return item;
  }

  const rows = await db(translationCollection)
    .where(parentFkField, item.id as string)
    .select('*') as ItemRecord[];

  const map: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    const languageKey = String(row.languages_key ?? '');
    if (!languageKey) {
      continue;
    }
    map[languageKey] = pickTranslationFieldValues(row, translatableFields);
  }

  return { ...item, [transField.field]: map };
}

/**
 * Upsert translation rows from a virtual translations payload.
 */
export async function syncTranslationRows(
  db: Knex,
  collectionName: string,
  itemId: string,
  input: Record<string, unknown>,
  fieldsMeta: FieldMeta[],
  userId: string | null,
): Promise<void> {
  const transField = findConfiguredTranslationsField(fieldsMeta);
  if (!transField || !(transField.field in input)) {
    return;
  }

  const rawValue = input[transField.field];
  if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
    return;
  }

  const config = parseTranslationsFieldOptions(transField.options);
  const translationCollection = config.translation_collection;
  const parentFkField = config.parent_fk_field ?? getParentFkField(collectionName);
  const translatableFields = config.translatable_fields ?? [];
  const enabledLanguages = new Set(config.enabled_languages ?? []);

  if (!translationCollection || translatableFields.length === 0) {
    return;
  }

  const hasTable = await db.schema.hasTable(translationCollection);
  if (!hasTable) {
    return;
  }

  const translationsMap = rawValue as Record<string, Record<string, unknown>>;
  const now = new Date().toISOString();

  await db.transaction(async (trx) => {
    for (const [languageKey, fieldValues] of Object.entries(translationsMap)) {
      if (enabledLanguages.size > 0 && !enabledLanguages.has(languageKey)) {
        continue;
      }

      const rowValues = pickTranslationFieldValues(fieldValues ?? {}, translatableFields);
      const existing = await trx(translationCollection)
        .where({ [parentFkField]: itemId, languages_key: languageKey })
        .first<ItemRecord>();

      if (existing) {
        await trx(translationCollection)
          .where({ id: existing.id })
          .update({
            ...rowValues,
            date_updated: now,
            user_updated: userId,
          });
        continue;
      }

      await trx(translationCollection).insert({
        id: uuidv4(),
        [parentFkField]: itemId,
        languages_key: languageKey,
        ...rowValues,
        date_created: now,
        date_updated: now,
        user_created: userId,
        user_updated: userId,
      });
    }
  });
}
