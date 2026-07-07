import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { logActivity } from '../services/activity.service.js';
import { createRole, deleteRole, updateRole } from '../services/roles.service.js';
import { listRolesWithStats } from '../services/policies.service.js';

export const rolesRouter = Router();

rolesRouter.use(requireAuth, requireAdmin);

rolesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const roles = await listRolesWithStats(db);
    res.json(success(roles, { total_count: roles.length, filter_count: roles.length }));
  } catch (err) {
    next(err);
  }
});

rolesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const role = await createRole(db, {
      name: String(req.body.name ?? ''),
      description: req.body.description !== undefined ? String(req.body.description) : null,
      icon: req.body.icon !== undefined ? String(req.body.icon) : null,
      app_access: typeof req.body.app_access === 'boolean' ? req.body.app_access : true,
    });
    await logActivity(db, {
      action: 'create',
      user: req.user?.id ?? null,
      collection: 'cms_roles',
      item: role.id,
      comment: `Created role ${role.name}`,
    });
    res.status(201).json(success(role));
  } catch (err) {
    next(err);
  }
});

rolesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const role = await updateRole(db, String(req.params.id), {
      name: req.body.name !== undefined ? String(req.body.name) : undefined,
      description: req.body.description !== undefined ? String(req.body.description) : undefined,
      icon: req.body.icon !== undefined ? String(req.body.icon) : undefined,
      app_access: typeof req.body.app_access === 'boolean' ? req.body.app_access : undefined,
    });
    await logActivity(db, {
      action: 'update',
      user: req.user?.id ?? null,
      collection: 'cms_roles',
      item: role.id,
      comment: `Updated role ${role.name}`,
    });
    res.json(success(role));
  } catch (err) {
    next(err);
  }
});

rolesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const roleId = String(req.params.id);
    const existing = await db('cms_roles').where({ id: roleId }).first();
    await deleteRole(db, roleId);
    await logActivity(db, {
      action: 'delete',
      user: req.user?.id ?? null,
      collection: 'cms_roles',
      item: roleId,
      comment: `Deleted role ${existing?.name ?? roleId}`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
