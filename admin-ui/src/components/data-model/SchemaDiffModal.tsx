import type { SchemaDiff } from '../../lib/api';

interface SchemaDiffModalProps {
  open: boolean;
  diff: SchemaDiff | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SchemaDiffModal({ open, diff, onConfirm, onCancel }: SchemaDiffModalProps) {
  if (!open || !diff) return null;

  const hasChanges =
    diff.collections_to_create.length > 0 ||
    diff.collections_to_delete.length > 0 ||
    diff.fields_to_create.length > 0 ||
    diff.fields_to_delete.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[80vh] overflow-auto rounded-2xl border border-surface-border bg-surface p-6 shadow-elevated animate-scale-in">
        <h3 className="text-base font-bold text-slate-900">Schema changes</h3>
        {!hasChanges ? (
          <p className="mt-2 text-sm text-slate-600">No differences detected.</p>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            {diff.collections_to_create.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="font-semibold text-emerald-800">Collections to create</p>
                <ul className="mt-1 list-disc ml-5 text-emerald-900/80">{diff.collections_to_create.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
            {diff.collections_to_delete.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                <p className="font-semibold text-red-800">Collections to delete</p>
                <ul className="mt-1 list-disc ml-5 text-red-900/80">{diff.collections_to_delete.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
            {diff.fields_to_create.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="font-semibold text-emerald-800">Fields to create</p>
                <ul className="mt-1 list-disc ml-5 text-emerald-900/80">
                  {diff.fields_to_create.map((f) => <li key={`${f.collection}.${f.field}`}>{f.collection}.{f.field}</li>)}
                </ul>
              </div>
            )}
            {diff.fields_to_delete.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                <p className="font-semibold text-red-800">Fields to delete</p>
                <ul className="mt-1 list-disc ml-5 text-red-900/80">
                  {diff.fields_to_delete.map((f) => <li key={`${f.collection}.${f.field}`}>{f.collection}.{f.field}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          {hasChanges && (
            <button type="button" onClick={onConfirm} className="btn-primary">Apply changes</button>
          )}
        </div>
      </div>
    </div>
  );
}
