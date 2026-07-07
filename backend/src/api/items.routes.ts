import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { parseFieldsQuery, parseFieldsQueryRaw, parseItemQueryOptions } from '../core/query-parser.js';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { optionalAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  reorderItems,
  updateItem,
} from '../services/items.service.js';
import type { CreateItemInput, ReorderItemsInput, UpdateItemInput } from '../types/item.js';

export const itemsRouter = Router();

itemsRouter.use(optionalAuth);

itemsRouter.get('/:collection', requirePermission('read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.collection);
    const options = parseItemQueryOptions(req.query);
    const db = getDb();
    const result = await listItems(db, collectionName, options, req.access!);

    res.json(
      success(result.items, {
        total_count: result.totalCount,
        filter_count: result.filterCount,
      }),
    );
  } catch (err) {
    next(err);
  }
});

itemsRouter.post(
  '/:collection/reorder',
  requirePermission('update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collectionName = String(req.params.collection);
      const body = req.body as ReorderItemsInput;
      const db = getDb();
      await reorderItems(db, collectionName, body, req.access!);
      res.json(success(null));
    } catch (err) {
      next(err);
    }
  },
);

itemsRouter.get(
  '/:collection/:id',
  requirePermission('read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collectionName = String(req.params.collection);
      const itemId = String(req.params.id);
      const fields = parseFieldsQuery(req.query.fields);
      const fieldsRaw = parseFieldsQueryRaw(req.query.fields);
      const db = getDb();
      const item = await getItem(db, collectionName, itemId, fields, fieldsRaw, req.access!);
      res.json(success(item));
    } catch (err) {
      next(err);
    }
  },
);

itemsRouter.post('/:collection', requirePermission('create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.collection);
    const body = req.body as CreateItemInput;
    const db = getDb();
    const userId = req.user?.id ?? null;
    const item = await createItem(db, collectionName, body, userId, req.access!);
    res.status(201).json(success(item));
  } catch (err) {
    next(err);
  }
});

itemsRouter.patch(
  '/:collection/:id',
  requirePermission('update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collectionName = String(req.params.collection);
      const itemId = String(req.params.id);
      const body = req.body as UpdateItemInput;
      const db = getDb();
      const userId = req.user?.id ?? null;
      const item = await updateItem(db, collectionName, itemId, body, userId, req.access!);
      res.json(success(item));
    } catch (err) {
      next(err);
    }
  },
);

itemsRouter.delete(
  '/:collection/:id',
  requirePermission('delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collectionName = String(req.params.collection);
      const itemId = String(req.params.id);
      const db = getDb();
      const userId = req.user?.id ?? null;
      await deleteItem(db, collectionName, itemId, userId, req.access!);
      res.json(success(null));
    } catch (err) {
      next(err);
    }
  },
);
