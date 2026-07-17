export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value && typeof value === 'object') {
    return value as T;
  }
  return fallback;
}

export function parseNavLinks(value: unknown): Array<{ label: string; url: string }> {
  return parseJsonField(value, []);
}

export function parseFooterColumns(
  value: unknown,
): Array<{ title: string; links: Array<{ label: string; url: string }> }> {
  return parseJsonField(value, []);
}
