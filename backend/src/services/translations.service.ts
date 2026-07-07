import type { Knex } from 'knex';
import { AppError } from '../middleware/errorHandler.js';
import { getCollection } from './collections.service.js';
import { createField } from './fields.service.js';

export interface TranslationsSetupInput {
  languages_collection: string;
  languages_field?: string;
  translations_field?: string;
}

/**
 * Set up a translations field group for a collection.
 */
export async function setupTranslations(
  db: Knex,
  collectionName: string,
  input: TranslationsSetupInput,
): Promise<{ translations_field: string; languages_collection: string }> {
  await getCollection(db, collectionName);
  await getCollection(db, input.languages_collection);

  const translationsField = input.translations_field ?? 'translations';
  const languagesField = input.languages_field ?? 'languages_code';

  const existing = await db('cms_fields')
    .where({ collection: collectionName, field: translationsField })
    .first();

  if (existing) {
    throw new AppError(`Field "${translationsField}" already exists`, 409, 'FIELD_EXISTS');
  }

  await createField(db, collectionName, {
    field: translationsField,
    type: 'alias',
    interface: 'translations',
    options: {
      related_collection: input.languages_collection,
      related_field: languagesField,
    },
    hidden: false,
    readonly: false,
  });

  return {
    translations_field: translationsField,
    languages_collection: input.languages_collection,
  };
}
