import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/errorHandler.js';
import type { CmsFolderRow, CreateFolderInput, FolderMeta, UpdateFolderInput } from '../types/folder.js';

function toFolderMeta(row: CmsFolderRow): FolderMeta {
  const createdOn =
    row.created_on instanceof Date ? row.created_on.toISOString() : new Date(row.created_on).toISOString();

  return {
    id: row.id,
    name: row.name,
    parent: row.parent,
    created_on: createdOn,
  };
}

/**
 * List all asset folders.
 */
export async function listFolders(db: Knex): Promise<FolderMeta[]> {
  const rows = await db<CmsFolderRow>('cms_folders').orderBy('name', 'asc');
  return rows.map(toFolderMeta);
}

/**
 * Create a new asset folder.
 */
export async function createFolder(db: Knex, input: CreateFolderInput): Promise<FolderMeta> {
  const name = input.name.trim();
  if (!name) {
    throw new AppError('Folder name is required', 400, 'VALIDATION_ERROR');
  }

  if (input.parent) {
    const parent = await db<CmsFolderRow>('cms_folders').where({ id: input.parent }).first();
    if (!parent) {
      throw new AppError('Parent folder not found', 404, 'NOT_FOUND');
    }
  }

  const row: CmsFolderRow = {
    id: randomUUID(),
    name,
    parent: input.parent ?? null,
    created_on: new Date().toISOString(),
  };

  await db('cms_folders').insert(row);
  return toFolderMeta(row);
}

/**
 * Update folder metadata.
 */
export async function updateFolder(db: Knex, folderId: string, input: UpdateFolderInput): Promise<FolderMeta> {
  const existing = await db<CmsFolderRow>('cms_folders').where({ id: folderId }).first();
  if (!existing) {
    throw new AppError('Folder not found', 404, 'NOT_FOUND');
  }

  const updates: Partial<CmsFolderRow> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new AppError('Folder name is required', 400, 'VALIDATION_ERROR');
    }
    updates.name = name;
  }

  if (input.parent !== undefined) {
    if (input.parent === folderId) {
      throw new AppError('A folder cannot be its own parent', 400, 'VALIDATION_ERROR');
    }
    if (input.parent) {
      const parent = await db<CmsFolderRow>('cms_folders').where({ id: input.parent }).first();
      if (!parent) {
        throw new AppError('Parent folder not found', 404, 'NOT_FOUND');
      }
    }
    updates.parent = input.parent;
  }

  if (Object.keys(updates).length > 0) {
    await db('cms_folders').where({ id: folderId }).update(updates);
  }

  const updated = await db<CmsFolderRow>('cms_folders').where({ id: folderId }).first();
  return toFolderMeta(updated!);
}

/**
 * Delete a folder and move its files to root.
 */
export async function deleteFolder(db: Knex, folderId: string): Promise<void> {
  const existing = await db<CmsFolderRow>('cms_folders').where({ id: folderId }).first();
  if (!existing) {
    throw new AppError('Folder not found', 404, 'NOT_FOUND');
  }

  await db('cms_files').where({ folder: folderId }).update({ folder: null });
  await db('cms_folders').where({ parent: folderId }).update({ parent: null });
  await db('cms_folders').where({ id: folderId }).del();
}
