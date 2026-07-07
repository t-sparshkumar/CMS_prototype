import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon, { type IconName } from '../components/Icon';
import { fetchDashboardStats, type DashboardStats } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface StatCard {
  label: string;
  value?: number;
  to: string;
  icon: IconName;
  gradient: string;
  ring: string;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
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
      value: stats?.page_groups,
      to: '/content/page_groups',
      icon: 'group',
      gradient: 'from-brand-500 to-indigo-600',
      ring: 'ring-brand-500/20',
    },
    {
      label: 'CMS Components',
      value: stats?.components,
      to: '/components',
      icon: 'component',
      gradient: 'from-violet-500 to-purple-600',
      ring: 'ring-violet-500/20',
    },
    {
      label: 'CMS Users',
      value: stats?.users,
      to: '/settings/users',
      icon: 'users',
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-500/20',
    },
    {
      label: 'Drafts Pending',
      value: stats?.drafts_pending,
      to: '/pages',
      icon: 'pages',
      gradient: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-500/20',
    },
  ];

  const quickActions = [
    { label: 'Create a new page', to: '/pages/new', icon: 'pages' as IconName, desc: 'Launch the page builder' },
    { label: 'Build a component', to: '/content/site_components/new', icon: 'component' as IconName, desc: 'Add a reusable block' },
    { label: 'Upload assets', to: '/assets', icon: 'upload' as IconName, desc: 'Manage media files' },
    { label: 'Create a collection', to: '/settings/data-model/new', icon: 'database' as IconName, desc: 'Extend the data model' },
  ];

  const firstName = user?.first_name ?? 'there';

  return (
    <AppLayout title="Dashboard" subtitle={`Welcome back, ${firstName}`}>
      <div className="page-hero">
        <div className="page-hero-content flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">
              Your workspace
            </p>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Good to see you, {firstName}
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-lg">
              Manage pages, components, content collections, and access — all from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/pages/new" className="btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              New page
            </Link>
            <Link to="/content" className="btn-secondary">
              Browse content
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.label} to={card.to} className={`stat-card group ring-1 ${card.ring}`}>
            <div className="relative flex items-start justify-between">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-md`}
              >
                <Icon name={card.icon} className="h-5 w-5" />
              </span>
              <Icon
                name="chevron-right"
                className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
              />
            </div>
            <p className="relative mt-5 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {card.value ?? '—'}
            </p>
            <p className="relative mt-1 text-sm font-medium text-slate-500">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="content-section-header mb-5">
            <div>
              <h2 className="section-title">Quick Actions</h2>
              <p className="section-subtitle">Common tasks and shortcuts</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-3 rounded-xl border border-surface-border bg-surface-muted/50 p-4 transition-all hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-surface-border transition-colors group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-500">
                  <Icon name={action.icon} className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                    {action.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="content-section-header mb-5">
            <div>
              <h2 className="section-title">Overview</h2>
              <p className="section-subtitle">At a glance</p>
            </div>
          </div>
          <dl className="space-y-4">
            {[
              { label: 'Total Pages', value: stats?.pages ?? '—' },
              { label: 'Assets in Gallery', value: stats?.assets ?? '—' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0"
              >
                <dt className="text-sm text-slate-500">{row.label}</dt>
                <dd className="text-sm font-bold tabular-nums text-slate-900">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <dt className="text-sm text-slate-500">Your Role</dt>
              <dd>
                <span className={user?.admin_access ? 'badge-blue' : 'badge-gray'}>
                  {user?.admin_access ? 'Administrator' : 'User'}
                </span>
              </dd>
            </div>
          </dl>
          <Link
            to="/history"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <Icon name="history" className="h-4 w-4" />
            View audit trail
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
