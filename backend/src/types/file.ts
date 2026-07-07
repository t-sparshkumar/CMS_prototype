export interface CmsFileRow {
  id: string;
  storage: string;
  filename_disk: string;
  filename_download: string;
  title: string | null;
  description: string | null;
  type: string | null;
  folder: string | null;
  uploaded_by: string | null;
  uploaded_on: string | Date;
  filesize: number;
  width: number | null;
  height: number | null;
}

export interface FileMeta {
  id: string;
  storage: string;
  filename_disk: string;
  filename_download: string;
  title: string | null;
  description: string | null;
  type: string | null;
  folder: string | null;
  uploaded_by: string | null;
  uploaded_on: string;
  filesize: number;
  width: number | null;
  height: number | null;
}

export interface UploadFileOptions {
  title?: string | null;
  description?: string | null;
  folder?: string | null;
}

export interface UpdateFileInput {
  title?: string | null;
  description?: string | null;
  folder?: string | null;
}

export interface ListFilesOptions {
  folder?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListFilesResult {
  data: FileMeta[];
  total: number;
}

export type ImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif';

export interface AssetTransformOptions {
  width?: number;
  height?: number;
  fit?: ImageFit;
  format?: ImageFormat;
}
