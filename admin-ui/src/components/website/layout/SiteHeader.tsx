import { useState } from 'react';
import { getAssetUrl, type ItemRecord } from '../../../lib/api';
import { parseNavLinks } from '../parseFields';

interface SiteHeaderProps {
  header: ItemRecord;
}

export default function SiteHeader({ header }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = parseNavLinks(header.nav_links);
  const title = String(header.title ?? 'Liberty');
  const ctaLabel = String(header.cta_label ?? '');
  const ctaUrl = String(header.cta_url ?? '#');
  const logoId = header.logo as string | undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-[var(--liberty-nav-height)] max-w-[var(--liberty-max-width)] items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2">
          {logoId ? (
            <img
              src={getAssetUrl(logoId, { width: 120, height: 40, fit: 'contain' })}
              alt={title}
              className="h-8 w-auto"
            />
          ) : (
            <span className="text-2xl font-bold text-liberty-red">{title}</span>
          )}
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              className="text-sm font-medium text-liberty-dark hover:text-liberty-red"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {ctaLabel && (
            <a
              href={ctaUrl}
              className="hidden rounded-full border border-liberty-red px-4 py-1.5 text-sm font-semibold text-liberty-red hover:bg-liberty-red hover:text-white sm:inline-flex"
            >
              {ctaLabel}
            </a>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-liberty-dark hover:bg-liberty-gray lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                className="rounded-lg px-3 py-2 text-sm font-medium text-liberty-dark hover:bg-liberty-gray"
              >
                {link.label}
              </a>
            ))}
            {ctaLabel && (
              <a
                href={ctaUrl}
                className="mt-2 rounded-full bg-liberty-red px-4 py-2 text-center text-sm font-semibold text-white"
              >
                {ctaLabel}
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
