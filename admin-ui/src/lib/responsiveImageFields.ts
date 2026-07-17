import type { FieldMeta } from './api';

export const RESPONSIVE_IMAGE_FIELD_NAMES = ['image_mobile', 'image_tablet', 'image_web'] as const;

export type ResponsiveImageFieldName = (typeof RESPONSIVE_IMAGE_FIELD_NAMES)[number];

export const LEGACY_HERO_IMAGE_FIELDS = ['image_url', 'image'] as const;

export const RESPONSIVE_IMAGE_SLOTS = [
  {
    field: 'image_mobile' as const,
    label: 'Mobile',
    recommend: '750×400px',
    icon: 'mobile' as const,
    iconClass: 'text-violet-600',
  },
  {
    field: 'image_tablet' as const,
    label: 'Web / Tablet',
    recommend: '1024×600px',
    icon: 'tablet' as const,
    iconClass: 'text-brand-600',
  },
  {
    field: 'image_web' as const,
    label: 'Desktop',
    recommend: '1920×600px',
    icon: 'desktop' as const,
    iconClass: 'text-emerald-600',
  },
] as const;

export function hasResponsiveImageGroup(fieldNames: Iterable<string>): boolean {
  const names = new Set(fieldNames);
  return RESPONSIVE_IMAGE_FIELD_NAMES.every((name) => names.has(name));
}

export function shouldHideLegacyHeroImage(fieldNames: Iterable<string>): boolean {
  return (
    hasResponsiveImageGroup(fieldNames) &&
    [...fieldNames].some((name) => LEGACY_HERO_IMAGE_FIELDS.includes(name as (typeof LEGACY_HERO_IMAGE_FIELDS)[number]))
  );
}

export type FormFieldItem =
  | { type: 'field'; field: FieldMeta }
  | { type: 'responsive-images'; fields: FieldMeta[] };

export function buildFormFieldItems(fields: FieldMeta[]): FormFieldItem[] {
  const fieldByName = new Map(fields.map((field) => [field.field, field]));
  const visibleNames = fields.filter((field) => !field.hidden).map((field) => field.field);
  const showResponsiveGroup = hasResponsiveImageGroup(visibleNames);
  const hideLegacy = shouldHideLegacyHeroImage(visibleNames);
  const consumed = new Set<string>();
  const items: FormFieldItem[] = [];

  if (showResponsiveGroup) {
    for (const legacyField of LEGACY_HERO_IMAGE_FIELDS) {
      if (fieldByName.has(legacyField)) {
        consumed.add(legacyField);
      }
    }
  }

  for (const field of fields) {
    if (field.hidden || consumed.has(field.field)) {
      continue;
    }

    if (showResponsiveGroup && RESPONSIVE_IMAGE_FIELD_NAMES.includes(field.field as ResponsiveImageFieldName)) {
      if (!RESPONSIVE_IMAGE_FIELD_NAMES.some((name) => consumed.has(name))) {
        items.push({
          type: 'responsive-images',
          fields: RESPONSIVE_IMAGE_FIELD_NAMES.map((name) => fieldByName.get(name)).filter(
            (entry): entry is FieldMeta => Boolean(entry),
          ),
        });
        for (const name of RESPONSIVE_IMAGE_FIELD_NAMES) {
          consumed.add(name);
        }
      }
      continue;
    }

    if (hideLegacy && LEGACY_HERO_IMAGE_FIELDS.includes(field.field as (typeof LEGACY_HERO_IMAGE_FIELDS)[number])) {
      continue;
    }

    if (consumed.has(field.field)) {
      continue;
    }

    items.push({ type: 'field', field });
  }

  return items;
}

export type RepeaterSubFieldLike = {
  field: string;
  interface?: string;
  type?: string;
  note?: string;
};

export type RepeaterSegment =
  | { type: 'fields'; fields: RepeaterSubFieldLike[] }
  | { type: 'responsive-images'; fields: RepeaterSubFieldLike[] };

export function buildRepeaterSegments(subFields: RepeaterSubFieldLike[]): RepeaterSegment[] {
  const names = subFields.map((field) => field.field);
  const showResponsiveGroup = hasResponsiveImageGroup(names);
  const hideLegacy = shouldHideLegacyHeroImage(names);
  const consumed = new Set<string>();
  const segments: RepeaterSegment[] = [];
  let buffer: RepeaterSubFieldLike[] = [];

  function flushBuffer() {
    if (buffer.length > 0) {
      segments.push({ type: 'fields', fields: buffer });
      buffer = [];
    }
  }

  for (const subField of subFields) {
    if (hideLegacy && LEGACY_HERO_IMAGE_FIELDS.includes(subField.field as (typeof LEGACY_HERO_IMAGE_FIELDS)[number])) {
      continue;
    }

    if (showResponsiveGroup && RESPONSIVE_IMAGE_FIELD_NAMES.includes(subField.field as ResponsiveImageFieldName)) {
      if (!RESPONSIVE_IMAGE_FIELD_NAMES.some((name) => consumed.has(name))) {
        flushBuffer();
        segments.push({
          type: 'responsive-images',
          fields: RESPONSIVE_IMAGE_FIELD_NAMES.map(
            (name) => subFields.find((field) => field.field === name)!,
          ).filter(Boolean),
        });
        for (const name of RESPONSIVE_IMAGE_FIELD_NAMES) {
          consumed.add(name);
        }
      }
      continue;
    }

    if (consumed.has(subField.field)) {
      continue;
    }

    buffer.push(subField);
  }

  flushBuffer();
  return segments;
}
