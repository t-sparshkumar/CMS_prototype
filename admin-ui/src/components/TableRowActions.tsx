import { Link } from 'react-router-dom';
import Icon from './Icon';

interface TableRowActionsProps {
  editTo?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteTitle?: string;
  itemLabel?: string;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function TableRowActions({
  editTo,
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteTitle,
  itemLabel = 'item',
  showEdit = true,
  showDelete = true,
}: TableRowActionsProps) {
  const editClassName =
    'p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors';
  const deleteClassName =
    'p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400';

  return (
    <div className="flex items-center justify-end gap-1 shrink-0">
      {showEdit && editTo ? (
        <Link
          to={editTo}
          className={editClassName}
          aria-label={`Edit ${itemLabel}`}
        >
          <Icon name="edit" className="h-4 w-4" />
        </Link>
      ) : null}
      {showEdit && !editTo && onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className={editClassName}
          aria-label={`Edit ${itemLabel}`}
        >
          <Icon name="edit" className="h-4 w-4" />
        </button>
      ) : null}
      {showDelete && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteTitle ?? `Delete ${itemLabel}`}
          className={deleteClassName}
          aria-label={`Delete ${itemLabel}`}
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
