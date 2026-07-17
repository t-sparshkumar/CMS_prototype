/**
 * Normalize boolean values from API/DB (true/false, 1/0, "true"/"false").
 */
export function parseBoolean(value: unknown, defaultValue = false): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  return defaultValue;
}
