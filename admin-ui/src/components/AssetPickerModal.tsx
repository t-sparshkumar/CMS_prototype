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
        className="bg-slate-50 rounded-2xl shadow-elevated w-full max-w-5xl max-h-[90vh] overflow-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Choose from Asset Gallery</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <AssetGalleryPage pickerMode onSelect={handleSelect} />
        </div>
      </div>
    </div>
  );
}
