import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { getDashboardStats } from '../services/dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const stats = await getDashboardStats(db);
    res.json(success(stats));
  } catch (err) {
    next(err);
  }
});
