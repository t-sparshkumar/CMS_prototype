import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { resolveAdminLogoSrc } from '../lib/adminLogo';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
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
  icon: IconName;
  items: NavItem[];
}

const dashboardNav: NavItem = { to: '/', label: 'Dashboard', icon: 'dashboard' };

const navSections: NavSection[] = [
  {
    title: 'Content & schema',
    icon: 'content',
    items: [
      { to: '/content', label: 'Content', icon: 'content' },
      { to: '/pages', label: 'Pages', icon: 'pages' },
      { to: '/settings/data-model', label: 'Data Model', icon: 'database' },
      { to: '/settings/triggers', label: 'Triggers', icon: 'bolt' },
      { to: '/settings/translations', label: 'Translations', icon: 'translate' },
    ],
  },
  {
    title: 'People & access',
    icon: 'users',
    items: [
      { to: '/settings/users', label: 'Users', icon: 'users' },
      { to: '/settings/access-control', label: 'Roles & Policies', icon: 'shield' },
    ],
  },
  {
    title: 'Project',
    icon: 'settings',
    items: [
      { to: '/settings/project', label: 'Project Settings', icon: 'settings' },
      { to: '/assets', label: 'Asset Gallery', icon: 'image' },
      { to: '/history', label: 'History', icon: 'history' },
    ],
  },
];

const SIDEBAR_WIDTH = 240;

const environmentLabel = import.meta.env.PROD ? 'Production' : 'Development';

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'U';
}

function sectionHasActive(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isActive(pathname, item.to));
}

function isExternalLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
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
  const projectName = useSettingsStore((s) => s.projectName);
  const adminLogoAssetId = useSettingsStore((s) => s.adminLogoAssetId);
  const logoUrl = useSettingsStore((s) => s.logoUrl);
  const adminLogoLink = useSettingsStore((s) => s.adminLogoLink);
  const adminLogoSrc = resolveAdminLogoSrc({ adminLogoAssetId, logoUrl });

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navSections.map((s) => [s.title, true])),
  );

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navSections.forEach((section) => {
      if (sectionHasActive(location.pathname, section)) {
        setExpandedSections((prev) => ({ ...prev, [section.title]: true }));
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resolvedBreadcrumbs = useMemo<BreadcrumbItem[]>(
    () => breadcrumbs ?? [{ label: 'Admin', to: '/' }, { label: title }],
    [breadcrumbs, title],
  );

  const roleLabel = user?.admin_access ? 'Super Admin' : user?.role || 'Editor';
  const userIdLabel = user?.id ? `CMS-${user.id.slice(0, 8).toUpperCase()}` : 'CMS-00001';

  function toggleSection(sectionTitle: string) {
    setExpandedSections((prev) => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  }

  const dashboardActive = isActive(location.pathname, dashboardNav.to);

  const logoMark = adminLogoSrc ? (
    <img
      src={adminLogoSrc}
      alt={projectName}
      className="h-10 w-auto max-w-[120px] shrink-0 object-contain"
    />
  ) : (
    <span className="app-logo-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
      <Icon name="layout" className="h-5 w-5" />
    </span>
  );

  const logoLink = adminLogoLink.trim();
  const linkedLogoMark = logoLink ? (
    isExternalLink(logoLink) ? (
      <a href={logoLink} className="shrink-0 rounded-lg transition-opacity hover:opacity-80">
        {logoMark}
      </a>
    ) : (
      <Link to={logoLink} className="shrink-0 rounded-lg transition-opacity hover:opacity-80">
        {logoMark}
      </Link>
    )
  ) : (
    logoMark
  );

  return (
    <div className="page-shell flex min-h-screen">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-30 flex flex-col transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          {linkedLogoMark}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-[var(--app-text)]">{projectName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <Link
            to={dashboardNav.to}
            className={`nav-item ${dashboardActive ? 'nav-item-active' : 'nav-item-idle'}`}
          >
            <Icon name={dashboardNav.icon} className="nav-item-icon" />
            <span className="flex-1 truncate">{dashboardNav.label}</span>
          </Link>

          {navSections.map((section) => {
            const expanded = expandedSections[section.title] ?? true;
            const sectionActive = sectionHasActive(location.pathname, section);

            return (
              <div key={section.title} className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={`nav-section-trigger ${sectionActive ? 'text-slate-800' : ''}`}
                >
                  <Icon name={section.icon} className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-left">{section.title}</span>
                  <Icon
                    name="chevron-down"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {expanded && (
                  <div className="mt-0.5 space-y-0.5 pl-2">
                    {section.items.map((item) => {
                      const active = isActive(location.pathname, item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`nav-item nav-item-nested ${active ? 'nav-item-active' : 'nav-item-idle'}`}
                        >
                          <span className={`nav-bullet ${active ? 'nav-bullet-active' : ''}`} />
                          <span className="flex-1 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="nav-sign-out"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out ${
          sidebarOpen ? 'lg:ml-[240px]' : ''
        }`}
      >
        <header className="app-topbar">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="topbar-icon-btn"
              aria-label="Toggle sidebar"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Environment</p>
              <p className="text-sm font-semibold text-slate-900">{environmentLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="user-pill hidden sm:inline-flex"
              >
                <span className="truncate">
                  {initials(user?.first_name, user?.last_name)} · {roleLabel} · {userIdLabel}
                </span>
                <Icon name="chevron-down" className="h-4 w-4 shrink-0 text-brand-500" />
              </button>
              {userMenuOpen && (
                <div className="menu-dropdown absolute right-0 top-full z-50 mt-2 min-w-[200px]">
                  <div className="border-b border-surface-border px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="menu-dropdown-item w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <span className="user-avatar" title={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`}>
              {initials(user?.first_name, user?.last_name)}
            </span>
          </div>
        </header>

        <div className="page-header">
          <Breadcrumbs items={resolvedBreadcrumbs} />
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </div>

        <main className="flex-1 animate-fade-in overflow-auto px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          <div className={fullWidth ? 'w-full page-stack' : 'page-inner page-stack'}>{children}</div>
        </main>
      </div>
    </div>
  );
}
