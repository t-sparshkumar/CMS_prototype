import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import BrandLogo from './BrandLogo';
import Icon, { type IconName } from './Icon';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  fullWidth?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'System',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard' },
      { to: '/content', label: 'Content', icon: 'content' },
      { to: '/settings/data-model', label: 'Data Model', icon: 'database' },
      { to: '/settings/users', label: 'Users', icon: 'users' },
      { to: '/settings/access-control', label: 'Roles & Policies', icon: 'shield' },
    ],
  },
  {
    title: 'General',
    items: [
      { to: '/settings/project', label: 'Project Settings', icon: 'settings' },
      { to: '/assets', label: 'Asset Gallery', icon: 'image' },
      { to: '/history', label: 'History', icon: 'history' },
    ],
  },
];

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'U';
}

export default function AppLayout({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  fullWidth = false,
}: AppLayoutProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="page-shell flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[272px] shrink-0 flex-col bg-sidebar-gradient border-r border-sidebar-border">
        <div className="px-5 pt-6 pb-5">
          <BrandLogo size="lg" className="mb-2" />
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Content Studio
          </p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(location.pathname, item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`nav-item group ${active ? 'nav-item-active' : 'nav-item-idle'}`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          active
                            ? 'bg-brand-500/20 text-brand-300'
                            : 'bg-white/[0.04] text-slate-400 group-hover:text-slate-300'
                        }`}
                      >
                        <Icon name={item.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3 ring-1 ring-white/[0.06]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-600 text-xs font-bold text-white shadow-glow">
              {initials(user?.first_name, user?.last_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              title="Sign out"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Icon name="logout" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      <div className="ml-[272px] flex min-w-0 flex-1 flex-col">
        <header className="glass-header relative overflow-hidden px-8 py-6">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-500/[0.03] via-transparent to-violet-500/[0.03]"
            aria-hidden="true"
          />
          <div className="relative space-y-3">
            {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex items-start gap-4">
                <span className="hidden sm:flex h-12 w-1 shrink-0 rounded-full bg-gradient-to-b from-brand-400 to-violet-500 shadow-glow" />
                <div className="min-w-0">
                  <h1 className="truncate text-[1.65rem] font-bold leading-tight tracking-tight text-slate-900">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1.5 truncate text-sm leading-relaxed text-slate-500">{subtitle}</p>
                  )}
                </div>
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>}
            </div>
          </div>
        </header>
        <main className="flex-1 animate-fade-in overflow-auto px-8 pb-12 pt-6">
          <div className={fullWidth ? 'w-full page-stack' : 'page-inner page-stack'}>{children}</div>
        </main>
      </div>
    </div>
  );
}
