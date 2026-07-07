import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '../components/AppLayout';
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(type: string | null): boolean {
  return Boolean(type?.startsWith('image/'));
}

export default function AssetGalleryPage({ pickerMode, onSelect }: AssetGalleryPageProps) {
  const [folders, setFolders] = useState<FolderMeta[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const childFolders = folders.filter((f) => f.parent === currentFolder);
  const currentFolderMeta = currentFolder ? folders.find((f) => f.id === currentFolder) : null;

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
    if (!window.confirm(`Delete folder "${folder.name}"? Files will move to root.`)) return;
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
    if (!window.confirm(`Delete "${file.title ?? file.filename_download}"?`)) return;
    await deleteFile(file.id);
    setEditingFile(null);
    void loadData();
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setFolderName('');
          setShowFolderModal(true);
        }}
        className="btn-secondary"
      >
        <Icon name="folder" className="h-4 w-4" />
        New Folder
      </button>
      <button
        type="button"
        onClick={() => {
          setUploadTitle('');
          setUploadDescription('');
          setUploadFileInput(null);
          setShowUploadModal(true);
        }}
        className="btn-primary"
      >
        <Icon name="upload" className="h-4 w-4" />
        Upload Asset
      </button>
    </div>
  );

  const content = (
    <div className={pickerMode ? '' : 'max-w-6xl space-y-5'}>
      {/* Breadcrumb + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setCurrentFolder(null)}
            className={`inline-flex items-center gap-1.5 font-medium ${
              currentFolder === null ? 'text-brand-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon name="folder" className="h-4 w-4" />
            Root
          </button>
          {currentFolderMeta && (
            <>
              <Icon name="chevron-right" className="h-4 w-4 text-slate-300" />
              <span className="text-brand-700 font-medium">{currentFolderMeta.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-64"
            />
          </div>
          {pickerMode && toolbar}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="h-32 bg-slate-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
                <div className="h-2.5 w-1/3 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : childFolders.length === 0 && files.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center">
              <Icon name="image" className="h-7 w-7" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">No Assets Found</h3>
            <p className="text-sm text-slate-500">Upload an asset or create a folder to get started.</p>
            <div className="mt-1">{toolbar}</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {childFolders.map((folder) => (
            <div key={folder.id} className="card p-0 overflow-hidden group">
              <button
                type="button"
                onClick={() => setCurrentFolder(folder.id)}
                className="w-full text-left"
              >
                <div className="h-32 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 text-amber-500 group-hover:from-amber-100 transition-colors">
                  <Icon name="folder" className="h-12 w-12" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-slate-900 truncate">{folder.name}</p>
                  <p className="text-xs text-slate-400">Folder</p>
                </div>
              </button>
              {!pickerMode && (
                <div className="px-3 pb-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolder(folder);
                      setFolderName(folder.name);
                    }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFolder(folder)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {files.map((file) => (
            <div key={file.id} className="card p-0 overflow-hidden group hover:shadow-card-hover transition-all">
              <button
                type="button"
                onClick={() => {
                  if (pickerMode && onSelect) {
                    onSelect(file);
                  } else {
                    setEditingFile(file);
                    setEditTitle(file.title ?? '');
                    setEditDescription(file.description ?? '');
                  }
                }}
                className="w-full text-left"
              >
                <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
                  {isImage(file.type) ? (
                    <img
                      src={getAssetUrl(file.id, { width: 280, height: 200, fit: 'cover', format: 'webp' })}
                      alt={file.title ?? ''}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Icon name="file" className="h-10 w-10 text-slate-300" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {file.title ?? file.filename_download}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.filesize)}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && total > files.length && (
        <p className="text-xs text-slate-400">
          Showing {files.length} of {total} assets
        </p>
      )}

      {/* Folder create/edit modal */}
      <Modal
        open={showFolderModal || editingFolder !== null}
        title={editingFolder ? 'Rename Folder' : 'Create Folder'}
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
        <label className="label">Folder Name</label>
        <input
          autoFocus
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          className="input"
          placeholder="e.g. Marketing"
        />
      </Modal>

      {/* Upload modal */}
      <Modal
        open={showUploadModal}
        title="Upload Asset"
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
              className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50/30 transition-colors px-4 py-8 text-center"
            >
              <Icon name="upload" className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {uploadFileInput ? uploadFileInput.name : 'Click to choose a file'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Images, documents, and media up to 10MB</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setUploadFileInput(f);
                if (f && !uploadTitle) setUploadTitle(f.name);
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

      {/* Edit asset modal */}
      <Modal
        open={editingFile !== null && !pickerMode}
        title="Edit Asset"
        onClose={() => setEditingFile(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => editingFile && void handleDeleteFile(editingFile)}
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
                className="w-full h-48 object-contain rounded-xl bg-slate-50 border border-slate-100"
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
            <p className="text-xs text-slate-400">
              {formatBytes(editingFile.filesize)} ·{' '}
              {editingFile.width && editingFile.height
                ? `${editingFile.width}×${editingFile.height}px`
                : editingFile.type ?? 'file'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );

  if (pickerMode) {
    return content;
  }

  return (
    <AppLayout
      title="Asset Gallery"
      subtitle="View and manage all uploaded images, icons, and media"
      actions={toolbar}
    >
      {content}
    </AppLayout>
  );
}
