import { FormEvent, useState } from 'react';
import Modal from './Modal';
import IconPicker from './data-model/IconPicker';
import { createCollection, type CollectionMeta } from '../lib/api';

interface CreateSubCollectionModalProps {
  parent: CollectionMeta;
  onClose: () => void;
  onCreated: (collection: CollectionMeta) => void;
}

export default function CreateSubCollectionModal({
  parent,
  onClose,
  onCreated,
}: CreateSubCollectionModalProps) {
  const [name, setName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
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
        collection: name.trim(),
        parent: parent.collection,
        is_group: isGroup,
        icon,
        color,
        note: note.trim() || null,
        optional_system_fields: isGroup
          ? undefined
          : { status: true, sort: false, accountability: true },
      });
      onCreated(created);
      onClose();
    } catch {
      setError('Failed to create sub-collection');
      setIsSaving(false);
    }
  }

  return (
    <Modal open title={`Add sub-collection to ${parent.collection}`} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Collection name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            pattern="[a-z][a-z0-9_]*"
            required
            autoFocus
            className="input w-full"
            placeholder="my_sub_collection"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input w-full"
            placeholder="Optional description"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isGroup}
            onChange={(e) => setIsGroup(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Group collection (contains other collections, no items)
        </label>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Icon</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-16 rounded-lg border border-slate-200"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Creating...' : 'Create sub-collection'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
