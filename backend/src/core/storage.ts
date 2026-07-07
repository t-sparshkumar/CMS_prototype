import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEnv } from '../config/env.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Resolve the absolute upload directory from environment configuration.
 */
export function getUploadDir(): string {
  const configured = getEnv().UPLOAD_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(backendRoot, configured);
}

/**
 * Ensure the upload directory exists on disk.
 */
export async function ensureUploadDir(): Promise<string> {
  const uploadDir = getUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

/**
 * Build the absolute path to a file stored on disk.
 */
export function getDiskFilePath(filenameDisk: string): string {
  return path.join(getUploadDir(), filenameDisk);
}
