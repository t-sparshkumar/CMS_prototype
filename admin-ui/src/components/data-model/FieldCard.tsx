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
      className={`dm-field-row group ${
        field.hidden ? 'is-hidden' : ''
      } ${isGroup ? 'is-group' : ''}`}
    >
      {!field.is_system && (
        <span className="dm-field-grip" title="Drag to reorder">
          ⋮⋮
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/settings/data-model/${collection}/fields/${field.field}`}
            className="dm-field-name"
          >
            {field.field}
          </Link>
          <span className="dm-field-badge">{field.type}</span>
          <span className="dm-field-badge dm-field-badge-accent">{field.interface}</span>
          {field.is_system && <span className="dm-field-badge">System</span>}
          {field.hidden && <span className="dm-field-badge">Hidden</span>}
          {field.width <= 6 && (
            <span className="collection-list-count">Half width</span>
          )}
        </div>
        {field.note && (
          <p className="collection-list-note mt-0.5">{field.note}</p>
        )}
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
