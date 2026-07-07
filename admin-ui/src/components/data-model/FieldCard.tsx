import { Link } from 'react-router-dom';
import type { FieldMeta } from '../../lib/api';
import FieldCardMenu from './FieldCardMenu';

interface FieldCardProps {
  collection: string;
  field: FieldMeta;
  onToggleHidden: () => void;
  onSetWidth: (width: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

export default function FieldCard({
  collection,
  field,
  onToggleHidden,
  onSetWidth,
  onDuplicate,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: FieldCardProps) {
  const isGroup = field.interface === 'divider' || field.interface === 'notice';

  return (
    <div
      draggable={draggable && !field.is_system}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        field.hidden
          ? 'border-dashed border-surface-border-strong opacity-60 bg-surface-muted/30'
          : 'border-surface-border bg-surface hover:border-brand-200/60 hover:shadow-sm'
      } ${isGroup ? 'bg-surface-muted/50' : ''}`}
    >
      {!field.is_system && (
        <span className="cursor-grab text-slate-300 select-none text-sm" title="Drag to reorder">
          ⋮⋮
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/settings/data-model/${collection}/fields/${field.field}`}
            className="font-semibold text-slate-900 hover:text-brand-600"
          >
            {field.field}
          </Link>
          <span className="badge-gray text-[10px]">{field.type}</span>
          <span className="badge-blue text-[10px]">{field.interface}</span>
          {field.is_system && <span className="badge-amber text-[10px]">System</span>}
          {field.hidden && <span className="badge-gray text-[10px]">Hidden</span>}
          {field.width <= 6 && <span className="text-[10px] text-slate-400">Half width</span>}
        </div>
        {field.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{field.note}</p>}
      </div>
      {!field.is_system && (
        <FieldCardMenu
          onSetWidth={onSetWidth}
          onToggleHidden={onToggleHidden}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
