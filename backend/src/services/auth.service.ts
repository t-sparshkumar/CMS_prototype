import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';
import { getEnv } from '../config/env.js';
import { expiresAtFromNow } from '../core/duration.js';
import { AppError } from '../middleware/errorHandler.js';
import type { LoginResult, SessionMeta } from '../types/auth.js';
import type { AuthenticatedUser, CmsUserRow, UserProfile } from '../types/user.js';
import {
  generateRefreshToken,
  getAccessTokenExpiresInSeconds,
  signAccessToken,
} from './token.service.js';

const REFRESH_COOKIE_NAME = 'refresh_token';

export { REFRESH_COOKIE_NAME };

interface UserWithRole {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  last_access?: string | Date | null;
  admin_access: boolean | number;
  app_access: boolean | number;
}

/**
 * Authenticate a user by email and password, create a session, and return tokens.
 */
export async function login(
  db: Knex,
  email: string,
  password: string,
  sessionMeta: SessionMeta,
): Promise<{ result: LoginResult; refreshToken: string }> {
  const user = await db<CmsUserRow>('cms_users').where({ email }).first();
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'active') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
  }

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const refreshToken = generateRefreshToken();
  const env = getEnv();
  const expires = expiresAtFromNow(env.REFRESH_TOKEN_TTL);

  await db.transaction(async (trx) => {
    await trx('cms_sessions').insert({
      token: refreshToken,
      user: user.id,
      expires,
      ip: sessionMeta.ip,
      user_agent: sessionMeta.userAgent,
    });

    await trx('cms_users').where({ id: user.id }).update({
      last_access: trx.fn.now(),
    });
  });

  const accessToken = signAccessToken(user.id, user.role);

  return {
    result: {
      access_token: accessToken,
      expires: getAccessTokenExpiresInSeconds(),
    },
    refreshToken,
  };
}

/**
 * Exchange a valid refresh token for a new access token.
 */
export async function refreshAccessToken(db: Knex, refreshToken: string): Promise<LoginResult> {
  const session = await db('cms_sessions').where({ token: refreshToken }).first<{
    token: string;
    user: string;
    expires: string | Date;
  }>();

  if (!session) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const expiresAt = new Date(session.expires);
  if (expiresAt.getTime() <= Date.now()) {
    await db('cms_sessions').where({ token: refreshToken }).delete();
    throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
  }

  const user = await db<CmsUserRow>('cms_users').where({ id: session.user }).first();
  if (!user || user.status !== 'active') {
    await db('cms_sessions').where({ token: refreshToken }).delete();
    throw new AppError('User not found or inactive', 401, 'INVALID_TOKEN');
  }

  const accessToken = signAccessToken(user.id, user.role);

  return {
    access_token: accessToken,
    expires: getAccessTokenExpiresInSeconds(),
  };
}

/**
 * Invalidate a refresh token session.
 */
export async function logout(db: Knex, refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) {
    return;
  }
  await db('cms_sessions').where({ token: refreshToken }).delete();
}

/**
 * Load a user with role info by ID.
 */
export async function getUserById(db: Knex, userId: string): Promise<AuthenticatedUser | null> {
  const row = await db('cms_users')
    .join('cms_roles', 'cms_users.role', 'cms_roles.id')
    .where('cms_users.id', userId)
    .select(
      'cms_users.id',
      'cms_users.first_name',
      'cms_users.last_name',
      'cms_users.email',
      'cms_users.role',
      'cms_users.status',
      'cms_roles.admin_access',
      'cms_roles.app_access',
    )
    .first<UserWithRole>();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    role: row.role,
    status: row.status,
    admin_access: Boolean(row.admin_access),
    app_access: Boolean(row.app_access),
  };
}

/**
 * Return the current user's public profile.
 */
export async function getCurrentUserProfile(db: Knex, userId: string): Promise<UserProfile> {
  const row = await db('cms_users')
    .join('cms_roles', 'cms_users.role', 'cms_roles.id')
    .where('cms_users.id', userId)
    .select(
      'cms_users.id',
      'cms_users.first_name',
      'cms_users.last_name',
      'cms_users.email',
      'cms_users.role',
      'cms_users.status',
      'cms_users.last_access',
      'cms_roles.admin_access',
      'cms_roles.app_access',
    )
    .first<UserWithRole>();

  if (!row) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    role: row.role,
    status: row.status,
    admin_access: Boolean(row.admin_access),
    app_access: Boolean(row.app_access),
    last_access: row.last_access ? new Date(row.last_access).toISOString() : null,
  };
}
