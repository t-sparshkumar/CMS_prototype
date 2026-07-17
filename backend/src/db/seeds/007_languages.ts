import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import { ensureLanguagesCollection } from '../../services/languages.service.js';

const DEFAULT_LANGUAGES = [
  { key: 'en', language: 'English', value: 'en-US', sort: 1 },
  { key: 'es', language: 'Spanish', value: 'es-ES', sort: 2 },
] as const;

async function upsertLanguage(
  knex: Knex,
  entry: (typeof DEFAULT_LANGUAGES)[number],
): Promise<void> {
  const existing = await knex('languages').where({ key: entry.key }).first<{ id: string }>();
  if (existing) {
    await knex('languages').where({ id: existing.id }).update({
      language: entry.language,
      value: entry.value,
      sort: entry.sort,
    });
    return;
  }

  await knex('languages').insert({
    id: randomUUID(),
    key: entry.key,
    language: entry.language,
    value: entry.value,
    sort: entry.sort,
  });
}

/**
 * Seed default languages for the translations registry.
 */
export async function seed(knex: Knex): Promise<void> {
  await ensureLanguagesCollection(knex);

  for (const entry of DEFAULT_LANGUAGES) {
    await upsertLanguage(knex, entry);
  }
}
