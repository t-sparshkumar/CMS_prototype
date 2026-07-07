import type { NextFunction, Request, Response } from 'express';
import { getDb } from '../db/knex.js';
import { AppError } from './errorHandler.js';
import { assertAccess, resolveAccess } from '../services/permissions.service.js';
import type { PermissionAction } from '../types/permission.js';

/**
 * Middleware factory that enforces collection-level permissions for an action.
 * Uses the Public role when no authenticated user is present.
 */
export function requirePermission(action: PermissionAction) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const collection = String(req.params.collection);
      const access = await resolveAccess(getDb(), req.user, collection, action);
      assertAccess(access);
      req.access = access;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Require admin access for management endpoints.
 */
export function requireAdminOrThrow(req: Request): void {
  if (!req.user?.admin_access) {
    throw new AppError('Administrator access required', 403, 'FORBIDDEN');
  }
}
