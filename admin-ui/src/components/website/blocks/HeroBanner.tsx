import { resolveImageSrc } from '../resolveImageSrc';

interface HeroBannerProps {
  fields: Record<string, unknown>;
}

function resolveImageId(fields: Record<string, unknown>, key: string, fallbacks: string[] = []): string | null {
  const value = fields[key];
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  for (const fallback of fallbacks) {
    const fallbackValue = fields[fallback];
    if (typeof fallbackValue === 'string' && fallbackValue.trim()) {
      return fallbackValue;
    }
  }

  return null;
}

function heroImageUrl(fileId: string, width: number): string {
  return resolveImageSrc(fileId, { width, height: Math.round(width * 0.42), fit: 'cover', format: 'webp' }) ?? '';
}

export default function HeroBanner({ fields }: HeroBannerProps) {
  const headline = String(fields.headline ?? fields.title ?? '').trim();
  const subheadline = fields.subheadline ? String(fields.subheadline).trim() : '';
  const ctaLabel = fields.cta_label ? String(fields.cta_label).trim() : '';
  const ctaUrl = fields.cta_url ? String(fields.cta_url).trim() : '#';

  const imageWeb = resolveImageId(fields, 'image_web', ['image']);
  const imageTablet = resolveImageId(fields, 'image_tablet', ['image_web', 'image']);
  const imageMobile = resolveImageId(fields, 'image_mobile', ['image_tablet', 'image_web', 'image']);

  const hasImage = Boolean(imageWeb || imageTablet || imageMobile);

  return (
    <section className="relative overflow-hidden bg-liberty-dark">
      <div className="relative mx-auto max-w-[var(--liberty-max-width)]">
        <div className="relative aspect-[4/3] min-h-[280px] w-full sm:aspect-[16/9] sm:min-h-[360px] lg:min-h-[480px]">
          {hasImage ? (
            <picture>
              {imageMobile ? (
                <source media="(max-width: 639px)" srcSet={heroImageUrl(imageMobile, 640)} />
              ) : null}
              {imageTablet ? (
                <source media="(min-width: 640px) and (max-width: 1023px)" srcSet={heroImageUrl(imageTablet, 1024)} />
              ) : null}
              {imageWeb ? (
                <source media="(min-width: 1024px)" srcSet={heroImageUrl(imageWeb, 1600)} />
              ) : null}
              <img
                src={heroImageUrl(imageWeb ?? imageTablet ?? imageMobile ?? '', 1600)}
                alt={headline || 'Hero banner'}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-liberty-dark via-liberty-gray to-liberty-dark" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

          {(headline || subheadline || ctaLabel) && (
            <div className="relative z-10 flex h-full flex-col justify-center px-6 py-12 md:px-12">
              {headline ? (
                <h2 className="max-w-xl text-3xl font-bold leading-tight text-white md:text-5xl">{headline}</h2>
              ) : null}
              {subheadline ? (
                <p className="mt-3 max-w-lg text-base text-white/90 md:text-lg">{subheadline}</p>
              ) : null}
              {ctaLabel ? (
                <a
                  href={ctaUrl}
                  className="mt-6 inline-flex w-fit rounded-full bg-liberty-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-liberty-red-dark"
                >
                  {ctaLabel}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
