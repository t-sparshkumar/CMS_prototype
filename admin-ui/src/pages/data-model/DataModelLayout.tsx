import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import type { BreadcrumbItem } from '../../components/Breadcrumbs';
import DataModelSubCollectionsSection from '../../components/data-model/DataModelSubCollectionsSection';
import { buildBreadcrumbs } from '../../components/ContentCollectionList';
import Icon from '../../components/Icon';
import { SubCollectionBadge, SubCollectionParentLink } from '../../components/SubCollectionHighlight';
import { fetchCollection, fetchCollections, type CollectionMeta } from '../../lib/api';

const tabs = [
  { suffix: '', label: 'Fields', icon: 'database' as const },
  { suffix: '/setup', label: 'Setup', icon: 'settings' as const },
  { suffix: '/relations', label: 'Relations', icon: 'component' as const },
];

function buildLayoutBreadcrumbs(
  trail: ReturnType<typeof buildBreadcrumbs>,
  collection: string,
  tabLabel?: string,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: 'Data Model', to: '/settings/data-model' }];
  for (const crumb of trail) {
    items.push({ label: crumb.label, to: `/settings/data-model/${crumb.collection}` });
  }
  if (collection) {
    items.push({ label: collection, to: tabLabel ? `/settings/data-model/${collection}` : undefined });
  }
  if (tabLabel) {
    items.push({ label: tabLabel });
  }
  return items;
}

export default function DataModelLayout() {
  const { collection = '' } = useParams<{ collection: string }>();
  const location = useLocation();
  const [meta, setMeta] = useState<CollectionMeta | null>(null);
  const [allCollections, setAllCollections] = useState<CollectionMeta[]>([]);
  const [subCollections, setSubCollections] = useState<CollectionMeta[]>([]);
  const [subCollectionsLoading, setSubCollectionsLoading] = useState(true);

  const loadSubCollections = useCallback(async () => {
    if (!collection) return;
    setSubCollectionsLoading(true);
    try {
      const [all, children, current] = await Promise.all([
        fetchCollections({ includeHidden: true }),
        fetchCollections({ parent: collection }),
        fetchCollection(collection),
      ]);
      setAllCollections(all);
      setSubCollections(children);
      setMeta(current);
    } catch {
      setMeta(null);
      setSubCollections([]);
    } finally {
      setSubCollectionsLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    void loadSubCollections();
  }, [loadSubCollections]);

  const isFieldEditor = location.pathname.includes('/fields/');
  const isGroup = Boolean(meta?.is_group);
  const collectionBasePath = `/settings/data-model/${collection}`;
  const isCollectionIndex = location.pathname === collectionBasePath;
  const trail = meta ? buildBreadcrumbs(allCollections, meta) : [];

  const activeTab = tabs.find((tab) => location.pathname === `${collectionBasePath}${tab.suffix}`);
  const tabLabel =
    location.pathname !== collectionBasePath && activeTab ? activeTab.label : undefined;
  const layoutBreadcrumbs = buildLayoutBreadcrumbs(trail, collection, tabLabel);

  const visibleTabs = useMemo(
    () => (isGroup ? tabs.filter((tab) => tab.suffix === '/setup') : tabs),
    [isGroup],
  );

  const pageTitle = collection || 'Data Model';
  const pageSubtitle = meta?.note ?? (isGroup ? 'Manage sub-collections in this group' : 'Manage fields, setup, and relations');

  if (isGroup && isCollectionIndex) {
    return (
      <AppLayout title={pageTitle} subtitle={pageSubtitle} breadcrumbs={layoutBreadcrumbs}>
        <DataModelSubCollectionsSection
          collections={subCollections}
          isLoading={subCollectionsLoading}
          parentCollection={meta!}
          onRefresh={() => void loadSubCollections()}
        />

        {meta && (
          <div className="flex justify-end">
            <Link to={`${collectionBasePath}/setup`} className="btn-secondary">
              <Icon name="settings" className="h-4 w-4" />
              Collection setup
            </Link>
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle} breadcrumbs={layoutBreadcrumbs}>
      <div className="max-w-5xl">
        {meta && (
          <DataModelSubCollectionsSection
            collections={subCollections}
            isLoading={subCollectionsLoading}
            parentCollection={meta}
            onRefresh={() => void loadSubCollections()}
          />
        )}

        {meta && (
          <div className={`collection-card ${meta.parent ? 'collection-card-sub' : ''}`}>
            <div
              className="collection-card-accent"
              style={{ backgroundColor: meta.parent ? '#8b5cf6' : meta.color ?? '#6366f1' }}
            />
            <div className="px-5 py-4 flex items-center gap-3.5 border-b border-slate-100">
              <span
                className="collection-card-avatar text-base"
                style={{ backgroundColor: meta.parent ? '#7c3aed' : meta.color ?? '#6366f1' }}
              >
                {meta.collection.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{meta.collection}</h1>
                {meta.parent && (
                  <SubCollectionParentLink parent={meta.parent} basePath="/settings/data-model" className="mt-0.5" />
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {meta.parent && <SubCollectionBadge />}
                  {meta.is_group && <span className="badge-tag-brand">Group</span>}
                  {meta.singleton && <span className="badge-tag-brand">Singleton</span>}
                  {meta.hidden && <span className="badge-gray">Hidden</span>}
                  {meta.activity_tracking === false && <span className="badge-amber">No activity log</span>}
                  {!meta.is_group && (
                    <span className="text-xs text-slate-400">{meta.field_count} fields</span>
                  )}
                  {meta.child_count > 0 && (
                    <span className="text-xs text-slate-400">
                      {meta.child_count} sub-collection{meta.child_count === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isFieldEditor && (
              <nav className="px-4 py-3 border-b border-surface-border bg-slate-50/40">
                <div className="tab-bar">
                  {visibleTabs.map((tab) => {
                    const path = `${collectionBasePath}${tab.suffix}`;
                    const active = location.pathname === path;
                    return (
                      <Link
                        key={tab.suffix}
                        to={path}
                        className={`inline-flex items-center gap-2 ${active ? 'tab-item-active' : 'tab-item'}`}
                      >
                        <Icon name={tab.icon} className="h-4 w-4" />
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            )}

            <div className="p-5 sm:p-6">
              <Outlet />
            </div>
          </div>
        )}

        {!meta && (
          <div className="card">
            <div className="empty-state py-12">
              <div className="loading-shimmer h-12 w-12 mb-4" />
              <p className="text-sm text-slate-400">Loading collection...</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
