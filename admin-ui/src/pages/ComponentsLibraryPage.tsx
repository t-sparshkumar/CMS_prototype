import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import { fetchItems, getAssetUrl, type ItemRecord } from '../lib/api';

const TYPE_STYLES: Record<string, string> = {
  hero: 'from-brand-500 to-indigo-600',
  banner: 'from-amber-500 to-orange-600',
  cards: 'from-emerald-500 to-teal-600',
  form: 'from-rose-500 to-pink-600',
  custom: 'from-slate-500 to-slate-700',
};

export default function ComponentsLibraryPage() {
  const [components, setComponents] = useState<ItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchItems('site_components', { limit: 200 });
        setComponents(result.items);
      } catch {
        setError('Failed to load components. Run database seed to set up the website module.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <AppLayout
      title="CMS Components"
      subtitle="Reusable building blocks — hero sections, banners, cards, and more"
      actions={
        <Link to="/content/site_components/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Add Component
        </Link>
      }
    >
      <div className="max-w-6xl space-y-5">
        {error && <div className="alert-info">{error}</div>}

        {!isLoading && components.length > 0 && (
          <div className="page-toolbar">
            <span className="toolbar-count">
              {components.length} component{components.length === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-0 overflow-hidden animate-pulse">
                <div className="h-36 bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 bg-slate-100 rounded" />
                  <div className="h-3 w-1/3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : components.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
                <Icon name="component" className="h-7 w-7" />
              </span>
              <h3 className="text-lg font-bold text-slate-900">No Components Yet</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Create reusable components with fields and schemas, then drop them onto pages with the
                visual builder.
              </p>
              <Link to="/content/site_components/new" className="btn-primary mt-1">
                <Icon name="plus" className="h-4 w-4" />
                Create Component
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {components.map((component) => {
              const previewId =
                typeof component.preview_image === 'string' ? component.preview_image : null;
              const type = String(component.component_type ?? 'custom');
              const gradient = TYPE_STYLES[type] ?? TYPE_STYLES.custom;

              return (
                <Link
                  key={String(component.id)}
                  to={`/content/site_components/${String(component.id)}`}
                  className="card p-0 overflow-hidden group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="h-36 bg-slate-100 relative overflow-hidden">
                    {previewId ? (
                      <img
                        src={getAssetUrl(previewId, { width: 480, height: 240, fit: 'cover', format: 'webp' })}
                        alt=""
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <Icon name="component" className="h-10 w-10 text-white/80" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 badge bg-white/90 text-slate-700 backdrop-blur capitalize">
                      {type}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                      {String(component.name)}
                    </p>
                    <code className="text-xs text-slate-400">{String(component.slug)}</code>
                    {component.category ? (
                      <p className="text-xs text-slate-500 mt-2">{String(component.category)}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
