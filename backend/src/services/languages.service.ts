import type { Knex } from 'knex';
import { createCollection } from './collections.service.js';
import { createField } from './fields.service.js';

export const LANGUAGES_COLLECTION = 'languages';

/**
 * Ensure the global languages registry collection exists.
 */
export async function ensureLanguagesCollection(db: Knex): Promise<void> {
  const exists = await db('cms_collections').where({ collection: LANGUAGES_COLLECTION }).first();
  if (exists) {
    return;
  }

  await createCollection(db, {
    collection: LANGUAGES_COLLECTION,
    icon: 'translate',
    display_name: 'Languages',
    note: 'Available languages for content translations',
    system: true,
    hidden: false,
    sort: 5,
    optional_system_fields: { status: false, sort: true, accountability: true },
  });

  await createField(db, LANGUAGES_COLLECTION, {
    field: 'key',
    type: 'string',
    interface: 'input',
    required: true,
    unique: true,
    sort: 10,
    width: 4,
    note: 'Short language code (e.g. en, es)',
  });
  await createField(db, LANGUAGES_COLLECTION, {
    field: 'language',
    type: 'string',
    interface: 'input',
    required: true,
    sort: 11,
    width: 4,
    note: 'Display name (e.g. English, Spanish)',
  });
  await createField(db, LANGUAGES_COLLECTION, {
    field: 'value',
    type: 'string',
    interface: 'input',
    sort: 12,
    width: 4,
    note: 'Full locale tag (e.g. en-US, es-ES)',
  });
}
