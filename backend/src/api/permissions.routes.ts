import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  deletePermission,
  listPermissions,
  upsertPermission,
} from '../services/permissions.service.js';
import type { CreatePermissionInput } from '../types/permission.js';

export const permissionsRouter = Router();

permissionsRouter.use(requireAuth, requireAdmin);

permissionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = typeof req.query.role === 'string' ? req.query.role : undefined;
    const db = getDb();
    const permissions = await listPermissions(db, roleId);
    res.json(success(permissions, { total_count: permissions.length, filter_count: permissions.length }));
  } catch (err) {
    next(err);
  }
});

permissionsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as CreatePermissionInput;
    if (!body.role || !body.collection || !body.action) {
      res.status(400).json({
        errors: [{ message: 'role, collection, and action are required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    const permission = await upsertPermission(db, body);
    res.status(201).json(success(permission));
  } catch (err) {
    next(err);
  }
});

permissionsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissionId = Number.parseInt(String(req.params.id), 10);
    const db = getDb();
    await deletePermission(db, permissionId);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});
