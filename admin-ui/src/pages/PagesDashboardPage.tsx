import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import { parsePageSections } from '../components/PageSectionsBuilder';
import { fetchItems, type ItemRecord } from '../lib/api';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  page_group_title: string;
  section_count: number;
  active: boolean;
  status: string;
}

const PAGE_ICON_GRADIENTS = [
  'from-brand-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
];

function statusBadge(status: string): string {
  if (status === 'published') return 'badge-green';
  if (status === 'archived') return 'badge-gray';
  return 'badge-amber';
}

function pageInitial(title: string): string {
  const trimmed = title.trim();
  return trimmed.charAt(0).toUpperCase() || 'P';
}

export default function PagesDashboardPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [search, setSearch] = useState('');
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
            section_count: parsePageSections(item.sections).length,
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((page) => {
      const title = page.title.toLowerCase();
      const slug = page.slug.toLowerCase();
      const group = page.page_group_title.toLowerCase();
      return title.includes(query) || slug.includes(query) || group.includes(query);
    });
  }, [pages, search]);

  const hasSearchQuery = search.trim().length > 0;

  return (
    <AppLayout
      title="Website Pages"
      subtitle="Manage website pages, slugs, and component layouts"
      breadcrumbs={[
        { label: 'Content', to: '/content' },
        { label: 'Pages' },
      ]}
      actions={
        <Link to="/pages/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Create Page
        </Link>
      }
    >
      <div className="max-w-5xl space-y-5">
        <div className="page-toolbar">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, slug, or page group..."
              className="input pl-9"
            />
          </div>
          <span className="toolbar-divider" />
          <span className="toolbar-count">
            {filtered.length} page{filtered.length === 1 ? '' : 's'}
            {hasSearchQuery && pages.length !== filtered.length ? (
              <span className="text-slate-400"> of {pages.length}</span>
            ) : null}
          </span>
        </div>

        {error && <div className="alert-info">{error}</div>}

        <div className="table-shell">
          <div className="table-scroll">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="table-head">
              <tr>
                <th className="table-th">Page</th>
                <th className="table-th hidden md:table-cell">Page Group</th>
                <th className="table-th">Slug</th>
                <th className="table-th hidden sm:table-cell">Sections</th>
                <th className="table-th hidden lg:table-cell">Active</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading pages...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state py-12">
                      <span className="empty-state-icon">
                        <Icon name="pages" className="h-7 w-7" />
                      </span>
                      {hasSearchQuery ? (
                        <>
                          <p className="font-medium text-slate-700">No matching pages</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Try a different search term or clear the filter.
                          </p>
                          <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="btn-secondary mt-4"
                          >
                            Clear search
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-slate-700">No pages yet</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Create your first page to start building your website.
                          </p>
                          <Link to="/pages/new" className="btn-primary mt-4">
                            <Icon name="plus" className="h-4 w-4" />
                            Create your first page
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((page, index) => (
                  <tr key={page.id} className="table-row-hover">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                            PAGE_ICON_GRADIENTS[index % PAGE_ICON_GRADIENTS.length]
                          } text-white text-xs font-bold shadow-sm`}
                        >
                          {pageInitial(page.title)}
                        </span>
                        <span className="font-semibold text-slate-900">{page.title}</span>
                      </div>
                    </td>
                    <td className="table-td hidden md:table-cell">
                      {page.page_group_title === '—' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-slate-600">{page.page_group_title}</span>
                      )}
                    </td>
                    <td className="table-td">
                      {page.slug ? (
                        <code className="rounded-md bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-600 ring-1 ring-inset ring-slate-200">
                          /{page.slug}
                        </code>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-td hidden sm:table-cell">
                      <span className="badge-blue">{page.section_count}</span>
                    </td>
                    <td className="table-td hidden lg:table-cell">
                      <span className={page.active ? 'badge-green' : 'badge-gray'}>
                        {page.active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={statusBadge(page.status)}>{page.status}</span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/pages/${page.id}/preview`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          aria-label={`Preview ${page.title}`}
                        >
                          <Icon name="external" className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/pages/${page.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          aria-label={`Edit ${page.title}`}
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/content/page_groups"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
          >
            <Icon name="group" className="h-4 w-4" />
            Manage Page Groups
          </Link>
          <Link
            to="/content"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
          >
            <Icon name="component" className="h-4 w-4" />
            Browse Block Collections
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
