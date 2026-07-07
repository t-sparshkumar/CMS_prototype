import type { AuthenticatedUser } from './user.js';
import type { AccessContext } from './permission.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      access?: AccessContext;
    }
  }
}

export {};
