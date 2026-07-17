export interface CollectionTypeMeta {
  is_group: boolean;
}

export function collectionTypeLabel(meta: CollectionTypeMeta): 'Folder' | 'Collection' {
  return meta.is_group ? 'Folder' : 'Collection';
}

export function collectionTypeLabelLower(meta: CollectionTypeMeta): 'folder' | 'collection' {
  return meta.is_group ? 'folder' : 'collection';
}

export function collectionTypeLabelPlural(meta: CollectionTypeMeta): 'Folders' | 'Collections' {
  return meta.is_group ? 'Folders' : 'Collections';
}

export function childCollectionsLabel(count: number): string {
  return `${count} collection${count === 1 ? '' : 's'}`;
}

export function nestedCollectionsHeading(): string {
  return 'Collections';
}

export function nestedUnderLabel(parentName: string): string {
  return `Nested under ${parentName}`;
}

export function createFolderTitle(): string {
  return 'Create Folder';
}

export function createCollectionTitle(): string {
  return 'Create Collection';
}

export function addFolderLabel(): string {
  return 'Add Folder';
}

export function addCollectionLabel(): string {
  return 'Add Collection';
}

export function openFolderLabel(): string {
  return 'Open folder';
}

export function openCollectionLabel(): string {
  return 'Open collection';
}

export function openGroupLabel(): string {
  return 'Open folder';
}

export function folderKeyLabel(): string {
  return 'Folder Key';
}

export function collectionKeyLabel(): string {
  return 'Collection Key';
}

export function nestedCollectionBadgeLabel(): string {
  return 'Nested';
}

export function folderBadgeLabel(): string {
  return 'Folder';
}

export function browseFolderSubtitle(): string {
  return 'Browse collections in this folder';
}

export function manageFolderSubtitle(): string {
  return 'Manage collections in this folder';
}

export function noCollectionsInFolder(parentName: string): string {
  return `Add a collection under ${parentName}.`;
}

export function failedToCreateFolder(): string {
  return 'Failed to create folder';
}

export function failedToCreateCollection(): string {
  return 'Failed to create collection';
}
