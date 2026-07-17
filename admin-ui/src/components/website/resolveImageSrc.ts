import { getAssetUrl } from '../../lib/api';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_REGEX = /^https?:\/\//i;

export type ImageTransformOptions = {
  width?: number;
  height?: number;
  fit?: string;
  format?: string;
};

/**
 * Resolve a CMS asset id or direct image URL for website preview renderers.
 */
export function resolveImageSrc(
  value: unknown,
  options?: ImageTransformOptions,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (URL_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (UUID_REGEX.test(trimmed)) {
    return getAssetUrl(trimmed, options);
  }

  return trimmed;
}

/**
 * Pick the first usable image value from common slide/block field names.
 */
export function resolveImageFromFields(
  fields: Record<string, unknown>,
  options?: ImageTransformOptions,
): string | null {
  const candidates = [
    fields.image_url,
    fields.image,
    fields.image_web,
    fields.image_tablet,
    fields.image_mobile,
  ];

  for (const candidate of candidates) {
    const resolved = resolveImageSrc(candidate, options);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}
