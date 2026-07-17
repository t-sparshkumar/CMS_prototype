import { useEffect, useState } from 'react';
import ConfirmDialog from './data-model/ConfirmDialog';
import TableRowActions from './TableRowActions';
import { deleteRelation, fetchRelations, type RelationMeta } from '../lib/api';

interface RelationsPanelProps {
  collection: string;
}

export default function RelationsPanel({ collection }: RelationsPanelProps) {
  const [relations, setRelations] = useState<RelationMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  async function load() {
    try {
      setRelations(await fetchRelations(collection));
    } catch {
      setError('Failed to load relations');
    }
  }

  useEffect(() => {
    void load();
  }, [collection]);

  async function handleDelete(id: number) {
    try {
      await deleteRelation(id);
      await load();
    } catch {
      setError('Failed to delete relation');
    }
  }

  return (
    <section className="table-shell">
      <div className="px-5 py-4 border-b border-surface-border">
        <h2 className="section-title">Relations</h2>
      </div>
      {error && <p className="px-5 py-2 text-sm text-red-600">{error}</p>}
      {relations.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 text-center">No relations for this collection.</p>
      ) : (
        <div className="table-scroll">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="table-th">Field</th>
              <th className="table-th">Type</th>
              <th className="table-th">Related</th>
              <th className="table-th">Junction</th>
              <th className="table-th">On delete</th>
              <th className="table-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60">
            {relations.map((rel) => {
              const isManySide = rel.many_collection === collection;
              const kind = rel.junction_collection ? 'M2M' : isManySide ? 'M2O' : 'O2M';
              return (
                <tr key={rel.id} className="table-row-hover">
                  <td className="table-td font-semibold text-slate-900">
                    {isManySide ? rel.many_field : rel.sort_field ?? rel.one_field}
                  </td>
                  <td className="table-td">
                    <span className="badge-blue text-[10px]">{kind}</span>
                  </td>
                  <td className="table-td">{isManySide ? rel.one_collection : rel.many_collection}</td>
                  <td className="table-td font-mono text-xs text-slate-400">{rel.junction_collection ?? '—'}</td>
                  <td className="table-td">{rel.schema_on_delete ?? 'SET NULL'}</td>
                  <td className="table-td-actions">
                    <TableRowActions
                      showEdit={false}
                      onDelete={() => setDeleteTargetId(rel.id)}
                      itemLabel={isManySide ? rel.many_field : rel.sort_field ?? rel.one_field}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete relation"
        message="Delete this relation? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTargetId === null) return;
          void handleDelete(deleteTargetId).finally(() => setDeleteTargetId(null));
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </section>
  );
}
