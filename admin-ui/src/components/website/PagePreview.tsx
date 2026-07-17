import { useEffect, useMemo, useState } from 'react';
import { parsePageSections, type PageSectionRef } from '../PageSectionsBuilder';
import type { ItemRecord } from '../../lib/api';
import { fetchItem } from '../../lib/api';
import WebsiteComponentRenderer from './WebsiteComponentRenderer';
import './liberty-tokens.css';

interface PagePreviewProps {
  page: ItemRecord;
  className?: string;
}

function getSections(page: ItemRecord): PageSectionRef[] {
  return parsePageSections(page.sections);
}

export default function PagePreview({ page, className = '' }: PagePreviewProps) {
  const baseSections = useMemo(() => getSections(page), [page]);
  const [sections, setSections] = useState<PageSectionRef[]>(baseSections);

  useEffect(() => {
    setSections(baseSections);
  }, [baseSections]);

  useEffect(() => {
    let cancelled = false;

    async function enrichSections() {
      const enriched = await Promise.all(
        baseSections.map(async (ref) => {
          if (ref.data && Object.keys(ref.data).length > 0) {
            return ref;
          }

          try {
            const item = await fetchItem(ref.collection, ref.item);
            return { ...ref, data: item };
          } catch {
            return ref;
          }
        }),
      );

      if (!cancelled) {
        setSections(enriched);
      }
    }

    void enrichSections();
    return () => {
      cancelled = true;
    };
  }, [baseSections]);

  const hasHeader = sections.some((section) => section.collection === 'site_header');
  const hasFooter = sections.some((section) => section.collection === 'site_footer');

  return (
    <div className={`liberty-preview min-h-screen ${className}`}>
      <main className={hasHeader || hasFooter ? 'pb-0' : 'py-0'}>
        {sections.map((section) => (
          <WebsiteComponentRenderer key={`${section.collection}:${section.item}`} section={section} />
        ))}
      </main>
    </div>
  );
}
