import type { ComponentType, ReactNode } from 'react';
import type { PageSectionRef } from '../PageSectionsBuilder';
import CookieBanner from './blocks/CookieBanner';
import HeroBanner from './blocks/HeroBanner';
import HeroCarousel from './blocks/HeroCarousel';
import InfoBoxBlock from './blocks/InfoBoxBlock';
import ParagraphBlock from './blocks/ParagraphBlock';
import PromoGrid from './blocks/PromoGrid';
import ServiceTiles from './blocks/ServiceTiles';
import UtilityBar from './blocks/UtilityBar';
import SiteFooter from './layout/SiteFooter';
import SiteHeader from './layout/SiteHeader';
import { parseJsonField } from './parseFields';

export interface BlockRenderProps {
  collection: string;
  fields: Record<string, unknown>;
}

function GenericHero({ fields }: { fields: Record<string, unknown> }) {
  return <HeroBanner fields={fields} />;
}

function SiteHeaderBlock({ fields }: { fields: Record<string, unknown> }) {
  return <SiteHeader header={fields} />;
}

function SiteFooterBlock({ fields }: { fields: Record<string, unknown> }) {
  return <SiteFooter footer={fields} />;
}

const BLOCK_RENDERERS: Record<string, ComponentType<{ fields: Record<string, unknown> }>> = {
  site_header: SiteHeaderBlock,
  site_footer: SiteFooterBlock,
  hero_banners: HeroBanner,
  hero_carousels: HeroCarousel,
  service_tiles: ServiceTiles,
  promo_grids: PromoGrid,
  paragraphs: ParagraphBlock,
  info_boxes: InfoBoxBlock,
};

/** Normalize block collection item fields for preview renderers. */
export function normalizeBlockFields(collection: string, data: Record<string, unknown>): Record<string, unknown> {
  const fields = { ...data };

  if (collection === 'site_header' && fields.nav_links !== undefined) {
    fields.nav_links = parseJsonField(fields.nav_links, []);
  }
  if (collection === 'site_footer' && fields.links !== undefined) {
    fields.links = parseJsonField(fields.links, []);
  }
  if (collection === 'hero_carousels' && fields.slides !== undefined) {
    fields.slides = parseJsonField(fields.slides, []);
  }
  if (collection === 'service_tiles' && fields.tiles !== undefined) {
    fields.tiles = parseJsonField(fields.tiles, []);
  }
  if (collection === 'promo_grids') {
    if (fields.items !== undefined) {
      fields.items = parseJsonField(fields.items, []);
    }
    if (!fields.title && fields.section_title) {
      fields.title = fields.section_title;
    }
  }

  return fields;
}

export function renderPageSection(section: PageSectionRef): ReactNode {
  const data = (section.data ?? {}) as Record<string, unknown>;
  const fields = normalizeBlockFields(section.collection, data);
  const Renderer = BLOCK_RENDERERS[section.collection];

  if (Renderer) {
    return <Renderer fields={fields} key={`${section.collection}:${section.item}`} />;
  }

  return (
    <section
      key={`${section.collection}:${section.item}`}
      className="border-y border-dashed border-slate-200 bg-slate-50 py-8"
    >
      <div className="mx-auto max-w-[var(--liberty-max-width)] px-4 text-center text-sm text-slate-500">
        Unknown block type: {section.collection}
      </div>
    </section>
  );
}

/** @deprecated Legacy inline component instance renderer */
interface LegacyInstance {
  id: string;
  component_name: string;
  component_slug?: string;
  component_type: string;
  fields: Record<string, unknown>;
}

function renderLegacyInstance(instance: LegacyInstance): React.ReactNode {
  const key = instance.component_slug || instance.component_type;
  const fields = instance.fields;

  switch (key) {
    case 'utility-bar':
      return <UtilityBar fields={fields} key={instance.id} />;
    case 'hero-carousel':
      return <HeroCarousel fields={fields} key={instance.id} />;
    case 'service-tiles':
      return <ServiceTiles fields={fields} key={instance.id} />;
    case 'promo-grid':
      return <PromoGrid fields={fields} key={instance.id} />;
    case 'cookie-banner':
      return <CookieBanner fields={fields} key={instance.id} />;
    case 'hero':
    case 'hero-banner':
      return <GenericHero fields={fields} key={instance.id} />;
    default:
      return (
        <section key={instance.id} className="border-y border-dashed border-slate-200 bg-slate-50 py-8">
          <div className="mx-auto max-w-[var(--liberty-max-width)] px-4 text-center text-sm text-slate-500">
            Unknown component: {instance.component_name}
          </div>
        </section>
      );
  }
}

export default function WebsiteComponentRenderer({
  section,
  legacyInstance,
}: {
  section?: PageSectionRef;
  legacyInstance?: LegacyInstance;
}) {
  if (section) {
    return <>{renderPageSection(section)}</>;
  }
  if (legacyInstance) {
    return <>{renderLegacyInstance(legacyInstance)}</>;
  }
  return null;
}
