import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { getDb } from '../db/knex.js';
import { getFileById, parseAssetTransforms, streamAsset } from '../services/files.service.js';

export const assetsRouter = Router();

assetsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = String(req.params.id);
    const db = getDb();
    const file = await getFileById(db, fileId);
    const transforms = parseAssetTransforms(req.query as Record<string, unknown>);
    await streamAsset(file, transforms, res);
  } catch (err) {
    next(err);
  }
});
