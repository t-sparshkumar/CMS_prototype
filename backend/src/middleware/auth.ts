import type { NextFunction, Request, Response } from 'express';
import { getDb } from '../db/knex.js';
import { AppError } from './errorHandler.js';
import { getUserById } from '../services/auth.service.js';
import { verifyAccessToken } from '../services/token.service.js';

/**
 * Require a valid Bearer access token and attach the user to the request.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const payload = verifyAccessToken(token);
    const user = await getUserById(getDb(), payload.sub);

    if (!user || user.status !== 'active') {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

/**
 * Optionally attach a user when a valid Bearer token is present.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      next();
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await getUserById(getDb(), payload.sub);
    if (user && user.status === 'active') {
      req.user = user;
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }

  next();
}
