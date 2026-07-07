import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { logActivity } from '../services/activity.service.js';
import {
  createFileFromUpload,
  deleteFile,
  getFileById,
  listFiles,
  updateFile,
} from '../services/files.service.js';
import { createFolder, deleteFolder, listFolders, updateFolder } from '../services/folders.service.js';

export const filesRouter = Router();

filesRouter.use(requireAuth);

filesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const folderParam = req.query.folder;
    let folder: string | null | undefined;
    if (folderParam === 'root') {
      folder = null;
    } else if (typeof folderParam === 'string' && folderParam.length > 0) {
      folder = folderParam;
    }

    const result = await listFiles(db, {
      folder,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

filesRouter.get('/folders', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const folders = await listFolders(db);
    res.json(success(folders));
  } catch (err) {
    next(err);
  }
});

filesRouter.post('/folders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name : '';
    const parent = typeof req.body.parent === 'string' ? req.body.parent : null;
    const db = getDb();
    const folder = await createFolder(db, { name, parent });
    await logActivity(db, {
      action: 'create',
      user: req.user?.id ?? null,
      collection: 'cms_folders',
      item: folder.id,
      comment: `Created folder "${folder.name}"`,
    });
    res.status(201).json(success(folder));
  } catch (err) {
    next(err);
  }
});

filesRouter.patch('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId = String(req.params.id);
    const db = getDb();
    const folder = await updateFolder(db, folderId, {
      name: typeof req.body.name === 'string' ? req.body.name : undefined,
      parent: req.body.parent === null ? null : typeof req.body.parent === 'string' ? req.body.parent : undefined,
    });
    await logActivity(db, {
      action: 'update',
      user: req.user?.id ?? null,
      collection: 'cms_folders',
      item: folder.id,
      comment: `Updated folder "${folder.name}"`,
    });
    res.json(success(folder));
  } catch (err) {
    next(err);
  }
});

filesRouter.delete('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId = String(req.params.id);
    const db = getDb();
    await deleteFolder(db, folderId);
    await logActivity(db, {
      action: 'delete',
      user: req.user?.id ?? null,
      collection: 'cms_folders',
      item: folderId,
      comment: 'Deleted folder',
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

filesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = String(req.params.id);
    const db = getDb();
    const file = await getFileById(db, fileId);
    res.json(success(file));
  } catch (err) {
    next(err);
  }
});

filesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = String(req.params.id);
    const db = getDb();
    const file = await updateFile(db, fileId, {
      title: req.body.title !== undefined ? req.body.title : undefined,
      description: req.body.description !== undefined ? req.body.description : undefined,
      folder: req.body.folder !== undefined ? req.body.folder : undefined,
    });
    await logActivity(db, {
      action: 'update',
      user: req.user?.id ?? null,
      collection: 'cms_files',
      item: file.id,
      comment: `Updated asset "${file.title ?? file.filename_download}"`,
    });
    res.json(success(file));
  } catch (err) {
    next(err);
  }
});

filesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = String(req.params.id);
    const db = getDb();
    const file = await getFileById(db, fileId);
    await deleteFile(db, fileId);
    await logActivity(db, {
      action: 'delete',
      user: req.user?.id ?? null,
      collection: 'cms_files',
      item: file.id,
      comment: `Deleted asset "${file.title ?? file.filename_download}"`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

filesRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new AppError('File exceeds the 10MB size limit', 413, 'FILE_TOO_LARGE'));
          return;
        }
        next(new AppError(err.message, 400, 'VALIDATION_ERROR'));
        return;
      }
      next(err);
      return;
    }

    void handleUpload(req, res, next);
  });
});

async function handleUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded. Use multipart field name "file".', 400, 'VALIDATION_ERROR');
    }

    const title = typeof req.body.title === 'string' ? req.body.title : undefined;
    const description = typeof req.body.description === 'string' ? req.body.description : undefined;
    const folder = typeof req.body.folder === 'string' ? req.body.folder : undefined;

    const db = getDb();
    const file = await createFileFromUpload(db, req.file, req.user?.id ?? null, { title, description, folder });
    await logActivity(db, {
      action: 'upload',
      user: req.user?.id ?? null,
      collection: 'cms_files',
      item: file.id,
      comment: `Uploaded asset "${file.title ?? file.filename_download}"`,
    });
    res.status(201).json(success(file));
  } catch (err) {
    next(err);
  }
}
