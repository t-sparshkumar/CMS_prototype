import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import { fetchItems, type ItemRecord } from '../lib/api';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  page_group_title: string;
  component_count: number;
  active: boolean;
  status: string;
}

function parseComponents(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

function statusBadge(status: string): string {
  if (status === 'published') return 'badge-green';
  if (status === 'archived') return 'badge-gray';
  return 'badge-amber';
}

export default function PagesDashboardPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchItems('pages', { limit: 200, offset: 0 });
        const rows: PageRow[] = result.items.map((item: ItemRecord) => {
          const pageGroup = item.page_group as { title?: string } | string | null;
          const groupTitle =
            pageGroup && typeof pageGroup === 'object' && 'title' in pageGroup
              ? String(pageGroup.title ?? '—')
              : '—';

          return {
            id: String(item.id),
            title: String(item.title ?? 'Untitled'),
            slug: String(item.slug ?? ''),
            page_group_title: groupTitle,
            component_count: parseComponents(item.components),
            active: Boolean(item.active),
            status: String(item.status ?? 'draft'),
          };
        });
        setPages(rows);
      } catch {
        setError('Failed to load pages. Run database seed to set up website collections.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <AppLayout
      title="Website Pages"
      subtitle="Manage website pages, slugs, and component layouts"
      actions={
        <Link to="/pages/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Create Page
        </Link>
      }
    >
      <div className="max-w-6xl space-y-5">
        {error && <div className="alert-info">{error}</div>}

        <div className="page-toolbar">
          <span className="toolbar-count">
            {pages.length} page{pages.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="table-shell">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="table-th">Page</th>
                <th className="table-th">Page Group</th>
                <th className="table-th">Slug</th>
                <th className="table-th">Components</th>
                <th className="table-th">Active</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading pages...
                  </td>
                </tr>
              ) : pages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Icon name="pages" className="h-6 w-6" />
                      </span>
                      <p className="text-slate-500">No pages yet.</p>
                      <Link to="/pages/new" className="btn-primary">
                        <Icon name="plus" className="h-4 w-4" />
                        Create your first page
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                pages.map((page) => (
                  <tr key={page.id} className="table-row-hover">
                    <td className="table-td font-semibold text-slate-900">{page.title}</td>
                    <td className="table-td">{page.page_group_title}</td>
                    <td className="table-td">
                      <code className="text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                        /{page.slug}
                      </code>
                    </td>
                    <td className="table-td">
                      <span className="badge-blue">{page.component_count}</span>
                    </td>
                    <td className="table-td">
                      <span className={page.active ? 'badge-green' : 'badge-gray'}>
                        {page.active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={statusBadge(page.status)}>{page.status}</span>
                    </td>
                    <td className="table-td text-right">
                      <Link
                        to={`/pages/${page.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <Link
            to="/content/page_groups"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
          >
            <Icon name="group" className="h-4 w-4" />
            Manage Page Groups
          </Link>
          <Link
            to="/components"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
          >
            <Icon name="component" className="h-4 w-4" />
            Manage Components
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
