import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';

/**
 * Require the authenticated user to have admin access.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    return;
  }

  if (!req.user.admin_access) {
    next(new AppError('Administrator access required', 403, 'FORBIDDEN'));
    return;
  }

  next();
}
