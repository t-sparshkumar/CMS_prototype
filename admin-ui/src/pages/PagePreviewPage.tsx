import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import PagePreview from '../components/website/PagePreview';
import { fetchItem, type ItemRecord } from '../lib/api';

type ViewportMode = 'desktop' | 'mobile';

export default function PagePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState<ItemRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');

  useEffect(() => {
    async function load() {
      if (!id) {
        setError('Missing page id');
        setIsLoading(false);
        return;
      }
      try {
        const pageData = await fetchItem('pages', id);
        setPage(pageData);
      } catch {
        setError('Failed to load page preview.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [id]);

  const previewWidth = viewport === 'mobile' ? 'max-w-[390px]' : 'w-full';

  return (
    <div className="preview-chrome-bg min-h-screen">
      <div className="preview-chrome sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to={id ? `/pages/${id}/edit` : '/pages'}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
          >
            <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
            Back to editor
          </Link>
          <span className="text-[var(--app-border)]">|</span>
          <h1 className="text-sm font-semibold text-[var(--app-text)]">
            {page?.title ? String(page.title) : 'Page Preview'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              viewport === 'desktop' ? 'bg-[var(--app-accent-light)] text-[var(--app-accent-text)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-hover)]'
            }`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              viewport === 'mobile' ? 'bg-[var(--app-accent-light)] text-[var(--app-accent-text)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-hover)]'
            }`}
          >
            Mobile
          </button>
          {id && (
            <a
              href={`/pages/${id}/preview`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-hover)]"
            >
              <Icon name="external" className="h-3.5 w-3.5" />
              Open in new tab
            </a>
          )}
        </div>
      </div>

      <div className="flex justify-center p-4 md:p-6">
        {isLoading ? (
          <p className="text-sm text-[var(--app-text-muted)]">Loading preview...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : page ? (
          <div className={`${previewWidth} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated transition-all`}>
            <PagePreview page={page} />
          </div>
        ) : (
          <p className="text-sm text-[var(--app-text-muted)]">No preview data available.</p>
        )}
      </div>
    </div>
  );
}
