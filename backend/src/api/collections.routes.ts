import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  createCollection,
  deleteCollection,
  duplicateCollection,
  getCollection,
  listCollections,
  renameCollection,
  reorderCollections,
  updateCollection,
} from '../services/collections.service.js';
import type { CreateCollectionInput, UpdateCollectionInput } from '../types/collection.js';
import { fieldsRouter } from './fields.routes.js';
import { setupTranslations, getTranslationsConfig } from '../services/translations.service.js';

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);

collectionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const includeHidden = req.query.include_hidden === 'true' && req.user?.admin_access;
    const parentParam = req.query.parent;
    const parent =
      parentParam === undefined
        ? undefined
        : parentParam === 'null' || parentParam === ''
          ? null
          : String(parentParam);
    const collections = await listCollections(db, { includeHidden, parent });
    res.json(success(collections, { total_count: collections.length, filter_count: collections.length }));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.post('/reorder', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { items?: Array<{ collection: string; sort: number }> };
    if (!body.items || body.items.length === 0) {
      res.status(400).json({
        errors: [{ message: 'items array is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    await reorderCollections(db, body.items);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    const db = getDb();
    const collection = await getCollection(db, name);
    res.json(success(collection));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as CreateCollectionInput;
    if (!body.collection) {
      res.status(400).json({
        errors: [{ message: 'Collection name is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    const collection = await createCollection(db, body);
    res.status(201).json(success(collection));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.patch('/:name', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    const body = req.body as UpdateCollectionInput;
    const db = getDb();
    const collection = await updateCollection(db, name, body);
    res.json(success(collection));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.post('/:name/duplicate', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    const body = req.body as { target: string };
    if (!body.target) {
      res.status(400).json({
        errors: [{ message: 'target collection name is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }
    const db = getDb();
    const collection = await duplicateCollection(db, name, body.target);
    res.status(201).json(success(collection));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.post('/:name/rename', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    const body = req.body as { new_name: string };
    if (!body.new_name) {
      res.status(400).json({
        errors: [{ message: 'new_name is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }
    const db = getDb();
    const collection = await renameCollection(db, name, body.new_name);
    res.json(success(collection));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.delete('/:name', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    const db = getDb();
    await deleteCollection(db, name);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});

collectionsRouter.get(
  '/:name/translations/config',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = String(req.params.name);
      const db = getDb();
      const config = await getTranslationsConfig(db, name);
      res.json(success(config));
    } catch (err) {
      next(err);
    }
  },
);

collectionsRouter.post(
  '/:name/translations/setup',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = String(req.params.name);
      const body = req.body as {
        languages_collection?: string;
        languages_field?: string;
        translations_field?: string;
        translatable_fields?: string[];
        enabled_languages?: string[];
      };

      if (!Array.isArray(body.translatable_fields) || body.translatable_fields.length === 0) {
        res.status(400).json({
          errors: [
            {
              message: 'translatable_fields is required and must contain at least one field',
              extensions: { code: 'VALIDATION_ERROR' },
            },
          ],
        });
        return;
      }

      const db = getDb();
      const result = await setupTranslations(db, name, {
        languages_collection: body.languages_collection,
        languages_field: body.languages_field,
        translations_field: body.translations_field,
        translatable_fields: body.translatable_fields,
        enabled_languages: body.enabled_languages,
      });
      res.status(201).json(success(result));
    } catch (err) {
      next(err);
    }
  },
);

collectionsRouter.use('/:name/fields', fieldsRouter);
