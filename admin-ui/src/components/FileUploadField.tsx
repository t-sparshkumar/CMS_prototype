import { useRef, useState } from 'react';
import AssetPickerModal from './AssetPickerModal';
import Icon from './Icon';
import { getAssetUrl, uploadFile } from '../lib/api';

interface FileUploadFieldProps {
  label: string;
  required?: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  accept?: string;
}

export default function FileUploadField({
  label,
  required,
  value,
  onChange,
  disabled,
  accept,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const fileId = typeof value === 'string' && value.length > 0 ? value : null;
  const previewUrl = fileId ? getAssetUrl(fileId, { width: 320, height: 200, fit: 'cover', format: 'webp' }) : null;

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file, { title: file.name });
      onChange(uploaded.id);
    } catch {
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {previewUrl ? (
        <div className="mb-3 flex items-start gap-3">
          <img
            src={previewUrl}
            alt={label}
            className="h-24 w-32 rounded-xl border border-slate-200 object-cover shadow-sm"
          />
          <div className="text-xs text-slate-400 break-all">
            <p className="font-mono">{fileId}</p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="mt-2 inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-700"
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled || isUploading}
        onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary"
        >
          <Icon name="upload" className="h-4 w-4" />
          {isUploading ? 'Uploading...' : fileId ? 'Replace' : 'Upload'}
        </button>
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => setShowPicker(true)}
          className="btn-ghost"
        >
          <Icon name="image" className="h-4 w-4" />
          Choose from gallery
        </button>
      </div>

      <AssetPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(id) => onChange(id)}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
