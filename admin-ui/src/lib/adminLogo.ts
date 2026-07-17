import { getAssetUrl } from './api';

export function resolveAdminLogoSrc(settings: {
  adminLogoAssetId: string | null;
  logoUrl: string;
}): string | null {
  if (settings.adminLogoAssetId) {
    return getAssetUrl(settings.adminLogoAssetId, { width: 160, height: 64, fit: 'contain' });
  }
  const url = settings.logoUrl?.trim();
  return url || null;
}
