import { resolveAdminLogoSrc } from '../lib/adminLogo';
import { useSettingsStore } from '../stores/settingsStore';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Use on white/light backgrounds — light accent-tinted badge */
  onLight?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
};

export default function BrandLogo({ size = 'md', onLight = false, className = '' }: BrandLogoProps) {
  const adminLogoAssetId = useSettingsStore((s) => s.adminLogoAssetId);
  const logoUrl = useSettingsStore((s) => s.logoUrl);
  const projectName = useSettingsStore((s) => s.projectName);
  const src = resolveAdminLogoSrc({ adminLogoAssetId, logoUrl });

  if (src) {
    const img = (
      <img
        src={src}
        alt={projectName}
        className={`app-logo-img ${SIZES[size]} w-auto object-contain ${className}`}
      />
    );

    if (onLight) {
      return (
        <span className="app-logo-wrap inline-flex items-center rounded-xl border px-3 py-1.5 shadow-sm">
          {img}
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center rounded-xl px-3 py-1.5 shadow-sm"
        style={{ boxShadow: '0 0 0 2px var(--app-accent)' }}
      >
        {img}
      </span>
    );
  }

  return (
    <span
      className={`app-logo-text font-bold ${size === 'lg' ? 'text-xl' : 'text-base'} ${className}`}
    >
      {projectName}
    </span>
  );
}
