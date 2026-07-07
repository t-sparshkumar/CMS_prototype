import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  applySnapshot,
  captureSchemaSnapshot,
  diffAgainstSnapshot,
  importIntrospectedTables,
  introspectSchema,
  type SchemaSnapshot,
} from '../services/schema.service.js';

export const schemaRouter = Router();

schemaRouter.use(requireAuth);
schemaRouter.use(requireAdmin);

schemaRouter.get('/snapshot', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const snapshot = await captureSchemaSnapshot(db);
    res.json(success(snapshot));
  } catch (err) {
    next(err);
  }
});

schemaRouter.post('/diff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = req.body as SchemaSnapshot;
    const db = getDb();
    const diff = await diffAgainstSnapshot(db, target);
    res.json(success(diff));
  } catch (err) {
    next(err);
  }
});

schemaRouter.post('/apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = req.body as SchemaSnapshot;
    const db = getDb();
    const diff = await applySnapshot(db, target);
    res.json(success(diff));
  } catch (err) {
    next(err);
  }
});

schemaRouter.post('/introspect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const importTables = req.body?.import_tables as string[] | undefined;

    if (Array.isArray(importTables) && importTables.length > 0) {
      const imported = await importIntrospectedTables(db, importTables);
      res.json(success({ imported }, { total_count: imported.length, filter_count: imported.length }));
      return;
    }

    const tables = await introspectSchema(db);
    res.json(success(tables, { total_count: tables.length, filter_count: tables.length }));
  } catch (err) {
    next(err);
  }
});
