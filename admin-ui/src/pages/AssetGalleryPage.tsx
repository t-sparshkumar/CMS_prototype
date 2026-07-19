import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../components/AppLayout';
import ConfirmDialog from '../components/data-model/ConfirmDialog';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  fetchFiles,
  fetchFolders,
  getAssetUrl,
  updateFile,
  updateFolder,
  uploadFile,
  type FileMeta,
  type FolderMeta,
} from '../lib/api';

interface AssetGalleryPageProps {
  pickerMode?: boolean;
  onSelect?: (file: FileMeta) => void;
}

type ViewMode = 'list' | 'grid';
type MenuTarget =
  | { kind: 'folder'; item: FolderMeta }
  | { kind: 'file'; item: FileMeta }
  | null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isImage(type: string | null): boolean {
  return Boolean(type?.startsWith('image/'));
}

function buildBreadcrumbPath(folders: FolderMeta[], currentFolder: string | null): FolderMeta[] {
  const path: FolderMeta[] = [];
  let folderId = currentFolder;

  while (folderId) {
    const folder = folders.find((entry) => entry.id === folderId);
    if (!folder) break;
    path.unshift(folder);
    folderId = folder.parent;
  }

  return path;
}

function sortByName<T extends { name?: string; title?: string | null; filename_download?: string }>(
  items: T[],
  getName: (item: T) => string,
): T[] {
  return [...items].sort((left, right) => getName(left).localeCompare(getName(right), undefined, { sensitivity: 'base' }));
}

interface FolderTreeProps {
  folders: FolderMeta[];
  parent: string | null;
  depth?: number;
  currentFolder: string | null;
  onOpen: (folderId: string | null) => void;
}

