import fs from 'node:fs/promises';
import path from 'node:path';
import type { Knex } from 'knex';
import type { Response } from 'express';
import sharp, { type FitEnum, type Sharp } from 'sharp';
import { getDiskFilePath } from '../core/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  AssetTransformOptions,
  CmsFileRow,
  FileMeta,
  ImageFit,
  ImageFormat,
  ListFilesOptions,
  ListFilesResult,
  UpdateFileInput,
  UploadFileOptions,
} from '../types/file.js';

const IMAGE_MIME_PREFIX = 'image/';
const FIT_VALUES: ImageFit[] = ['cover', 'contain', 'fill', 'inside', 'outside'];
const FORMAT_VALUES: ImageFormat[] = ['webp', 'jpeg', 'png', 'avif'];

/**
 * Save an uploaded file to metadata storage and return the file record.
 */
export async function createFileFromUpload(
  db: Knex,
  file: Express.Multer.File,
  userId: string | null,
  options: UploadFileOptions = {},
): Promise<FileMeta> {
  const id = path.parse(file.filename).name;
  const dimensions = await readImageDimensions(file.path, file.mimetype);

  const row: CmsFileRow = {
    id,
    storage: 'local',
    filename_disk: file.filename,
    filename_download: file.originalname,
    title: options.title ?? file.originalname,
    description: options.description ?? null,
    type: file.mimetype || null,
    folder: options.folder ?? null,
    uploaded_by: userId,
    uploaded_on: new Date().toISOString(),
    filesize: file.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  };

  try {
    await db('cms_files').insert({
      ...row,
      uploaded_on: row.uploaded_on,
    });
  } catch (err) {
    await fs.unlink(file.path).catch(() => undefined);
    throw err;
  }

  return toFileMeta(row);
}

/**
 * List files with optional folder and search filters.
 */
export async function listFiles(db: Knex, options: ListFilesOptions = {}): Promise<ListFilesResult> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  let query = db<CmsFileRow>('cms_files');
  let countQuery = db('cms_files');

  if (options.folder === null || options.folder === 'root') {
    query = query.whereNull('folder');
    countQuery = countQuery.whereNull('folder');
  } else if (options.folder) {
    query = query.where({ folder: options.folder });
    countQuery = countQuery.where({ folder: options.folder });
  }

  if (options.search?.trim()) {
    const term = `%${options.search.trim().toLowerCase()}%`;
    const searchFilter = (builder: Knex.QueryBuilder) => {
      builder
        .whereRaw('lower(title) like ?', [term])
        .orWhereRaw('lower(filename_download) like ?', [term])
        .orWhereRaw('lower(coalesce(description, "")) like ?', [term]);
    };
    query = query.where(searchFilter);
    countQuery = countQuery.where(searchFilter);
  }

  const [rows, countRow] = await Promise.all([
    query.orderBy('uploaded_on', 'desc').limit(limit).offset(offset),
    countQuery.count<{ count: string | number }>({ count: '*' }).first(),
  ]);

  return {
    data: rows.map((row) => toFileMeta(normalizeRow(row))),
    total: Number(countRow?.count ?? 0),
  };
}

/**
 * Update file metadata.
 */
export async function updateFile(db: Knex, fileId: string, input: UpdateFileInput): Promise<FileMeta> {
  const existing = await db<CmsFileRow>('cms_files').where({ id: fileId }).first();
  if (!existing) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  const updates: Partial<CmsFileRow> = {};

  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }
  if (input.folder !== undefined) {
    if (input.folder) {
      const folder = await db('cms_folders').where({ id: input.folder }).first();
      if (!folder) {
        throw new AppError('Folder not found', 404, 'NOT_FOUND');
      }
    }
    updates.folder = input.folder;
  }

  if (Object.keys(updates).length > 0) {
    await db('cms_files').where({ id: fileId }).update(updates);
  }

  return getFileById(db, fileId);
}

/**
 * Delete a file from storage and metadata.
 */
export async function deleteFile(db: Knex, fileId: string): Promise<void> {
  const row = await db<CmsFileRow>('cms_files').where({ id: fileId }).first();
  if (!row) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  const diskPath = getDiskFilePath(row.filename_disk);
  await db('cms_files').where({ id: fileId }).del();
  await fs.unlink(diskPath).catch(() => undefined);
}

/**
 * Get file metadata by ID.
 */
export async function getFileById(db: Knex, fileId: string): Promise<FileMeta> {
  const row = await db<CmsFileRow>('cms_files').where({ id: fileId }).first();
  if (!row) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  return toFileMeta(normalizeRow(row));
}

/**
 * Stream a file to the response, optionally applying image transforms.
 */
