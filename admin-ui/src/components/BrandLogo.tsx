import { useSettingsStore } from '../stores/settingsStore';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Use on white/light backgrounds — white badge so the logo sits cleanly on light UI */
  onLight?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
};

export default function BrandLogo({ size = 'md', onLight = false, className = '' }: BrandLogoProps) {
  const logoUrl = useSettingsStore((s) => s.logoUrl);
  const projectName = useSettingsStore((s) => s.projectName);

  if (logoUrl) {
    const img = (
      <img
        src={logoUrl}
        alt={projectName}
        className={`${SIZES[size]} w-auto object-contain ${className}`}
      />
    );

    if (onLight) {
      return (
        <span className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-surface-border">
          {img}
        </span>
      );
    }

    return img;
  }

  return (
    <span
      className={`font-bold ${onLight ? 'text-brand-600' : 'text-white'} ${size === 'lg' ? 'text-xl' : 'text-base'} ${className}`}
    >
      {projectName}
    </span>
  );
}
