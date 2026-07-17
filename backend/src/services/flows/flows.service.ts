import { v4 as uuidv4 } from 'uuid';
import type { Knex } from 'knex';
import { parseJsonColumn } from '../../core/field.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { FlowOperationRow, FlowRow } from '../../types/flow.js';
import { normalizeFlowRow, normalizeOperationRow } from './normalize.js';

const ALLOWED_ENV_PREFIX = 'FLOW_ENV_';

export function loadAllowedEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(ALLOWED_ENV_PREFIX) && value !== undefined) {
      env[key.replace(ALLOWED_ENV_PREFIX, '')] = value;
    }
  }
  return env;
}

export async function listFlows(db: Knex): Promise<FlowRow[]> {
  const rows = await db('cms_flows').orderBy('name', 'asc');
  return rows.map((row) => normalizeFlowRow(row as Record<string, unknown>));
}

export async function getFlowById(db: Knex, flowId: string): Promise<FlowRow | null> {
  const row = await db('cms_flows').where({ id: flowId }).first();
  return row ? normalizeFlowRow(row as Record<string, unknown>) : null;
}

export async function getFlowOperations(db: Knex, flowId: string): Promise<FlowOperationRow[]> {
  const rows = await db('cms_flow_operations').where({ flow: flowId }).orderBy('position_y', 'asc');
  return rows.map((row) => normalizeOperationRow(row as Record<string, unknown>));
}

export async function createFlow(
  db: Knex,
  input: {
    name: string;
    status?: FlowRow['status'];
    trigger_type: FlowRow['trigger_type'];
    trigger_options?: Record<string, unknown> | null;
    accountability?: FlowRow['accountability'];
    operation?: string | null;
    operations?: Array<{
      key: string;
      type: FlowOperationRow['type'];
      name?: string | null;
      options?: Record<string, unknown> | null;
      resolve?: string | null;
      reject?: string | null;
      position_x?: number;
      position_y?: number;
    }>;
  },
  userId: string | null,
): Promise<{ flow: FlowRow; operations: FlowOperationRow[] }> {
  const flowId = uuidv4();
  const now = new Date().toISOString();

  await db('cms_flows').insert({
    id: flowId,
    name: input.name,
    status: input.status ?? 'inactive',
    trigger_type: input.trigger_type,
    trigger_options: input.trigger_options ? JSON.stringify(input.trigger_options) : null,
    accountability: input.accountability ?? 'all',
    operation: null,
    date_created: now,
    date_updated: now,
    user_created: userId,
    user_updated: userId,
  });

  const keyToId = new Map<string, string>();

  for (const op of input.operations ?? []) {
    const opId = uuidv4();
    keyToId.set(op.key, opId);
    await db('cms_flow_operations').insert({
      id: opId,
      flow: flowId,
      key: op.key,
      name: op.name ?? op.key,
      type: op.type,
      options: op.options ? JSON.stringify(op.options) : null,
      resolve: null,
      reject: null,
      position_x: op.position_x ?? 1,
      position_y: op.position_y ?? 1,
      date_created: now,
      date_updated: now,
    });
  }

  for (const op of input.operations ?? []) {
    const opId = keyToId.get(op.key);
    if (!opId) continue;
    await db('cms_flow_operations')
      .where({ id: opId })
      .update({
        resolve: op.resolve ? keyToId.get(op.resolve) ?? op.resolve : null,
        reject: op.reject ? keyToId.get(op.reject) ?? op.reject : null,
      });
  }

  const entryKey = input.operations?.[0]?.key;
  const entryId = entryKey ? keyToId.get(entryKey) ?? input.operation ?? null : input.operation ?? null;
  if (entryId) {
    await db('cms_flows').where({ id: flowId }).update({ operation: entryId });
  }

  const flow = await getFlowById(db, flowId);
  if (!flow) {
    throw new AppError('Failed to create flow', 500, 'INTERNAL_ERROR');
  }

  return { flow, operations: await getFlowOperations(db, flowId) };
}

export async function updateFlow(
  db: Knex,
  flowId: string,
  input: Partial<{
    name: string;
    status: FlowRow['status'];
    trigger_type: FlowRow['trigger_type'];
    trigger_options: Record<string, unknown> | null;
    accountability: FlowRow['accountability'];
    operation: string | null;
  }>,
  userId: string | null,
): Promise<FlowRow> {
  const existing = await getFlowById(db, flowId);
  if (!existing) {
    throw new AppError('Flow not found', 404, 'NOT_FOUND');
  }

  const updates: Record<string, unknown> = {
    date_updated: new Date().toISOString(),
    user_updated: userId,
  };

  if (input.name !== undefined) updates.name = input.name;
  if (input.status !== undefined) updates.status = input.status;
  if (input.trigger_type !== undefined) updates.trigger_type = input.trigger_type;
  if (input.trigger_options !== undefined) {
    updates.trigger_options = input.trigger_options ? JSON.stringify(input.trigger_options) : null;
  }
  if (input.accountability !== undefined) updates.accountability = input.accountability;
  if (input.operation !== undefined) updates.operation = input.operation;

  await db('cms_flows').where({ id: flowId }).update(updates);
  const flow = await getFlowById(db, flowId);
  if (!flow) {
    throw new AppError('Flow not found', 404, 'NOT_FOUND');
  }
  return flow;
}

export async function deleteFlow(db: Knex, flowId: string): Promise<void> {
  const deleted = await db('cms_flows').where({ id: flowId }).delete();
  if (!deleted) {
    throw new AppError('Flow not found', 404, 'NOT_FOUND');
  }
}

export async function listFlowLogs(db: Knex, flowId: string, limit = 25) {
  const rows = await db('cms_flow_logs')
    .where({ flow: flowId })
    .orderBy('started_at', 'desc')
    .limit(limit);

  return rows.map((row) => ({
    id: String(row.id),
    flow: String(row.flow),
    status: String(row.status),
    started_at: String(row.started_at),
    finished_at: row.finished_at ? String(row.finished_at) : null,
    execution_time: row.execution_time !== null ? Number(row.execution_time) : null,
    trigger_log: parseJsonColumn(row.trigger_log as never),
    operations_log: parseJsonColumn(row.operations_log as never),
  }));
}

export async function listActiveFlowsByTrigger(
  db: Knex,
  triggerType: FlowRow['trigger_type'],
): Promise<FlowRow[]> {
  const rows = await db('cms_flows').where({ trigger_type: triggerType, status: 'active' });
  return rows.map((row) => normalizeFlowRow(row as Record<string, unknown>));
}
