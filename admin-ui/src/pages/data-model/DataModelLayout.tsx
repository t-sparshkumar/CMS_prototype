import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import type { BreadcrumbItem } from '../../components/Breadcrumbs';
import DataModelSubCollectionsSection from '../../components/data-model/DataModelSubCollectionsSection';
import { buildBreadcrumbs } from '../../components/ContentCollectionList';
import Icon from '../../components/Icon';
import CollectionMaterialIcon from '../../components/CollectionMaterialIcon';
import {
  childCollectionsLabel,
  folderBadgeLabel,
  manageFolderSubtitle,
} from '../../lib/collectionLabels';
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
  const pageSubtitle = meta?.note ?? (isGroup ? manageFolderSubtitle() : 'Manage fields, setup, and relations');

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
          <div className="flex justify-end mt-4">
            <Link to={`${collectionBasePath}/setup`} className="btn-secondary text-sm">
              <Icon name="settings" className="h-4 w-4" />
              Collection setup
            </Link>
          </div>
        )}
      </AppLayout>
    );
  }

  const iconColor = meta?.color ?? 'var(--app-accent)';

  return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle} breadcrumbs={layoutBreadcrumbs}>
      <div className="max-w-5xl space-y-4">
        {meta && (
          <DataModelSubCollectionsSection
            collections={subCollections}
            isLoading={subCollectionsLoading}
            parentCollection={meta}
            onRefresh={() => void loadSubCollections()}
          />
        )}

        {meta && (
          <div className="dm-panel">
            <div className="dm-panel-header">
              <span
                className="dm-row-icon"
                style={{
                  backgroundColor: `color-mix(in srgb, ${iconColor} 14%, var(--app-surface))`,
                  color: iconColor,
                }}
              >
                <CollectionMaterialIcon
                  icon={meta.icon}
                  isGroup={meta.is_group}
                  size={18}
                />
              </span>
              <div>
                <h1 className="dm-panel-title">{meta.collection}</h1>
                <div className="dm-panel-meta">
                  {meta.is_group && <span className="dm-badge">{folderBadgeLabel()}</span>}
                  {meta.singleton && <span className="dm-badge">Singleton</span>}
                  {meta.hidden && <span className="dm-badge-neutral dm-badge">Hidden</span>}
                  {meta.activity_tracking === false && (
                    <span className="dm-badge-neutral dm-badge">No activity log</span>
                  )}
                  {!meta.is_group && <span>{meta.field_count} fields</span>}
                  {meta.child_count > 0 && <span>{childCollectionsLabel(meta.child_count)}</span>}
                </div>
              </div>
            </div>

            {!isFieldEditor && (
              <nav className="dm-tab-nav">
                <div className="dm-tab-bar">
                  {visibleTabs.map((tab) => {
                    const path = `${collectionBasePath}${tab.suffix}`;
                    const active = location.pathname === path;
                    return (
                      <Link
                        key={tab.suffix}
                        to={path}
                        className={active ? 'dm-tab-item-active dm-tab-item' : 'dm-tab-item'}
                      >
                        <Icon name={tab.icon} className="h-4 w-4" />
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            )}

            <div className="dm-panel-content">
              <Outlet />
            </div>
          </div>
        )}

        {!meta && (
          <div className="dm-shell">
            <div className="dm-empty">
              <div className="loading-shimmer h-10 w-10 mb-3 rounded-lg" />
              <p className="text-sm">Loading collection...</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