function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="asset-gallery-grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="asset-gallery-skeleton-card">
            <div className="asset-gallery-skeleton-preview" />
            <div className="asset-gallery-skeleton-meta">
              <div className="asset-gallery-skeleton-line asset-gallery-skeleton-line-title" />
              <div className="asset-gallery-skeleton-line asset-gallery-skeleton-line-subtitle" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <table className="asset-gallery-table" aria-hidden="true">
      <thead className="asset-gallery-table-head">
        <tr>
          <th>Name</th>
          <th className="hidden sm:table-cell">Date modified</th>
          <th className="hidden md:table-cell w-28">Size</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }, (_, index) => (
          <tr key={index} className="asset-gallery-skeleton-row">
            <td>
              <div className="asset-gallery-skeleton-name">
                <div className="asset-gallery-skeleton-thumb" />
                <div className="asset-gallery-skeleton-line asset-gallery-skeleton-line-title" />
              </div>
            </td>
            <td className="hidden sm:table-cell">
              <div className="asset-gallery-skeleton-line asset-gallery-skeleton-line-date" />
            </td>
            <td className="hidden md:table-cell">
              <div className="asset-gallery-skeleton-line asset-gallery-skeleton-line-size" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FolderTree({ folders, parent, depth = 0, currentFolder, onOpen }: FolderTreeProps) {
  const children = sortByName(
    folders.filter((folder) => folder.parent === parent),
    (folder) => folder.name,
  );

  return (
    <>
      {children.map((folder) => (
        <div key={folder.id}>
          <button
            type="button"
            onClick={() => onOpen(folder.id)}
            className={`asset-gallery-sidebar-item ${
              currentFolder === folder.id ? 'asset-gallery-sidebar-item-active' : ''
            } ${depth > 0 ? 'asset-gallery-sidebar-nested' : ''}`}
            style={depth > 0 ? { paddingLeft: `${1 + depth * 0.75}rem` } : undefined}
          >
            <Icon name="folder" className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate">{folder.name}</span>
          </button>
          <FolderTree
            folders={folders}
            parent={folder.id}
            depth={depth + 1}
            currentFolder={currentFolder}
            onOpen={onOpen}
          />
        </div>
      ))}
    </>
  );
}

export default function AssetGalleryPage({ pickerMode, onSelect }: AssetGalleryPageProps) {
  const [folders, setFolders] = useState<FolderMeta[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<FolderMeta | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFileInput, setUploadFileInput] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [editingFile, setEditingFile] = useState<FileMeta | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderMeta | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileMeta | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [folderList, fileResult] = await Promise.all([
        fetchFolders(),
        fetchFiles({ folder: currentFolder, search: search || undefined, limit: 100 }),
      ]);
      setFolders(folderList);
      setFiles(fileResult.data);
      setTotal(fileResult.total);
    } catch {
      setError('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuKey(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const childFolders = useMemo(
    () =>
      sortByName(
        folders.filter((folder) => folder.parent === currentFolder),
        (folder) => folder.name,
      ),
    [folders, currentFolder],
  );

  const sortedFiles = useMemo(
    () =>
      sortByName(files, (file) => file.title ?? file.filename_download),
    [files],
  );

  const breadcrumbPath = useMemo(
    () => buildBreadcrumbPath(folders, currentFolder),
    [folders, currentFolder],
  );

  const itemCount = childFolders.length + sortedFiles.length;
  const hasSearch = search.trim().length > 0;

  async function handleCreateFolder() {
    if (!folderName.trim()) return;
    await createFolder({ name: folderName.trim(), parent: currentFolder });
    setFolderName('');
    setShowFolderModal(false);
    void loadData();
  }

  async function handleSaveFolder() {
    if (!editingFolder || !folderName.trim()) return;
    await updateFolder(editingFolder.id, { name: folderName.trim() });
    setEditingFolder(null);
    setFolderName('');
    void loadData();
  }

  async function handleDeleteFolder(folder: FolderMeta) {
    await deleteFolder(folder.id);
    if (currentFolder === folder.id) {
      setCurrentFolder(null);
    }
    void loadData();
  }

  async function handleUpload() {
    if (!uploadFileInput) return;
    setIsUploading(true);
    try {
      await uploadFile(uploadFileInput, {
        title: uploadTitle || uploadFileInput.name,
        description: uploadDescription || undefined,
        folder: currentFolder,
      });
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFileInput(null);
      void loadData();
    } catch {
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveFile() {
    if (!editingFile) return;
    await updateFile(editingFile.id, { title: editTitle, description: editDescription });
    setEditingFile(null);
    void loadData();
  }

  async function handleDeleteFile(file: FileMeta) {
    await deleteFile(file.id);
    setEditingFile(null);
    void loadData();
  }

  function menuKey(target: MenuTarget): string | null {
    if (!target) return null;
    return `${target.kind}:${target.item.id}`;
  }

  function openFolder(folderId: string | null) {
    setCurrentFolder(folderId);
    setOpenMenuKey(null);
    setSidebarOpen(false);
  }

  function openFile(file: FileMeta) {
    if (pickerMode && onSelect) {
      onSelect(file);
      return;
    }
    setEditingFile(file);
    setEditTitle(file.title ?? '');
    setEditDescription(file.description ?? '');
  }

  const toolbarActions = (
    <div className="asset-gallery-toolbar-actions">
      <button
        type="button"
        onClick={() => {
          setFolderName('');
          setShowFolderModal(true);
        }}
        className="btn-secondary text-sm"
      >
        <Icon name="folder" className="h-4 w-4" />
        New folder
      </button>
      <button
        type="button"
        onClick={() => {
          setUploadTitle('');
          setUploadDescription('');
          setUploadFileInput(null);
          setShowUploadModal(true);
        }}
        className="btn-primary text-sm"
      >
        <Icon name="upload" className="h-4 w-4" />
        Upload
      </button>
    </div>
  );

  function renderRowMenu(target: MenuTarget) {
    if (!target || pickerMode) return null;
    const key = menuKey(target);
    const isOpen = openMenuKey === key;

    return (
      <div
        className={`relative asset-gallery-row-actions ${isOpen ? 'asset-gallery-row-actions-open' : ''}`}
        ref={isOpen ? menuRef : undefined}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenMenuKey(isOpen ? null : key);
          }}
          className="asset-gallery-row-menu-btn"
          aria-label="More actions"
          aria-expanded={isOpen}
        >
          <Icon name="more" className="h-4 w-4" />
        </button>
        {isOpen && (
          <div className="asset-gallery-menu">
            {target.kind === 'folder' ? (
              <>
                <button
                  type="button"
                  className="asset-gallery-menu-btn"
                  onClick={() => {
                    setEditingFolder(target.item);
                    setFolderName(target.item.name);
                    setOpenMenuKey(null);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="asset-gallery-menu-btn asset-gallery-menu-btn-danger"
                  onClick={() => {
                    setDeleteFolderTarget(target.item);
                    setOpenMenuKey(null);
                  }}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="asset-gallery-menu-btn"
                  onClick={() => {
                    openFile(target.item);
                    setOpenMenuKey(null);
                  }}
                >
                  Edit details
                </button>
                <button
                  type="button"
                  className="asset-gallery-menu-btn asset-gallery-menu-btn-danger"
                  onClick={() => {
                    setDeleteFileTarget(target.item);
                    setOpenMenuKey(null);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderListView() {
    return (
      <table className="asset-gallery-table">
        <thead className="asset-gallery-table-head">
          <tr>
            <th>Name</th>
            <th className="hidden sm:table-cell">Date modified</th>
            <th className="hidden md:table-cell w-28">Size</th>
            {!pickerMode && <th className="w-12" />}
          </tr>
        </thead>
        <tbody>
          {childFolders.map((folder) => {
            const target: MenuTarget = { kind: 'folder', item: folder };
            return (
              <tr key={folder.id} className="asset-gallery-row">
                <td>
                  <button type="button" onClick={() => openFolder(folder.id)} className="asset-gallery-row-name w-full text-left">
                    <span className="asset-gallery-row-icon asset-gallery-row-icon-folder">
                      <Icon name="folder" className="h-4 w-4" />
                    </span>
                    <span className="asset-gallery-row-label truncate" title={folder.name}>
                      {folder.name}
                    </span>
                  </button>
                </td>
                <td className="hidden sm:table-cell">{formatDate(folder.created_on)}</td>
                <td className="hidden md:table-cell">—</td>
                {!pickerMode && <td>{renderRowMenu(target)}</td>}
              </tr>
            );
          })}
          {sortedFiles.map((file) => {
            const target: MenuTarget = { kind: 'file', item: file };
            return (
              <tr key={file.id} className="asset-gallery-row">
                <td>
                  <button type="button" onClick={() => openFile(file)} className="asset-gallery-row-name w-full text-left">
                    {isImage(file.type) ? (
                      <img
                        src={getAssetUrl(file.id, { width: 64, height: 64, fit: 'cover', format: 'webp' })}
                        alt=""
                        className="asset-gallery-row-thumb"
                      />
                    ) : (
                      <span className="asset-gallery-row-icon bg-[var(--app-hover)] text-[var(--app-text-faint)]">
                        <Icon name="file" className="h-4 w-4" />
                      </span>
                    )}
                    <span
                      className="asset-gallery-row-label truncate"
                      title={file.title ?? file.filename_download}
                    >
                      {file.title ?? file.filename_download}
                    </span>
                  </button>
                </td>
                <td className="hidden sm:table-cell">{formatDate(file.uploaded_on)}</td>
                <td className="hidden md:table-cell">{formatBytes(file.filesize)}</td>
                {!pickerMode && <td>{renderRowMenu(target)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  function renderGridView() {
    return (
      <div className="asset-gallery-grid">
        {childFolders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => openFolder(folder.id)}
            className="asset-gallery-grid-item asset-gallery-grid-item-folder"
          >
            <div className="asset-gallery-grid-preview asset-gallery-grid-preview-folder">
              <Icon name="folder" className="h-9 w-9" />
            </div>
            <div className="asset-gallery-grid-meta">
              <p className="asset-gallery-grid-title" title={folder.name}>
                {folder.name}
              </p>
              <p className="asset-gallery-grid-subtitle">Folder</p>
            </div>
          </button>
        ))}
        {sortedFiles.map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => openFile(file)}
            className="asset-gallery-grid-item asset-gallery-grid-item-file"
          >
            <div className="asset-gallery-grid-preview">
              {isImage(file.type) ? (
                <img
                  src={getAssetUrl(file.id, { width: 280, height: 200, fit: 'cover', format: 'webp' })}
                  alt=""
                />
              ) : (
                <Icon name="file" className="h-10 w-10 text-[var(--app-text-faint)]" />
              )}
            </div>
            <div className="asset-gallery-grid-meta">
              <p className="asset-gallery-grid-title" title={file.title ?? file.filename_download}>
                {file.title ?? file.filename_download}
              </p>
              <p className="asset-gallery-grid-subtitle">{formatBytes(file.filesize)}</p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  const driveContent = (
    <div className={`asset-gallery ${pickerMode ? 'asset-gallery-picker' : ''}`}>
      {!pickerMode && sidebarOpen && (
        <button
          type="button"
          className="asset-gallery-sidebar-backdrop"
          aria-label="Close folders panel"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {!pickerMode && (
        <aside className={`asset-gallery-sidebar ${sidebarOpen ? 'asset-gallery-sidebar-open' : ''}`}>
          <p className="asset-gallery-sidebar-label">Folders</p>
          <FolderTree
            folders={folders}
            parent={null}
            currentFolder={currentFolder}
            onOpen={openFolder}
          />
        </aside>
      )}

      <div className="asset-gallery-main">
        <div className="asset-gallery-toolbar">
          {!pickerMode && (
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="asset-gallery-sidebar-toggle"
              aria-label="Toggle folders"
              aria-expanded={sidebarOpen}
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>
          )}
          {toolbarActions}
          <div className="asset-gallery-toolbar-spacer" aria-hidden="true" />
          <div className="asset-gallery-search">
            <Icon name="search" className="asset-gallery-search-icon h-4 w-4" />
            <input
              type="search"
              placeholder="Search in Drive"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="asset-gallery-search-input"
              aria-label="Search assets"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="asset-gallery-search-clear"
                aria-label="Clear search"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="asset-gallery-view-toggle">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`asset-gallery-view-btn ${viewMode === 'list' ? 'asset-gallery-view-btn-active' : ''}`}
              aria-label="List view"
            >
              <Icon name="list" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`asset-gallery-view-btn ${viewMode === 'grid' ? 'asset-gallery-view-btn-active' : ''}`}
              aria-label="Grid view"
            >
              <Icon name="grid" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="asset-gallery-breadcrumb" aria-label="Breadcrumb">
          <div className="asset-gallery-breadcrumb-trail">
            <button type="button" onClick={() => openFolder(null)} className="asset-gallery-breadcrumb-link">
              My Drive
            </button>
            {breadcrumbPath.map((folder, index) => (
              <span key={folder.id} className="asset-gallery-breadcrumb-segment">
                <Icon name="chevron-right" className="asset-gallery-breadcrumb-chevron h-3.5 w-3.5" />
                {index === breadcrumbPath.length - 1 ? (
                  <span className="asset-gallery-breadcrumb-current">{folder.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentFolder(folder.id)}
                    className="asset-gallery-breadcrumb-link"
                  >
                    {folder.name}
                  </button>
                )}
              </span>
            ))}
          </div>
          {!isLoading && (
            <span className="asset-gallery-breadcrumb-count" aria-label={`${itemCount} items`}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </nav>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="asset-gallery-content">
          {isLoading ? (
            <div className="asset-gallery-loading" aria-live="polite" aria-busy="true">
              <div className="asset-gallery-loading-spinner" />
              <LoadingSkeleton viewMode={viewMode} />
            </div>
          ) : childFolders.length === 0 && sortedFiles.length === 0 ? (
            <div className="asset-gallery-empty">
              <span className="asset-gallery-empty-icon">
                <Icon name={hasSearch ? 'search' : 'image'} className="h-7 w-7" />
              </span>
              <h3 className="text-base font-semibold text-[var(--app-text)]">
                {hasSearch ? 'No matching assets' : 'This folder is empty'}
              </h3>
              <p className="max-w-sm text-sm text-[var(--app-text-muted)]">
                {hasSearch
                  ? 'Try a different keyword or clear the search.'
                  : 'Upload files or create a folder to organize your assets, just like Google Drive.'}
              </p>
              {hasSearch ? (
                <button type="button" onClick={() => setSearch('')} className="btn-secondary text-sm">
                  Clear search
                </button>
              ) : (
                toolbarActions
              )}
            </div>
          ) : viewMode === 'list' ? (
            renderListView()
          ) : (
            renderGridView()
          )}
        </div>

        {!isLoading && total > sortedFiles.length && (
          <p className="border-t border-[var(--app-border)] px-4 py-2 text-xs text-[var(--app-text-faint)]">
            Showing {sortedFiles.length} of {total} files in this folder
          </p>
        )}
      </div>
    </div>
  );

  const modals = (
    <>
      <Modal
        open={showFolderModal || editingFolder !== null}
        title={editingFolder ? 'Rename folder' : 'New folder'}
        onClose={() => {
          setShowFolderModal(false);
          setEditingFolder(null);
          setFolderName('');
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowFolderModal(false);
                setEditingFolder(null);
                setFolderName('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void (editingFolder ? handleSaveFolder() : handleCreateFolder())}
              className="btn-primary"
            >
              {editingFolder ? 'Save' : 'Create'}
            </button>
          </>
        }
      >
        <label className="label">Folder name</label>
        <input
          autoFocus
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          className="input"
          placeholder="e.g. Marketing"
        />
      </Modal>

      <Modal
        open={showUploadModal}
        title="Upload file"
        onClose={() => setShowUploadModal(false)}
        footer={
          <>
            <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              disabled={!uploadFileInput || isUploading}
              onClick={() => void handleUpload()}
              className="btn-primary"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">File</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-[var(--app-border)] px-4 py-8 text-center transition-colors hover:border-[var(--app-accent)] hover:bg-[var(--app-accent-light)]/30"
            >
              <Icon name="upload" className="mx-auto mb-2 h-8 w-8 text-[var(--app-text-faint)]" />
              <p className="text-sm font-medium text-[var(--app-text)]">
                {uploadFileInput ? uploadFileInput.name : 'Choose a file to upload'}
              </p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setUploadFileInput(file);
                if (file && !uploadTitle) setUploadTitle(file.name);
              }}
            />
          </div>
          <div>
            <label className="label">Title</label>
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder={uploadFileInput?.name ?? 'Asset title'}
              className="input"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              rows={3}
              className="input"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={editingFile !== null && !pickerMode}
        title="File details"
        onClose={() => setEditingFile(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => editingFile && setDeleteFileTarget(editingFile)}
              className="btn-danger mr-auto"
            >
              <Icon name="trash" className="h-4 w-4" />
              Delete
            </button>
            <button type="button" onClick={() => setEditingFile(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={() => void handleSaveFile()} className="btn-primary">
              Save
            </button>
          </>
        }
      >
        {editingFile && (
          <div className="space-y-4">
            {isImage(editingFile.type) && (
              <img
                src={getAssetUrl(editingFile.id, { width: 560, height: 280, fit: 'contain', format: 'webp' })}
                alt=""
                className="h-48 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-hover)] object-contain"
              />
            )}
            <div>
              <label className="label">Title</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="input"
              />
            </div>
            <p className="text-xs text-[var(--app-text-faint)]">
              {formatBytes(editingFile.filesize)} ·{' '}
              {editingFile.width && editingFile.height
                ? `${editingFile.width}×${editingFile.height}px`
                : editingFile.type ?? 'file'}
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteFolderTarget !== null}
        title="Delete folder"
        message={`Delete folder "${deleteFolderTarget?.name}"? Files inside will move to the root folder.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteFolderTarget) return;
          void handleDeleteFolder(deleteFolderTarget).finally(() => setDeleteFolderTarget(null));
        }}
        onCancel={() => setDeleteFolderTarget(null)}
      />

      <ConfirmDialog
        open={deleteFileTarget !== null}
        title="Delete file"
        message={`Delete "${deleteFileTarget?.title ?? deleteFileTarget?.filename_download}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteFileTarget) return;
          void handleDeleteFile(deleteFileTarget).finally(() => setDeleteFileTarget(null));
        }}
        onCancel={() => setDeleteFileTarget(null)}
      />
    </>
  );

  if (pickerMode) {
    return (
      <>
        {driveContent}
        {modals}
      </>
    );
  }

  return (
    <AppLayout
      title="Asset Gallery"
      subtitle="Browse folders and files like Google Drive"
      fullWidth
    >
      {driveContent}
      {modals}
    </AppLayout>
  );
}
