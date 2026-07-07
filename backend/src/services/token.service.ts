import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { parseDurationMs } from '../core/duration.js';
import type { AccessTokenPayload } from '../types/auth.js';

/**
 * Generate a cryptographically secure opaque refresh token.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Sign a short-lived JWT access token for the given user.
 */
export function signAccessToken(userId: string, roleId: string): string {
  const env = getEnv();
  const payload: AccessTokenPayload = {
    sub: userId,
    role: roleId,
    type: 'access',
  };
  return jwt.sign(payload, env.SECRET_KEY, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode an access token JWT.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const env = getEnv();
  const decoded = jwt.verify(token, env.SECRET_KEY);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  const payload = decoded as AccessTokenPayload;
  if (payload.type !== 'access' || !payload.sub || !payload.role) {
    throw new Error('Invalid access token');
  }
  return payload;
}

/**
 * Return access token TTL in seconds for API responses.
 */
export function getAccessTokenExpiresInSeconds(): number {
  const env = getEnv();
  return Math.floor(parseDurationMs(env.ACCESS_TOKEN_TTL) / 1000);
}
