import type { DataChain } from '../../types/flow.js';

const TEMPLATE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Resolve a dot-path against the data chain (e.g. $trigger.payload.title).
 */
export function getChainValue(chain: DataChain, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }

  const parts = trimmed.split('.');
  let current: unknown = chain;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Parse {{ $trigger.payload.title }} templates in strings.
 */
export function parseTemplateString(value: string, chain: DataChain): string {
  return value.replace(TEMPLATE_PATTERN, (_match, rawPath: string) => {
    const resolved = getChainValue(chain, rawPath);
    if (resolved === undefined || resolved === null) {
      return '';
    }
    if (typeof resolved === 'object') {
      return JSON.stringify(resolved);
    }
    return String(resolved);
  });
}

/**
 * Deep-parse templates inside operation option objects.
 */
export function parseTemplates<T>(value: T, chain: DataChain): T {
  if (typeof value === 'string') {
    return parseTemplateString(value, chain) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => parseTemplates(entry, chain)) as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = parseTemplates(entry, chain);
    }
    return result as T;
  }

  return value;
}

/**
 * Build the initial data chain for a flow run.
 */
export function createDataChain(
  trigger: Record<string, unknown>,
  env: Record<string, string> = {},
): DataChain {
  return {
    $trigger: trigger,
    $env: env,
  };
}

/**
 * Merge operation output into the data chain as $last.
 */
export function appendLast(chain: DataChain, output: unknown): DataChain {
  return {
    ...chain,
    $last: output,
  };
}
