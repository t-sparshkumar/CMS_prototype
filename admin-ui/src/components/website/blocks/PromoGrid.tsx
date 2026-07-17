import { parseJsonField } from '../parseFields';
import { resolveImageFromFields } from '../resolveImageSrc';

interface PromoItem {
  title?: string;
  body?: string;
  cta_label?: string;
  cta_url?: string;
  image_url?: string;
}

interface PromoGridProps {
  fields: Record<string, unknown>;
}

export default function PromoGrid({ fields }: PromoGridProps) {
  const title = String(fields.title ?? '');
  const subtitle = String(fields.subtitle ?? '');
  const items = parseJsonField<PromoItem[]>(fields.items, []);

  if (!title && items.length === 0) {
    return null;
  }

  return (
    <section className="bg-liberty-gray py-12">
      <div className="mx-auto max-w-[var(--liberty-max-width)] px-4">
        {(title || subtitle) && (
          <div className="mb-8 max-w-3xl">
            {title && <h2 className="text-2xl font-bold text-liberty-dark md:text-3xl">{title}</h2>}
            {subtitle && <p className="mt-3 text-liberty-gray-mid">{subtitle}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item, index) => {
            const imageSrc = resolveImageFromFields(item as Record<string, unknown>, {
              width: 480,
              height: 240,
              fit: 'cover',
              format: 'webp',
            });

            return (
            <article
              key={index}
              className="overflow-hidden rounded-xl bg-white shadow-card"
            >
              {imageSrc && (
                <img src={imageSrc} alt={item.title ?? ''} className="h-40 w-full object-cover" />
              )}
              <div className="p-5">
                {item.title && <h3 className="text-lg font-bold text-liberty-dark">{item.title}</h3>}
                {item.body && <p className="mt-2 text-sm text-liberty-gray-mid">{item.body}</p>}
                {item.cta_label && (
                  <a
                    href={item.cta_url ?? '#'}
                    className="mt-4 inline-flex text-sm font-semibold text-liberty-red hover:text-liberty-red-dark"
                  >
                    {item.cta_label}
                  </a>
                )}
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
