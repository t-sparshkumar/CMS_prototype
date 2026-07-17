import type { Knex } from 'knex';
import { ensureWebsiteCollections, repairWebsiteModule } from '../../services/website.service.js';

/**
 * Seed website builder collections (page groups, components, pages, site header/footer).
 */
export async function seed(knex: Knex): Promise<void> {
  await ensureWebsiteCollections(knex);
  await repairWebsiteModule(knex);
}
