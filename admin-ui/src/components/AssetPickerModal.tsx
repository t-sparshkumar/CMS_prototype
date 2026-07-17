import AssetGalleryPage from '../pages/AssetGalleryPage';
import Icon from './Icon';
import type { FileMeta } from '../lib/api';

interface AssetPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (fileId: string) => void;
}

export default function AssetPickerModal({ open, onClose, onSelect }: AssetPickerModalProps) {
  if (!open) {
    return null;
  }

  function handleSelect(file: FileMeta) {
    onSelect(file.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-elevated animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--app-text)]">Choose from Asset Gallery</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-auto p-4">
          <AssetGalleryPage pickerMode onSelect={handleSelect} />
        </div>
      </div>
    </div>
  );
}
