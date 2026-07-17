import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Breadcrumbs from '../components/Breadcrumbs';
import Icon, { type IconName } from '../components/Icon';
import { fetchDashboardStats, type DashboardStats } from '../lib/api';

interface StatCard {
  label: string;
  value: string;
  subtext: string;
  to: string;
  icon: IconName;
}

interface ServiceRow {
  name: string;
  detail: string;
  status: 'operational' | 'degraded' | 'down';
  to?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setStats(await fetchDashboardStats());
      } catch {
        setStats(null);
      }
    }
    void loadStats();
  }, []);

  const statCards: StatCard[] = [
    {
      label: 'Page Groups',
      value: stats?.page_groups != null ? String(stats.page_groups) : '—',
      subtext: 'Active content groups',
      to: '/content/page_groups',
      icon: 'group',
    },
    {
      label: 'CMS Components',
      value: stats?.components != null ? String(stats.components) : '—',
      subtext: 'Reusable blocks in library',
      to: '/content',
      icon: 'component',
    },
    {
      label: 'CMS Users',
      value: stats?.users != null ? String(stats.users) : '—',
      subtext: 'Registered workspace members',
      to: '/settings/users',
      icon: 'users',
    },
    {
      label: 'Drafts Pending',
      value: stats?.drafts_pending != null ? String(stats.drafts_pending) : '—',
      subtext: `${stats?.pages ?? '—'} total pages · review queue`,
      to: '/pages',
      icon: 'pages',
    },
  ];

  const services: ServiceRow[] = [
    {
      name: 'Content API',
      detail: `Collections synced · ${stats?.page_groups ?? '—'} groups active`,
      status: 'operational',
      to: '/content',
    },
    {
      name: 'Asset storage',
      detail: `${stats?.assets ?? '—'} files in gallery · CDN ready`,
      status: 'operational',
      to: '/assets',
    },
    {
      name: 'Schema registry',
      detail: 'Data model definitions · field validation',
      status: stats ? 'operational' : 'degraded',
      to: '/settings/data-model',
    },
    {
      name: 'Access control',
      detail: 'Roles, policies, and permissions',
      status: 'operational',
      to: '/settings/access-control',
    },
  ];

  const quickActions = [
    { label: 'Create a new page', to: '/pages/new', icon: 'pages' as IconName },
    { label: 'Build a component', to: '/content/hero_banners', icon: 'component' as IconName },
    { label: 'Upload assets', to: '/assets', icon: 'upload' as IconName },
    { label: 'Create a collection', to: '/settings/data-model/new?type=collection', icon: 'database' as IconName },
  ];

  const statusClass = {
    operational: 'status-pill-operational',
    degraded: 'status-pill-degraded',
    down: 'status-pill-down',
  } as const;

  const statusLabel = {
    operational: 'Operational',
    degraded: 'Degraded',
    down: 'Down',
  } as const;

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Platform health at a glance. Open any tile or service for structured metrics and recent activity."
    >
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">Control center</h2>
        <Breadcrumbs items={[{ label: 'Admin', to: '/' }, { label: 'Dashboard' }]} />
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
          Workspace health at a glance. Open any tile or service for content metrics, schema status,
          dependencies, and recent signals.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.label} to={card.to} className="stat-card group">
            <div className="flex items-start justify-between">
              <span className="stat-card-icon">
                <Icon name={card.icon} className="h-5 w-5" />
              </span>
              <Icon
                name="chevron-right"
                className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
              />
            </div>
            <p className="stat-card-label mt-4">{card.label}</p>
            <p className="stat-card-value">{card.value}</p>
            <p className="stat-card-sub">{card.subtext}</p>
          </Link>
        ))}
      </div>

      <div className="card p-5 sm:p-6">
        <div className="content-section-header mb-4">
          <div>
            <h2 className="section-title text-base">Quick actions</h2>
            <p className="section-subtitle">Common tasks and shortcuts</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center gap-3 rounded-xl border border-surface-border bg-surface-muted/60 px-4 py-3 transition-all hover:border-brand-200 hover:bg-brand-50/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white">
                <Icon name={action.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="section-title text-base">Platform services</h2>
          <p className="section-subtitle">Core CMS infrastructure and integrations</p>
        </div>
        <div>
          {services.map((service) => {
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{service.detail}</p>
                </div>
                <span className={statusClass[service.status]}>{statusLabel[service.status]}</span>
                <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-slate-300" />
              </>
            );

            return service.to ? (
              <Link key={service.name} to={service.to} className="service-row group">
                {inner}
              </Link>
            ) : (
              <div key={service.name} className="service-row">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
