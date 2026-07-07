import { useCallback, useEffect, useState } from 'react';
import { createItem, deleteItem, fetchFields, fetchItems, type FieldMeta, type ItemRecord } from '../lib/api';

interface OneToManyInlineEditorProps {
  field: FieldMeta;
  parentId: string | undefined;
  disabled?: boolean;
}

export default function OneToManyInlineEditor({ field, parentId, disabled }: OneToManyInlineEditorProps) {
  const relatedCollection = field.options?.related_collection as string | undefined;
  const relatedField = field.options?.related_field as string | undefined;
  const [relatedFields, setRelatedFields] = useState<FieldMeta[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadItems = useCallback(async () => {
    if (!relatedCollection || !relatedField || !parentId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchItems(relatedCollection, {
        limit: 50,
        filter: { [relatedField]: { _eq: parentId } },
      });
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [relatedCollection, relatedField, parentId]);

  useEffect(() => {
    if (!relatedCollection) return;
    void fetchFields(relatedCollection).then(setRelatedFields).catch(() => setRelatedFields([]));
  }, [relatedCollection]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const displayField =
    relatedFields.find((f) => f.field === 'title')?.field ??
    relatedFields.find((f) => f.field === 'name')?.field ??
    relatedFields.find((f) => !f.is_system && !f.hidden)?.field;

  async function handleAdd() {
    if (!relatedCollection || !relatedField || !parentId || !newTitle.trim()) return;

    await createItem(relatedCollection, {
      [relatedField]: parentId,
      ...(displayField ? { [displayField]: newTitle.trim() } : {}),
    });
    setNewTitle('');
    await loadItems();
  }

  async function handleDelete(id: string) {
    if (!relatedCollection) return;
    if (!window.confirm('Delete this related item?')) return;
    await deleteItem(relatedCollection, id);
    await loadItems();
  }

  if (!relatedCollection || !relatedField) {
    return <p className="text-xs text-red-500">Missing one-to-many configuration</p>;
  }

  if (!parentId) {
    return (
      <p className="text-xs text-slate-500 italic rounded-xl border border-dashed border-surface-border bg-surface-muted/30 px-3 py-2.5">
        Save the parent item first to manage related {relatedCollection} records.
      </p>
    );
  }

  return (
    <div>
      <label className="label">{field.field}</label>
      {isLoading ? (
        <p className="text-xs text-slate-500">Loading...</p>
      ) : (
        <div className="table-shell">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                {displayField && <th className="table-th">{displayField}</th>}
                <th className="table-th">ID</th>
                <th className="table-th w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={displayField ? 3 : 2} className="table-td text-center text-slate-400 text-xs py-6">
                    No related items
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={String(item.id)} className="table-row-hover">
                    {displayField && (
                      <td className="table-td text-slate-700">{String(item[displayField] ?? '—')}</td>
                    )}
                    <td className="table-td text-xs font-mono text-slate-400">{String(item.id)}</td>
                    <td className="table-td text-right">
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(String(item.id))}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {!disabled && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`New ${relatedCollection}...`}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!newTitle.trim()}
            className="btn-primary"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
