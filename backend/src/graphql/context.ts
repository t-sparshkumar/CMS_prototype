import type { Knex } from 'knex';
import type { AuthenticatedUser } from '../types/user.js';

export interface GraphQLContext {
  db: Knex;
  user: AuthenticatedUser | null;
}
