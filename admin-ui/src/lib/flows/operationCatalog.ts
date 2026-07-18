export type FlowOperationType =
  | 'condition'
  | 'item-read'
  | 'item-create'
  | 'item-update'
  | 'item-delete'
  | 'request'
  | 'exec'
  | 'mail'
  | 'trigger'
  | 'log';

export interface OperationCatalogEntry {
  type: FlowOperationType;
  label: string;
  description: string;
  category: 'logic' | 'data' | 'integration' | 'utility';
  icon: string;
  accentVar: string;
  accentBgVar: string;
  dualOutput: boolean;
  defaultOptions: Record<string, unknown>;
}

export const OPERATION_CATALOG: OperationCatalogEntry[] = [
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch on filter rules',
    category: 'logic',
    icon: 'call_split',
    accentVar: '--flow-node-condition',
    accentBgVar: '--flow-node-condition-bg',
    dualOutput: true,
    defaultOptions: { filter: { scope: '$trigger.payload' } },
  },
  {
    type: 'item-read',
    label: 'Read Data',
    description: 'Read items from a collection',
    category: 'data',
    icon: 'database',
    accentVar: '--flow-node-data',
    accentBgVar: '--flow-node-data-bg',
    dualOutput: false,
    defaultOptions: { collection: '', query: { limit: 100 } },
  },
  {
    type: 'item-create',
    label: 'Create Data',
    description: 'Create a new item',
    category: 'data',
    icon: 'add_circle',
    accentVar: '--flow-node-data',
    accentBgVar: '--flow-node-data-bg',
    dualOutput: false,
    defaultOptions: { collection: '', payload: {} },
  },
  {
    type: 'item-update',
    label: 'Update Data',
    description: 'Update an existing item',
    category: 'data',
    icon: 'edit_note',
    accentVar: '--flow-node-data',
    accentBgVar: '--flow-node-data-bg',
    dualOutput: false,
    defaultOptions: { collection: '', key: '', payload: {} },
  },
  {
    type: 'item-delete',
    label: 'Delete Data',
    description: 'Delete an item by key',
    category: 'data',
    icon: 'delete',
    accentVar: '--flow-node-data',
    accentBgVar: '--flow-node-data-bg',
    dualOutput: false,
    defaultOptions: { collection: '', key: '' },
  },
  {
    type: 'request',
    label: 'Webhook / Request',
    description: 'Call an external HTTP endpoint',
    category: 'integration',
    icon: 'language',
    accentVar: '--flow-node-request',
    accentBgVar: '--flow-node-request-bg',
    dualOutput: false,
    defaultOptions: { method: 'POST', url: '', headers: {}, body: null },
  },
  {
    type: 'exec',
    label: 'Run Script',
    description: 'Execute sandboxed JavaScript',
    category: 'integration',
    icon: 'code',
    accentVar: '--flow-node-script',
    accentBgVar: '--flow-node-script-bg',
    dualOutput: false,
    defaultOptions: { code: 'module.exports = data.$last;' },
  },
  {
    type: 'mail',
    label: 'Send Email',
    description: 'Send an email message',
    category: 'integration',
    icon: 'mail',
    accentVar: '--flow-node-request',
    accentBgVar: '--flow-node-request-bg',
    dualOutput: false,
    defaultOptions: { to: '', subject: '', body: '' },
  },
  {
    type: 'trigger',
    label: 'Trigger Flow',
    description: 'Run another flow',
    category: 'utility',
    icon: 'bolt',
    accentVar: '--flow-node-default',
    accentBgVar: '--flow-node-default-bg',
    dualOutput: false,
    defaultOptions: { flow: '', payload: {} },
  },
  {
    type: 'log',
    label: 'Log to Console',
    description: 'Write a message to server logs',
    category: 'utility',
    icon: 'terminal',
    accentVar: '--flow-node-default',
    accentBgVar: '--flow-node-default-bg',
    dualOutput: false,
    defaultOptions: { message: '' },
  },
];

export function getOperationCatalogEntry(type: string): OperationCatalogEntry | undefined {
  return OPERATION_CATALOG.find((entry) => entry.type === type);
}
