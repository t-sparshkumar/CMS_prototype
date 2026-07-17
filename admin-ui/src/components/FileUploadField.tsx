import { useRef, useState } from 'react';
import AssetPickerModal from './AssetPickerModal';
import Icon from './Icon';
import { FieldLabel } from './fields/fieldShared';
import { getAssetUrl, uploadFile, type FieldMeta } from '../lib/api';

interface FileUploadFieldProps {
  field?: FieldMeta;
  label?: string;
  required?: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  accept?: string;
}

function UploadFieldLabel({
  field,
  label,
  required,
}: {
  field?: FieldMeta;
  label?: string;
  required?: boolean;
}) {
  if (field) {
    return <FieldLabel field={field} required={required} />;
  }

  if (!label) {
    return null;
  }

  return (
    <label className="block mb-2">
      <span className="block min-h-5 text-sm font-semibold leading-5 text-slate-800">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
    </label>
  );
}

export default function FileUploadField({
  field,
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
  const displayLabel = field ? field.field : label ?? 'File';

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
      <UploadFieldLabel field={field} label={label} required={required} />

      {previewUrl ? (
        <div className="mb-3 flex items-start gap-3">
          <img
            src={previewUrl}
            alt={displayLabel}
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

      <div className="flex min-h-[42px] flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary h-[42px]"
        >
          <Icon name="upload" className="h-4 w-4" />
          {isUploading ? 'Uploading...' : fileId ? 'Replace from computer' : 'Upload from computer'}
        </button>
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => setShowPicker(true)}
          className="btn-ghost h-[42px]"
        >
          <Icon name="image" className="h-4 w-4" />
          Asset Gallery
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
