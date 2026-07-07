import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  deleteRelationById,
  getRelationById,
  listAllRelations,
  listRelationsForCollection,
  updateRelation,
} from '../services/relations.service.js';

export const relationsRouter = Router();

relationsRouter.use(requireAuth);

relationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const collection = typeof req.query.collection === 'string' ? req.query.collection : undefined;
    const relations = collection
      ? await listRelationsForCollection(db, collection)
      : await listAllRelations(db);
    res.json(success(relations, { total_count: relations.length, filter_count: relations.length }));
  } catch (err) {
    next(err);
  }
});

relationsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relationId = Number(req.params.id);
    if (Number.isNaN(relationId)) {
      res.status(400).json({
        errors: [{ message: 'Invalid relation ID', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    const relation = await getRelationById(db, relationId);
    res.json(success(relation));
  } catch (err) {
    next(err);
  }
});

relationsRouter.patch('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relationId = Number(req.params.id);
    if (Number.isNaN(relationId)) {
      res.status(400).json({
        errors: [{ message: 'Invalid relation ID', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    const relation = await updateRelation(db, relationId, req.body);
    res.json(success(relation));
  } catch (err) {
    next(err);
  }
});

relationsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relationId = Number(req.params.id);
    if (Number.isNaN(relationId)) {
      res.status(400).json({
        errors: [{ message: 'Invalid relation ID', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    await deleteRelationById(db, relationId);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});
