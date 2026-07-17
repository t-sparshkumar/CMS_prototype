import { FormEvent, useState } from 'react';
import Modal from '../Modal';
import CollectionIconPicker from './CollectionIconPicker';
import ColorPickerField from './ColorPickerField';
import {
  collectionKeyLabel,
  createCollectionTitle,
  failedToCreateCollection,
} from '../../lib/collectionLabels';
import { createCollection, type CollectionMeta } from '../../lib/api';

interface CreateCollectionModalProps {
  parent?: string | null;
  onClose: () => void;
  onCreated: (collection: CollectionMeta) => void;
}

export default function CreateCollectionModal({
  parent = null,
  onClose,
  onCreated,
}: CreateCollectionModalProps) {
  const [key, setKey] = useState('');
  const [icon, setIcon] = useState('article');
  const [color, setColor] = useState('#6366f1');
  const [note, setNote] = useState('');
  const [singleton, setSingleton] = useState(false);
  const [primaryKey, setPrimaryKey] = useState<'uuid' | 'integer'>('uuid');
  const [optStatus, setOptStatus] = useState(true);
  const [optSort, setOptSort] = useState(false);
  const [optAccountability, setOptAccountability] = useState(true);
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
        is_group: false,
        icon,
        color,
        note: note.trim() || null,
        singleton,
        primary_key_type: primaryKey,
        optional_system_fields: {
          status: optStatus,
          sort: optSort,
          accountability: optAccountability,
        },
      });
      onCreated(created);
      onClose();
    } catch {
      setError(failedToCreateCollection());
      setIsSaving(false);
    }
  }

  return (
    <Modal open title={createCollectionTitle()} onClose={onClose} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="label">{collectionKeyLabel()}</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            pattern="[a-z][a-z0-9_]*"
            required
            autoFocus
            className="input w-full font-mono"
            placeholder="my_collection"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Icon</label>
            <CollectionIconPicker value={icon} onChange={setIcon} color={color} />
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
        </div>

        <div className="rounded-xl border border-surface-border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collection options</p>
          <div>
            <label className="label">Primary key</label>
            <select
              value={primaryKey}
              onChange={(e) => setPrimaryKey(e.target.value as 'uuid' | 'integer')}
              className="select w-full"
            >
              <option value="uuid">UUID</option>
              <option value="integer">Auto-increment integer</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={singleton}
              onChange={(e) => setSingleton(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Singleton (only one item allowed)
          </label>
          <div className="border-t border-surface-border pt-3 space-y-2">
            <p className="text-xs text-slate-500">Optional system fields</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={optStatus}
                onChange={(e) => setOptStatus(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Status (draft / published / archived)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={optSort}
                onChange={(e) => setOptSort(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Manual sort field
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={optAccountability}
                onChange={(e) => setOptAccountability(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Accountability (created / updated by &amp; at)
            </label>
          </div>
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
