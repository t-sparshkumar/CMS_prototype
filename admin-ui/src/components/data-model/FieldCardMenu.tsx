import { useState } from 'react';

interface FieldCardMenuProps {
  onSetWidth: (width: number) => void;
  onToggleHidden: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function FieldCardMenu({
  onSetWidth,
  onToggleHidden,
  onDuplicate,
  onDelete,
}: FieldCardMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-surface-muted hover:text-slate-700"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-surface-border bg-surface py-1 text-sm shadow-lg">
            <button type="button" onClick={() => { onSetWidth(6); setOpen(false); }} className="w-full px-3 py-2 text-left text-slate-700 hover:bg-surface-muted">Set half width</button>
            <button type="button" onClick={() => { onSetWidth(12); setOpen(false); }} className="w-full px-3 py-2 text-left text-slate-700 hover:bg-surface-muted">Set full width</button>
            <button type="button" onClick={() => { onToggleHidden(); setOpen(false); }} className="w-full px-3 py-2 text-left text-slate-700 hover:bg-surface-muted">Toggle hidden</button>
            <button type="button" onClick={() => { onDuplicate(); setOpen(false); }} className="w-full px-3 py-2 text-left text-slate-700 hover:bg-surface-muted">Duplicate</button>
            <div className="my-1 border-t border-surface-border" />
            <button type="button" onClick={() => { onDelete(); setOpen(false); }} className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
