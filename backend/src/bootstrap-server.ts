import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import { activityRouter } from './api/activity.routes.js';
import { authRouter } from './api/auth.routes.js';
import { assetsRouter } from './api/assets.routes.js';
import { collectionsRouter } from './api/collections.routes.js';
import { dashboardRouter } from './api/dashboard.routes.js';
import { filesRouter } from './api/files.routes.js';
import { itemsRouter } from './api/items.routes.js';
import { permissionsRouter } from './api/permissions.routes.js';
import { relationsRouter } from './api/relations.routes.js';
import { rolesRouter } from './api/roles.routes.js';
import { policiesRouter } from './api/policies.routes.js';
import { schemaRouter } from './api/schema.routes.js';
import { flowsRouter, flowWebhooksRouter } from './api/flows.routes.js';
import { createGraphqlYoga } from './api/graphql.routes.js';
import { usersRouter } from './api/users.routes.js';
import { getEnv } from './config/env.js';
import { ensureUploadDir } from './core/storage.js';
import { success } from './core/response.js';
import { getDb, initDb } from './db/knex.js';
import { getSqliteDbPath } from './core/sqlite.js';
import { runMigrationsAndSeeds } from './db/run-migrations.js';
import { errorHandler } from './middleware/errorHandler.js';
import { repairWebsiteModule } from './services/website.service.js';
import { refreshFlowSchedules } from './services/flows/cron-scheduler.js';

/**
 * Register routes and run post-listen startup (env validation, migrations, DB init).
 * Called only after the HTTP server is already accepting /server/live probes.
 */
export async function bootstrapApp(app: Express): Promise<void> {
  dotenv.config();

  const env = getEnv();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.ADMIN_UI_URL,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/server/health', async (_req, res, next) => {
    try {
      await initDb();
      const db = getDb();
      await db.raw('select 1');
      const runtimeEnv = getEnv();
      const payload: Record<string, string> = { status: 'ok', db: 'connected' };
      if (runtimeEnv.DB_CLIENT === 'sqlite3') {
        payload.db_path = getSqliteDbPath();
      }
      res.json(success(payload));
    } catch (err) {
      next(err);
    }
  });

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/files', filesRouter);
  app.use('/assets', assetsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/collections', collectionsRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/permissions', permissionsRouter);
  app.use('/api/relations', relationsRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/policies', policiesRouter);
  app.use('/api/schema', schemaRouter);
  app.use('/api/flows', flowsRouter);
  app.use('/flows/trigger', flowWebhooksRouter);

  const graphqlYoga = createGraphqlYoga();
  app.use('/graphql', graphqlYoga as unknown as RequestHandler);

  app.use(errorHandler);

  if (process.env.NODE_ENV === 'production') {
    runMigrationsAndSeeds();
  }

  await initDb();
  const db = getDb();
  await db.raw('select 1');
  await ensureUploadDir();
  await repairWebsiteModule(db);
  await refreshFlowSchedules(db);
  console.log('CMS backend ready');
}
