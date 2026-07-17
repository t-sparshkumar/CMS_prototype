import { parseJsonField } from '../parseFields';
import { resolveImageFromFields } from '../resolveImageSrc';

interface Tile {
  title?: string;
  subtitle?: string;
  image_url?: string;
  url?: string;
}

interface ServiceTilesProps {
  fields: Record<string, unknown>;
}

export default function ServiceTiles({ fields }: ServiceTilesProps) {
  const tiles = parseJsonField<Tile[]>(fields.tiles, []);

  if (tiles.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-8">
      <div className="mx-auto grid max-w-[var(--liberty-max-width)] grid-cols-1 gap-4 px-4 md:grid-cols-2">
        {tiles.map((tile, index) => {
          const imageSrc = resolveImageFromFields(tile as Record<string, unknown>, {
            width: 640,
            height: 360,
            fit: 'cover',
            format: 'webp',
          });

          return (
          <a
            key={index}
            href={tile.url ?? '#'}
            className="group relative overflow-hidden rounded-2xl bg-liberty-gray shadow-card"
          >
            <div className="aspect-[16/9] overflow-hidden">
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt={tile.title ?? ''}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <h3 className="text-2xl font-bold">{tile.title}</h3>
              {tile.subtitle && <p className="mt-1 text-sm text-white/85">{tile.subtitle}</p>}
            </div>
          </a>
          );
        })}
      </div>
    </section>
  );
}
