import type { FlowTriggerType } from '../api';

export interface TriggerCatalogEntry {
  type: FlowTriggerType;
  label: string;
  description: string;
}

export const TRIGGER_CATALOG: TriggerCatalogEntry[] = [
  { type: 'event', label: 'Event Hook', description: 'Run on item create, update, or delete' },
  { type: 'webhook', label: 'Webhook', description: 'Expose an HTTP endpoint for this flow' },
  { type: 'schedule', label: 'Schedule', description: 'Run on a cron schedule' },
  { type: 'manual', label: 'Manual', description: 'Trigger from the admin UI or API' },
  { type: 'operation', label: 'Another Flow', description: 'Invoked by a Trigger Flow operation' },
];

export const EVENT_SCOPES = [
  'items.create',
  'items.update',
  'items.delete',
] as const;

export const EVENT_HOOK_TYPES = [
  { value: 'action', label: 'Action (after commit)' },
  { value: 'filter', label: 'Filter (before commit)' },
] as const;

export function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return 'Invalid cron expression (expected 5 fields)';
  }
  const [minute, hour, dom, month, dow] = parts;
  if (minute === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'Every hour at minute 0';
  }
  if (minute === '0' && hour === '0' && dom === '*' && month === '*' && dow === '*') {
    return 'Daily at midnight';
  }
  return `At ${minute} ${hour} ${dom} ${month} ${dow}`;
}

export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
