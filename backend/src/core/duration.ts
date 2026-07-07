const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parse a duration string like "15m" or "7d" into milliseconds.
 */
export function parseDurationMs(duration: string): number {
  const match = duration.trim().match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = Number(match[1]);
  const unit = match[2] as keyof typeof UNIT_MS;
  const multiplier = UNIT_MS[unit];
  if (!multiplier) {
    throw new Error(`Invalid duration unit: ${unit}`);
  }
  return value * multiplier;
}

/**
 * Add a duration string to the current time and return an expiry Date.
 */
export function expiresAtFromNow(duration: string): Date {
  return new Date(Date.now() + parseDurationMs(duration));
}
