/**
 * Validate an in-app return path from query params (prevents open redirects).
 */
export function getSafeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export function withReturnTo(path: string, returnTo?: string | null): string {
  if (!returnTo) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
