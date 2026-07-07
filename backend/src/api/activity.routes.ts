import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { clearActivity, listActivity } from '../services/activity.service.js';

export const activityRouter = Router();

activityRouter.use(requireAuth);

activityRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = await listActivity(db, {
      action: typeof req.query.action === 'string' ? req.query.action : undefined,
      collection: typeof req.query.collection === 'string' ? req.query.collection : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

activityRouter.delete('/', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const deleted = await clearActivity(db);
    res.json(success({ deleted }));
  } catch (err) {
    next(err);
  }
});
