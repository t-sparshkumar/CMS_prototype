import { useRef, useState } from 'react';
import Icon from './Icon';
import { uploadFile } from '../lib/api';
import { resolveAdminLogoSrc } from '../lib/adminLogo';
import { useSettingsStore } from '../stores/settingsStore';

export default function LogoUploadField() {
  const adminLogoAssetId = useSettingsStore((s) => s.adminLogoAssetId);
  const logoUrl = useSettingsStore((s) => s.logoUrl);
  const projectName = useSettingsStore((s) => s.projectName);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSrc = resolveAdminLogoSrc({ adminLogoAssetId, logoUrl });

  async function handleFile(file: File) {
    if (file.type !== 'image/png') {
      setError('Please upload a PNG file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file, {
        title: `${projectName} admin logo`,
        description: 'CMS admin panel logo',
        folder: 'branding',
      });
      updateSettings({ adminLogoAssetId: result.id });
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  function handleRemove() {
    updateSettings({ adminLogoAssetId: null, logoUrl: '' });
    setError(null);
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="label">Admin logo</span>
        <p className="mt-1 text-xs text-[var(--app-text-muted)]">
          PNG only. Shown in the CMS sidebar and login — not on the public website.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-16 w-28 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-hover)] p-2">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={`${projectName} logo`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-[var(--app-text-faint)]">No logo</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="btn-secondary text-sm"
          >
            <Icon name="upload" className="h-4 w-4" />
            {isUploading ? 'Uploading…' : 'Upload PNG'}
          </button>
          {(adminLogoAssetId || logoUrl) && (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleRemove}
              className="btn-ghost text-sm text-red-600 hover:text-red-700"
            >
              Remove logo
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
