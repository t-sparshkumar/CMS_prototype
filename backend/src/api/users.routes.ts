import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getCurrentUserProfile } from '../services/auth.service.js';
import { logActivity } from '../services/activity.service.js';
import { createUser, deleteUser, listUsers, updateUser } from '../services/users.service.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({
        errors: [{ message: 'Authentication required', extensions: { code: 'UNAUTHORIZED' } }],
      });
      return;
    }

    const db = getDb();
    const profile = await getCurrentUserProfile(db, req.user.id);
    res.json(success(profile));
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/', requireAuth, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const users = await listUsers(db);
    res.json(success(users));
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const user = await createUser(db, {
      first_name: String(req.body.first_name ?? ''),
      last_name: String(req.body.last_name ?? ''),
      email: String(req.body.email ?? ''),
      password: String(req.body.password ?? ''),
      role: String(req.body.role ?? ''),
      status: typeof req.body.status === 'string' ? req.body.status : 'active',
    });
    await logActivity(db, {
      action: 'create',
      user: req.user?.id ?? null,
      collection: 'cms_users',
      item: user.id,
      comment: `Created user ${user.email}`,
    });
    res.status(201).json(success(user));
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const user = await updateUser(db, String(req.params.id), {
      first_name: req.body.first_name !== undefined ? String(req.body.first_name) : undefined,
      last_name: req.body.last_name !== undefined ? String(req.body.last_name) : undefined,
      email: req.body.email !== undefined ? String(req.body.email) : undefined,
      password: req.body.password ? String(req.body.password) : undefined,
      role: req.body.role !== undefined ? String(req.body.role) : undefined,
      status: req.body.status !== undefined ? String(req.body.status) : undefined,
    });
    await logActivity(db, {
      action: 'update',
      user: req.user?.id ?? null,
      collection: 'cms_users',
      item: user.id,
      comment: `Updated user ${user.email}`,
    });
    res.json(success(user));
  } catch (err) {
    next(err);
  }
});

usersRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = String(req.params.id);
    await deleteUser(db, userId, req.user!.id);
    await logActivity(db, {
      action: 'delete',
      user: req.user?.id ?? null,
      collection: 'cms_users',
      item: userId,
      comment: `Deleted user ${userId}`,
    });
    res.json(success({ deleted: true }));
  } catch (err) {
    next(err);
  }
});
