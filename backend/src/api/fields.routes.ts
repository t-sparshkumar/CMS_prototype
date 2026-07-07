import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  createField,
  deleteField,
  duplicateField,
  getField,
  listFields,
  reorderFields,
  renameField,
  updateField,
} from '../services/fields.service.js';
import { fieldCreateRequiresType } from '../core/relation.js';
import type { CreateFieldInput, UpdateFieldInput } from '../types/field.js';

export const fieldsRouter = Router({ mergeParams: true });

fieldsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const db = getDb();

    let formData: Record<string, unknown> | undefined;
    if (typeof req.query.form_data === 'string' && req.query.form_data.length > 0) {
      formData = JSON.parse(req.query.form_data) as Record<string, unknown>;
    }

    const fields = await listFields(db, collectionName, { formData });
    res.json(success(fields, { total_count: fields.length, filter_count: fields.length }));
  } catch (err) {
    next(err);
  }
});

fieldsRouter.post('/reorder', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const body = req.body as { items: Array<{ field: string; sort: number; group?: string | null }> };
    if (!Array.isArray(body.items)) {
      res.status(400).json({
        errors: [{ message: 'items array is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }
    const db = getDb();
    await reorderFields(db, collectionName, body.items);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});

fieldsRouter.post('/:field/duplicate', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const fieldName = String(req.params.field);
    const db = getDb();
    const field = await duplicateField(db, collectionName, fieldName);
    res.status(201).json(success(field));
  } catch (err) {
    next(err);
  }
});

fieldsRouter.post('/:field/rename', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const fieldName = String(req.params.field);
    const body = req.body as { new_field: string };
    if (!body.new_field) {
      res.status(400).json({
        errors: [{ message: 'new_field is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }
    const db = getDb();
    const field = await renameField(db, collectionName, fieldName, body.new_field);
    res.json(success(field));
  } catch (err) {
    next(err);
  }
});

fieldsRouter.get('/:field', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const fieldName = String(req.params.field);
    const db = getDb();
    const field = await getField(db, collectionName, fieldName);
    res.json(success(field));
  } catch (err) {
    next(err);
  }
});

fieldsRouter.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const body = req.body as CreateFieldInput;

    if (!body.field) {
      res.status(400).json({
        errors: [{ message: 'Field name is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    if (!body.type && fieldCreateRequiresType(body.interface)) {
      res.status(400).json({
        errors: [{ message: 'Field type is required', extensions: { code: 'VALIDATION_ERROR' } }],
      });
      return;
    }

    const db = getDb();
    const field = await createField(db, collectionName, body);
    res.status(201).json(success(field));
  } catch (err) {
    next(err);
  }
});

fieldsRouter.patch('/:field', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const fieldName = String(req.params.field);
    const body = req.body as UpdateFieldInput;
    const db = getDb();
    const result = await updateField(db, collectionName, fieldName, body);

    if (result.warning) {
      res.json({
        data: result.field,
        meta: { warning: result.warning },
      });
      return;
    }

    res.json(success(result.field));
  } catch (err) {
    next(err);
  }
});

fieldsRouter.delete('/:field', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionName = String(req.params.name);
    const fieldName = String(req.params.field);
    const db = getDb();
    await deleteField(db, collectionName, fieldName);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});
