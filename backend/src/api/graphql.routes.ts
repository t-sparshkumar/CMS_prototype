import { GraphQLError } from 'graphql';
import { createYoga, maskError } from 'graphql-yoga';
import type { Request } from 'express';
import { getEnv } from '../config/env.js';
import { getDb } from '../db/knex.js';
import type { GraphQLContext } from '../graphql/context.js';
import { getGraphqlSchema } from '../graphql/schema-cache.js';
import { AppError } from '../middleware/errorHandler.js';
import { getUserById } from '../services/auth.service.js';
import { verifyAccessToken } from '../services/token.service.js';
import type { AuthenticatedUser } from '../types/user.js';

async function resolveUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await getUserById(getDb(), payload.sub);
    if (user && user.status === 'active') {
      return user;
    }
  } catch {
    return null;
  }

  return null;
}

function formatGraphqlError(error: unknown, message: string, isDev?: boolean): Error {
  const graphqlError = error as GraphQLError;
  if (graphqlError.originalError instanceof AppError) {
    return new GraphQLError(graphqlError.originalError.message, {
      nodes: graphqlError.nodes,
      source: graphqlError.source,
      positions: graphqlError.positions,
      path: graphqlError.path,
      extensions: {
        ...graphqlError.extensions,
        code: graphqlError.originalError.code,
      },
    });
  }

  return maskError(error, message, isDev);
}

/**
 * Create the GraphQL Yoga handler mounted at POST /graphql.
 */
export function createGraphqlYoga() {
  const env = getEnv();

  return createYoga<{
    req: Request;
  }, GraphQLContext>({
    graphqlEndpoint: '/graphql',
    landingPage: false,
    graphiql: env.NODE_ENV !== 'production',
    schema: async () => getGraphqlSchema(getDb()),
    context: async ({ req }) => ({
      db: getDb(),
      user: await resolveUserFromRequest(req),
    }),
    maskedErrors: {
      maskError: formatGraphqlError,
    },
  });
}
