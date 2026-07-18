import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import ConfirmDialog from '../components/data-model/ConfirmDialog';
import Icon, { type IconName } from '../components/Icon';
import { clearActivity, fetchActivity, type ActivityEntry } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const ACTION_FILTERS = [
  { value: '', label: 'All' },
  { value: 'create', label: 'Creates' },
  { value: 'update', label: 'Edits' },
  { value: 'delete', label: 'Deletes' },
  { value: 'upload', label: 'Uploads' },
];

const ACTION_STYLE: Record<string, { badge: string; icon: IconName; iconBg: string }> = {
  create: { badge: 'badge-green', icon: 'plus', iconBg: 'bg-emerald-100 text-emerald-600' },
  update: { badge: 'badge-blue', icon: 'edit', iconBg: 'bg-brand-100 text-brand-600' },
  delete: { badge: 'badge-gray', icon: 'trash', iconBg: 'bg-red-100 text-red-600' },
  upload: { badge: 'badge-amber', icon: 'upload', iconBg: 'bg-amber-100 text-amber-600' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function initials(name: string | null): string {
  if (!name) return 'S';
  const parts = name.split(' ');
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || 'S';
}

export default function HistoryPage() {
  const isAdmin = useAuthStore((s) => s.user?.admin_access);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchActivity({
        action: actionFilter || undefined,
        search: search || undefined,
        limit: 100,
      });
      setEntries(result.data);
      setTotal(result.total);
    } catch {
      setError('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleClear() {
    try {
      await clearActivity();
      void loadData();
    } catch {
      setError('Failed to clear history');
    }
  }

  return (
    <AppLayout
      title="History and Audit Trail"
      subtitle="Track all changes, deletions, and uploads across the CMS"
      actions={
        isAdmin ? (
          <button type="button" onClick={() => setClearConfirmOpen(true)} className="btn-danger">
            <Icon name="trash" className="h-4 w-4" />
            Clear History
          </button>
        ) : undefined
      }
    >
      <div className="max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {ACTION_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActionFilter(f.value)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  actionFilter === f.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Icon
              name="search"
              className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              placeholder="Search history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Description</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Collection</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Date/Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading history...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Icon name="history" className="h-6 w-6" />
                      </span>
                      <p className="text-slate-500">No history records yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const style = ACTION_STYLE[entry.action] ?? ACTION_STYLE.update;
                  return (
                    <tr key={entry.id} className="table-row-hover">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials(entry.user_name ?? entry.user_email)}
                          </span>
                          <span className="font-medium text-slate-700">
                            {entry.user_name ?? entry.user_email ?? 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`${style?.badge} capitalize`}>
                          <span className={`h-4 w-4 rounded-full ${style?.iconBg} flex items-center justify-center`}>
                            <Icon name={style?.icon ?? 'edit'} className="h-2.5 w-2.5" />
                          </span>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{entry.comment ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        {entry.collection ? (
                          <code className="text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                            {entry.collection}
                          </code>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {formatDate(entry.timestamp)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && total > entries.length && (
          <p className="text-xs text-slate-400">
            Showing {entries.length} of {total} records
          </p>
        )}
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear history"
        message="Clear all history records? This cannot be undone."
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          void handleClear().finally(() => setClearConfirmOpen(false));
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </AppLayout>
  );
}
