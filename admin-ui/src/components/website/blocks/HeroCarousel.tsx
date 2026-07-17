import { useEffect, useState } from 'react';
import { parseJsonField } from '../parseFields';
import { resolveImageSrc } from '../resolveImageSrc';

interface Slide {
  headline?: string;
  subheadline?: string;
  price?: string;
  cta_label?: string;
  cta_url?: string;
  image_url?: string;
  image?: string;
  image_web?: string;
  image_tablet?: string;
  image_mobile?: string;
  theme?: string;
}

interface HeroCarouselProps {
  fields: Record<string, unknown>;
}

export default function HeroCarousel({ fields }: HeroCarouselProps) {
  const slides = parseJsonField<Slide[]>(fields.slides, []);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[active] ?? slides[0];
  const isDark = slide?.theme !== 'light';
  const imageWeb = resolveImageSrc(slide?.image_web ?? slide?.image_url ?? slide?.image, {
    width: 1600,
    height: 680,
    fit: 'cover',
    format: 'webp',
  });
  const imageTablet = resolveImageSrc(slide?.image_tablet ?? slide?.image_web ?? slide?.image_url ?? slide?.image, {
    width: 1024,
    height: 576,
    fit: 'cover',
    format: 'webp',
  });
  const imageMobile = resolveImageSrc(
    slide?.image_mobile ?? slide?.image_tablet ?? slide?.image_web ?? slide?.image_url ?? slide?.image,
    {
      width: 640,
      height: 800,
      fit: 'cover',
      format: 'webp',
    },
  );
  const fallbackImage = imageWeb ?? imageTablet ?? imageMobile;

  return (
    <section className="relative overflow-hidden bg-liberty-dark">
      <div className="relative mx-auto max-w-[var(--liberty-max-width)]">
        <div className="relative aspect-[21/9] min-h-[320px] w-full md:min-h-[420px]">
          {fallbackImage ? (
            <picture>
              {imageMobile ? <source media="(max-width: 639px)" srcSet={imageMobile} /> : null}
              {imageTablet ? (
                <source media="(min-width: 640px) and (max-width: 1023px)" srcSet={imageTablet} />
              ) : null}
              {imageWeb ? <source media="(min-width: 1024px)" srcSet={imageWeb} /> : null}
              <img
                src={fallbackImage}
                alt={slide?.headline ?? ''}
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
            </picture>
          ) : null}
          <div
            className={`absolute inset-0 ${
              isDark ? 'bg-gradient-to-r from-black/70 via-black/40 to-transparent' : 'bg-gradient-to-r from-white/90 via-white/60 to-transparent'
            }`}
          />
          <div className="relative z-10 flex h-full flex-col justify-center px-6 py-12 md:px-12">
            {slide?.headline && (
              <h2
                className={`max-w-xl text-3xl font-bold leading-tight md:text-5xl ${
                  isDark ? 'text-white' : 'text-liberty-dark'
                }`}
              >
                {slide.headline}
              </h2>
            )}
            {slide?.subheadline && (
              <p
                className={`mt-3 max-w-lg text-base md:text-lg ${
                  isDark ? 'text-white/90' : 'text-liberty-gray-mid'
                }`}
              >
                {slide.subheadline}
              </p>
            )}
            {slide?.price && (
              <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-liberty-red'}`}>
                {slide.price}
              </p>
            )}
            {slide?.cta_label && (
              <a
                href={slide.cta_url ?? '#'}
                className="mt-6 inline-flex w-fit rounded-full bg-liberty-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-liberty-red-dark"
              >
                {slide.cta_label}
              </a>
            )}
          </div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setActive(index)}
                className={`h-2.5 w-2.5 rounded-full ${
                  index === active ? 'bg-liberty-red' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
