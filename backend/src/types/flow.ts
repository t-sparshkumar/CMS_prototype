export type FlowStatus = 'active' | 'inactive';

export type FlowTriggerType = 'event' | 'webhook' | 'schedule' | 'manual' | 'operation';

export type FlowAccountability = 'all' | 'accountability' | 'activity';

export type FlowLogStatus = 'running' | 'completed' | 'failed';

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

export interface FlowRow {
  id: string;
  name: string;
  status: FlowStatus;
  trigger_type: FlowTriggerType;
  trigger_options: Record<string, unknown> | null;
  accountability: FlowAccountability;
  operation: string | null;
  date_created: string;
  date_updated: string;
  user_created: string | null;
  user_updated: string | null;
}

export interface FlowOperationRow {
  id: string;
  flow: string;
  name: string | null;
  key: string;
  type: FlowOperationType;
  options: Record<string, unknown> | null;
  resolve: string | null;
  reject: string | null;
  position_x: number;
  position_y: number;
  date_created: string;
  date_updated: string;
}

export interface FlowLogRow {
  id: string;
  flow: string;
  status: FlowLogStatus;
  started_at: string;
  finished_at: string | null;
  execution_time: number | null;
  trigger_log: Record<string, unknown> | null;
  operations_log: FlowOperationLogEntry[] | null;
}

export interface FlowOperationLogEntry {
  operation_id: string;
  operation_key: string;
  operation_type: FlowOperationType;
  status: 'success' | 'failed' | 'skipped';
  branch?: string;
  input: Record<string, unknown> | null;
  output: unknown;
  error?: string;
  duration_ms: number;
}

export interface DataChain {
  $trigger: Record<string, unknown>;
  $last?: unknown;
  $accountability?: {
    user: string | null;
    role: string | null;
  };
  $env: Record<string, string>;
}

export interface FlowTriggerPayload {
  type: FlowTriggerType;
  collection?: string;
  event?: 'create' | 'update' | 'delete';
  hook?: 'filter' | 'action';
  keys?: string[];
  payload?: Record<string, unknown>;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  accountability?: {
    user: string | null;
    role: string | null;
  };
}

export interface FlowRunResult {
  success: boolean;
  dataChain: DataChain;
  lastOutput: unknown;
  logId: string;
  error?: string;
}

export interface OperationRunResult {
  success: boolean;
  output: unknown;
  branch: 'resolve' | 'reject' | 'none';
  error?: string;
}
