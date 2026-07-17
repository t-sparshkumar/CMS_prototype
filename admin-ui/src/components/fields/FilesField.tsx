import { useRef, useState } from 'react';
import AssetPickerModal from '../AssetPickerModal';
import Icon from '../Icon';
import { getAssetUrl, uploadFile } from '../../lib/api';
import { FieldLabel } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface FilesFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function FilePreviewItem({
  id,
  disabled,
  onRemove,
}: {
  id: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const [showAsImage, setShowAsImage] = useState(true);

  return (
    <div className="relative group">
      {showAsImage ? (
        <img
          src={getAssetUrl(id, { width: 200, height: 140, fit: 'cover', format: 'webp' })}
          alt=""
          className="w-full h-24 rounded-xl border border-slate-200 object-cover"
          onError={() => setShowAsImage(false)}
        />
      ) : (
        <a
          href={getAssetUrl(id)}
          target="_blank"
          rel="noreferrer"
          className="flex h-24 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-brand-600 hover:bg-slate-100"
        >
          <Icon name="file" className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="truncate font-mono">{id.slice(0, 12)}…</span>
        </a>
      )}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 rounded-lg bg-red-600/90 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function FilesField({ field, value, onChange, disabled }: FilesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const fileIds = Array.isArray(value) ? value.map(String) : [];

  async function uploadFiles(files: FileList | File[]) {
    setIsUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadFile(file, { title: file.name });
        uploaded.push(result.id);
      }
      onChange([...fileIds, ...uploaded]);
    } catch {
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  function removeFile(id: string) {
    onChange(fileIds.filter((fid) => fid !== id));
  }

  return (
    <div>
      <FieldLabel field={field} />
      {fileIds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {fileIds.map((id) => (
            <FilePreviewItem key={id} id={id} disabled={disabled} onRemove={() => removeFile(id)} />
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(e) => void uploadFiles(e.target.files ?? [])}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary text-xs"
        >
          <Icon name="upload" className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload from computer'}
        </button>
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => setShowPicker(true)}
          className="btn-ghost text-xs"
        >
          <Icon name="image" className="h-4 w-4" />
          Asset Gallery
        </button>
      </div>
      <AssetPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(id) => {
          if (!fileIds.includes(id)) onChange([...fileIds, id]);
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
