import { useRef, useState } from 'react';
import AssetPickerModal from '../AssetPickerModal';
import Icon from '../Icon';
import { getAssetUrl, uploadFile } from '../../lib/api';
import { RESPONSIVE_IMAGE_SLOTS } from '../../lib/responsiveImageFields';

interface ResponsiveImageGroupFieldProps {
  values: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  disabled?: boolean;
}

function DeviceIcon({ type }: { type: 'mobile' | 'tablet' | 'desktop' }) {
  if (type === 'mobile') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'tablet') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M10 18h4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 19h6" strokeLinecap="round" />
      <path d="M12 17v2" strokeLinecap="round" />
    </svg>
  );
}

function ImageDropzone({
  label,
  recommend,
  icon,
  iconClass,
  value,
  onChange,
  disabled,
}: {
  label: string;
  recommend: string;
  icon: 'mobile' | 'tablet' | 'desktop';
  iconClass: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileId = typeof value === 'string' && value.length > 0 ? value : null;
  const previewUrl = fileId
    ? getAssetUrl(fileId, { width: 480, height: 280, fit: 'cover', format: 'webp' })
    : null;

  async function handleFile(file: File | null) {
    if (!file || disabled) {
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
    <div className="responsive-image-slot">
      <div className={`responsive-image-slot-label ${iconClass}`}>
        <DeviceIcon type={icon} />
        <span>{label}</span>
      </div>

      <div
        className={`responsive-image-dropzone ${isDragOver ? 'is-dragover' : ''} ${previewUrl ? 'has-image' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          if (disabled) {
            return;
          }
          void handleFile(event.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => {
          if (!disabled && !isUploading) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled && !isUploading) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload ${label.toLowerCase()} image`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <>
            <img src={previewUrl} alt={label} className="responsive-image-preview" />
            <div className="responsive-image-preview-overlay">
              <span className="text-xs font-medium text-white">{isUploading ? 'Uploading…' : 'Replace image'}</span>
            </div>
            {!disabled && (
              <button
                type="button"
                className="responsive-image-remove"
                aria-label={`Remove ${label.toLowerCase()} image`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(null);
                }}
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="responsive-image-empty">
            <span className="responsive-image-upload-icon">
              <Icon name="upload" className="h-6 w-6" />
            </span>
            <p className="responsive-image-drop-text">
              Drop or <span className="responsive-image-drop-action">click</span>
            </p>
            <p className="responsive-image-recommend">Recommended: {recommend}</p>
          </div>
        )}
      </div>

      {!disabled && (
        <button
          type="button"
          className="responsive-image-gallery-link"
          onClick={() => setShowPicker(true)}
        >
          <Icon name="image" className="h-3.5 w-3.5" />
          Asset Gallery
        </button>
      )}

      <AssetPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(id) => onChange(id)}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ResponsiveImageGroupField({
  values,
  onChange,
  disabled,
}: ResponsiveImageGroupFieldProps) {
  return (
    <div className="responsive-image-group">
      {RESPONSIVE_IMAGE_SLOTS.map((slot) => (
        <ImageDropzone
          key={slot.field}
          label={slot.label}
          recommend={slot.recommend}
          icon={slot.icon}
          iconClass={slot.iconClass}
          value={values[slot.field]}
          onChange={(nextValue) => onChange(slot.field, nextValue)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