export async function streamAsset(
  file: FileMeta,
  transforms: AssetTransformOptions,
  res: Response,
): Promise<void> {
  const diskPath = getDiskFilePath(file.filename_disk);

  try {
    await fs.access(diskPath);
  } catch {
    throw new AppError('File not found on disk', 404, 'NOT_FOUND');
  }

  const hasTransforms =
    transforms.width !== undefined ||
    transforms.height !== undefined ||
    transforms.format !== undefined;

  if (!hasTransforms) {
    res.type(file.type ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename_download)}"`);
    res.sendFile(diskPath);
    return;
  }

  if (!isImageType(file.type)) {
    throw new AppError('Image transforms are only supported for image files', 400, 'VALIDATION_ERROR');
  }

  let pipeline = sharp(diskPath);

  if (transforms.width !== undefined || transforms.height !== undefined) {
    pipeline = pipeline.resize({
      width: transforms.width,
      height: transforms.height,
      fit: mapFit(transforms.fit),
      withoutEnlargement: true,
    });
  }

  const outputFormat = transforms.format ?? inferFormatFromMime(file.type);
  pipeline = applyOutputFormat(pipeline, outputFormat);

  res.type(mimeForFormat(outputFormat));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  try {
    const buffer = await pipeline.toBuffer();
    res.send(buffer);
  } catch {
    throw new AppError('Failed to transform image', 400, 'TRANSFORM_ERROR');
  }
}

/**
 * Parse asset transform query parameters.
 */
export function parseAssetTransforms(query: Record<string, unknown>): AssetTransformOptions {
  const transforms: AssetTransformOptions = {};

  if (query.width !== undefined) {
    const width = Number(query.width);
    if (!Number.isInteger(width) || width <= 0) {
      throw new AppError('Invalid width parameter', 400, 'VALIDATION_ERROR');
    }
    transforms.width = width;
  }

  if (query.height !== undefined) {
    const height = Number(query.height);
    if (!Number.isInteger(height) || height <= 0) {
      throw new AppError('Invalid height parameter', 400, 'VALIDATION_ERROR');
    }
    transforms.height = height;
  }

  if (query.fit !== undefined) {
    const fit = String(query.fit) as ImageFit;
    if (!FIT_VALUES.includes(fit)) {
      throw new AppError(`Invalid fit parameter. Allowed: ${FIT_VALUES.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    transforms.fit = fit;
  }

  if (query.format !== undefined) {
    let format = String(query.format).toLowerCase();
    if (format === 'jpg') {
      format = 'jpeg';
    }
    if (!FORMAT_VALUES.includes(format as ImageFormat)) {
      throw new AppError(`Invalid format parameter. Allowed: ${FORMAT_VALUES.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    transforms.format = format as ImageFormat;
  }

  return transforms;
}

function toFileMeta(row: CmsFileRow): FileMeta {
  const uploadedOn =
    row.uploaded_on instanceof Date ? row.uploaded_on.toISOString() : new Date(row.uploaded_on).toISOString();

  return {
    id: row.id,
    storage: row.storage,
    filename_disk: row.filename_disk,
    filename_download: row.filename_download,
    title: row.title,
    description: row.description ?? null,
    type: row.type,
    folder: row.folder,
    uploaded_by: row.uploaded_by,
    uploaded_on: uploadedOn,
    filesize: row.filesize,
    width: row.width,
    height: row.height,
  };
}

function normalizeRow(row: CmsFileRow): CmsFileRow {
  return {
    ...row,
    uploaded_on: row.uploaded_on instanceof Date ? row.uploaded_on.toISOString() : row.uploaded_on,
  };
}

async function readImageDimensions(
  filePath: string,
  mimeType: string,
): Promise<{ width: number; height: number } | null> {
  if (!isImageType(mimeType)) {
    return null;
  }

  try {
    const metadata = await sharp(filePath).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
  } catch {
    return null;
  }

  return null;
}

function isImageType(mimeType: string | null): boolean {
  return Boolean(mimeType?.startsWith(IMAGE_MIME_PREFIX));
}

function mapFit(fit: ImageFit | undefined): keyof FitEnum {
  const mapping: Record<ImageFit, keyof FitEnum> = {
    cover: 'cover',
    contain: 'contain',
    fill: 'fill',
    inside: 'inside',
    outside: 'outside',
  };
  return mapping[fit ?? 'cover'];
}

function applyOutputFormat(pipeline: Sharp, format: ImageFormat): Sharp {
  switch (format) {
    case 'webp':
      return pipeline.webp();
    case 'png':
      return pipeline.png();
    case 'avif':
      return pipeline.avif();
    case 'jpeg':
    default:
      return pipeline.jpeg();
  }
}

function inferFormatFromMime(mimeType: string | null): ImageFormat {
  if (mimeType === 'image/png') {
    return 'png';
  }
  if (mimeType === 'image/webp') {
    return 'webp';
  }
  if (mimeType === 'image/avif') {
    return 'avif';
  }
  return 'jpeg';
}

function mimeForFormat(format: ImageFormat): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'png':
      return 'image/png';
    case 'avif':
      return 'image/avif';
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}
