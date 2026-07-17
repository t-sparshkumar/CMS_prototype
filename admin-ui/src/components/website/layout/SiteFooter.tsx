import { getAssetUrl, type ItemRecord } from '../../../lib/api';
import { parseFooterColumns } from '../parseFields';

interface SiteFooterProps {
  footer: ItemRecord;
}

export default function SiteFooter({ footer }: SiteFooterProps) {
  const columns = parseFooterColumns(footer.links);
  const description = String(footer.description ?? '');
  const copyright = String(footer.copyright ?? '');
  const title = String(footer.title ?? 'Liberty');
  const logoId = footer.logo as string | undefined;

  return (
    <footer className="bg-liberty-dark text-white">
      <div className="mx-auto max-w-[var(--liberty-max-width)] px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            {logoId ? (
              <img
                src={getAssetUrl(logoId, { width: 120, height: 40, fit: 'contain' })}
                alt={title}
                className="mb-4 h-8 w-auto brightness-0 invert"
              />
            ) : (
              <p className="mb-4 text-2xl font-bold text-liberty-red">{title}</p>
            )}
            {description && <p className="text-sm text-white/70">{description}</p>}
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">{column.title}</h4>
              <ul className="space-y-2">
                {column.links?.map((link) => (
                  <li key={link.label}>
                    <a href={link.url} className="text-sm text-white/70 hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {copyright && (
          <p className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/50">
            {copyright}
          </p>
        )}
      </div>
    </footer>
  );
}
