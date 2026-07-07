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

export default function FilesField({ field, value, onChange, disabled }: FilesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileIds = Array.isArray(value) ? value.map(String) : [];

  async function uploadFiles(files: FileList | File[]) {
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadFile(file, { title: file.name });
        uploaded.push(result.id);
      }
      onChange([...fileIds, ...uploaded]);
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
            <div key={id} className="relative group">
              <img
                src={getAssetUrl(id, { width: 200, height: 140, fit: 'cover', format: 'webp' })}
                alt=""
                className="w-full h-24 rounded-xl border border-slate-200 object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(id)}
                  className="absolute top-1.5 right-1.5 rounded-lg bg-red-600/90 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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
          {isUploading ? 'Uploading...' : 'Upload files'}
        </button>
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => setShowPicker(true)}
          className="btn-ghost text-xs"
        >
          <Icon name="image" className="h-4 w-4" />
          From gallery
        </button>
      </div>
      <AssetPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(id) => {
          if (!fileIds.includes(id)) onChange([...fileIds, id]);
        }}
      />
    </div>
  );
}
