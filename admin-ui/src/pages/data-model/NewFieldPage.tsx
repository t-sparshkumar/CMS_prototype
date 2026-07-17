import { Link, useNavigate, useParams } from 'react-router-dom';
import InterfacePickerGrid from '../../components/data-model/InterfacePickerGrid';
import Icon from '../../components/Icon';

export default function NewFieldPage() {
  const { collection = '' } = useParams<{ collection: string }>();
  const navigate = useNavigate();

  return (
    <div className="card p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: 'var(--app-accent-light)',
              color: 'var(--app-accent)',
            }}
          >
            <Icon name="component" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Field</h2>
            <p className="mt-0.5 text-sm font-medium text-[var(--app-accent-text)]">{collection}</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose an interface — this controls how the field appears and behaves in the content editor.
            </p>
          </div>
        </div>
        <Link
          to={`/settings/data-model/${collection}`}
          className="btn-secondary shrink-0"
        >
          Cancel
        </Link>
      </div>
      <InterfacePickerGrid
        onSelect={(interfaceId) => {
          navigate(
            `/settings/data-model/${collection}/fields/__new__?interface=${encodeURIComponent(interfaceId)}`,
          );
        }}
      />
      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
        <Icon name="component" className="h-3.5 w-3.5" />
        Interfaces are grouped by category — text, selection, relational, presentation, and layout.
      </p>
    </div>
  );
}
