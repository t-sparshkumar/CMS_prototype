import { FormEvent, useState } from 'react';
import Modal from '../Modal';
import CollectionIconPicker from './CollectionIconPicker';
import ColorPickerField from './ColorPickerField';
import {
  createFolderTitle,
  failedToCreateFolder,
  folderKeyLabel,
} from '../../lib/collectionLabels';
import { createCollection, type CollectionMeta } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiErrors';

interface CreateFolderModalProps {
  parent?: string | null;
  onClose: () => void;
  onCreated: (collection: CollectionMeta) => void;
}

export default function CreateFolderModal({
  parent = null,
  onClose,
  onCreated,
}: CreateFolderModalProps) {
  const [key, setKey] = useState('');
  const [icon, setIcon] = useState('folder');
  const [color, setColor] = useState('#6366f1');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const created = await createCollection({
        collection: key.trim(),
        parent,
        is_group: true,
        icon,
        color,
        note: note.trim() || null,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, failedToCreateFolder()));
      setIsSaving(false);
    }
  }

  return (
    <Modal open title={createFolderTitle()} onClose={onClose} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="label">{folderKeyLabel()}</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            pattern="[a-z][a-z0-9_]*"
            required
            autoFocus
            className="input w-full font-mono"
            placeholder="my_folder"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Icon</label>
            <CollectionIconPicker value={icon} onChange={setIcon} color={color} isGroup />
          </div>
          <div>
            <label className="label">Color</label>
            <ColorPickerField value={color} onChange={setColor} />
          </div>
        </div>

        <div>
          <label className="label">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input w-full"
            placeholder="Optional description"
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            Folders organize collections and do not hold items directly.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
