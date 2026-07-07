export interface CmsFolderRow {
  id: string;
  name: string;
  parent: string | null;
  created_on: string | Date;
}

export interface FolderMeta {
  id: string;
  name: string;
  parent: string | null;
  created_on: string;
}

export interface CreateFolderInput {
  name: string;
  parent?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  parent?: string | null;
}
