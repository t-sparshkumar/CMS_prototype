import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env.js';
import { parseDurationMs } from '../core/duration.js';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import {
  REFRESH_COOKIE_NAME,
  login,
  logout,
  refreshAccessToken,
} from '../services/auth.service.js';

export const authRouter = Router();

function getSessionMeta(req: Request) {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  const env = getEnv();
  const crossOrigin = env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: crossOrigin,
    sameSite: crossOrigin ? 'none' : 'lax',
    maxAge: parseDurationMs(env.REFRESH_TOKEN_TTL),
    path: '/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  const env = getEnv();
  const crossOrigin = env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    path: '/auth',
    secure: crossOrigin,
    sameSite: crossOrigin ? 'none' : 'lax',
  });
}

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({
        errors: [{ message: 'Email and password are required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    const { result, refreshToken } = await login(db, email, password, getSessionMeta(req));
    setRefreshCookie(res, refreshToken);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!refreshToken) {
      res.status(401).json({
        errors: [{ message: 'Refresh token required', extensions: { code: 'UNAUTHORIZED' } }],
      });
      return;
    }

    const db = getDb();
    const result = await refreshAccessToken(db, refreshToken);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const db = getDb();
    await logout(db, refreshToken);
    clearRefreshCookie(res);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});
