import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import type { Knex } from 'knex';
import { parseJsonColumn } from '../../core/field.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { FlowOperationRow, FlowOperationType, FlowRow } from '../../types/flow.js';
import { normalizeFlowRow, normalizeOperationRow } from './normalize.js';

export interface SaveFlowGraphOperationInput {
  id?: string;
  key: string;
  name?: string | null;
  type: FlowOperationType;
  options?: Record<string, unknown> | null;
  resolve?: string | null;
  reject?: string | null;
  position_x: number;
  position_y: number;
}

export interface SaveFlowGraphInput {
  flow?: Partial<{
    name: string;
    status: FlowRow['status'];
    trigger_type: FlowRow['trigger_type'];
    trigger_options: Record<string, unknown> | null;
    accountability: FlowRow['accountability'];
    operation: string | null;
  }>;
  operations: SaveFlowGraphOperationInput[];
  entry_operation?: string | null;
}

export class FlowGraphValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

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

  const operations = await getFlowOperations(db, flowId);
  if (flow.status === 'active') {
    validateFlowForActivation(flow, operations);
  }

  return { flow, operations };
}

function eventScopes(options: Record<string, unknown> | null | undefined): string[] {
  const scope = options?.scope;
  if (Array.isArray(scope)) {
    return scope.map(String).filter(Boolean);
  }
  if (typeof scope === 'string' && scope.trim()) {
    return [scope.trim()];
  }
  return [];
}

export function validateFlowForActivation(flow: FlowRow, operations: FlowOperationRow[]): void {
  if (!flow.operation) {
    throw new FlowGraphValidationError('Flow must have an entry operation before activation');
  }

  const entryExists = operations.some((op) => op.id === flow.operation);
  if (!entryExists) {
    throw new FlowGraphValidationError('Entry operation is missing from the flow graph');
  }

  if (flow.trigger_type === 'event') {
    const scopes = eventScopes(flow.trigger_options);
    if (scopes.length === 0) {
      throw new FlowGraphValidationError('Event flows require at least one scope before activation');
    }
  }

  if (flow.trigger_type === 'schedule') {
    const cronExpr = flow.trigger_options?.cron;
    if (typeof cronExpr !== 'string' || !cronExpr.trim()) {
      throw new FlowGraphValidationError('Schedule flows require a cron expression before activation');
    }
    if (!cron.validate(cronExpr.trim())) {
      throw new FlowGraphValidationError('Schedule flows require a valid cron expression');
    }
  }
}

export function validateFlowGraph(
  operations: SaveFlowGraphOperationInput[],
  entryKey: string | null | undefined,
): void {
  if (!operations.length) {
    throw new FlowGraphValidationError('Flow must include at least one operation');
  }

  const keys = new Set<string>();
  for (const op of operations) {
    if (!op.key.trim()) {
      throw new FlowGraphValidationError('Each operation must have a key');
    }
    if (keys.has(op.key)) {
      throw new FlowGraphValidationError(`Duplicate operation key "${op.key}"`);
    }
    keys.add(op.key);
  }

  const refSet = new Set<string>([...keys]);
  for (const op of operations) {
    if (op.id) {
      refSet.add(op.id);
    }
  }

  for (const op of operations) {
    for (const edge of [op.resolve, op.reject]) {
      if (edge && !refSet.has(edge)) {
        throw new FlowGraphValidationError(
          `Operation "${op.key}" references unknown target "${edge}"`,
        );
      }
    }
  }

  const resolvedEntry = entryKey?.trim();
  if (!resolvedEntry) {
    throw new FlowGraphValidationError('Flow must specify an entry operation');
  }
  if (!keys.has(resolvedEntry) && !operations.some((op) => op.id === resolvedEntry)) {
    throw new FlowGraphValidationError(`Entry operation "${resolvedEntry}" was not found`);
  }

  const entryId = operations.find((op) => op.key === resolvedEntry || op.id === resolvedEntry)?.key;
  if (!entryId) {
    throw new FlowGraphValidationError(`Entry operation "${resolvedEntry}" was not found`);
  }

  const keyToOp = new Map(operations.map((op) => [op.key, op]));
  const visited = new Set<string>();
  const stack = new Set<string>();

  function resolveNext(key: string): string[] {
    const op = keyToOp.get(key);
    if (!op) {
      return [];
    }
    const next: string[] = [];
    for (const target of [op.resolve, op.reject]) {
      if (!target) {
        continue;
      }
      const byKey = keyToOp.get(target);
      if (byKey) {
        next.push(byKey.key);
        continue;
      }
      const byId = operations.find((entry) => entry.id === target);
      if (byId) {
        next.push(byId.key);
      }
    }
    return next;
  }

  function walk(key: string): void {
    if (stack.has(key)) {
      throw new FlowGraphValidationError(`Cycle detected involving operation "${key}"`);
    }
    if (visited.has(key)) {
      return;
    }
    stack.add(key);
    visited.add(key);
    for (const next of resolveNext(key)) {
      walk(next);
    }
    stack.delete(key);
  }

  walk(entryId);

  const reachable = visited;
  const orphans = operations.filter((op) => !reachable.has(op.key));
  if (orphans.length > 0) {
    throw new FlowGraphValidationError(
      `Unreachable operations: ${orphans.map((op) => op.key).join(', ')}`,
    );
  }
}

export async function saveFlowGraph(
  db: Knex,
  flowId: string,
  input: SaveFlowGraphInput,
  userId: string | null,
): Promise<{ flow: FlowRow; operations: FlowOperationRow[] }> {
  const existing = await getFlowById(db, flowId);
  if (!existing) {
    throw new AppError('Flow not found', 404, 'NOT_FOUND');
  }

  const entryKey =
    input.entry_operation ??
    input.flow?.operation ??
    input.operations[0]?.key ??
    null;

  validateFlowGraph(input.operations, entryKey);

  const now = new Date().toISOString();

  return db.transaction(async (trx) => {
    const existingOps = await trx('cms_flow_operations').where({ flow: flowId });
    const existingIds = new Set(existingOps.map((row) => String(row.id)));
    const incomingIds = new Set(
      input.operations.map((op) => op.id).filter((id): id is string => Boolean(id)),
    );

    const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id));
    if (idsToDelete.length > 0) {
      await trx('cms_flow_operations').whereIn('id', idsToDelete).delete();
    }

    const keyToId = new Map<string, string>();

    for (const op of input.operations) {
      const opId = op.id && existingIds.has(op.id) ? op.id : uuidv4();
      keyToId.set(op.key, opId);

      const row = {
        id: opId,
        flow: flowId,
        key: op.key,
        name: op.name ?? op.key,
        type: op.type,
        options: op.options ? JSON.stringify(op.options) : null,
        resolve: null as string | null,
        reject: null as string | null,
        position_x: op.position_x,
        position_y: op.position_y,
        date_updated: now,
      };

      if (op.id && existingIds.has(op.id)) {
        await trx('cms_flow_operations').where({ id: opId }).update(row);
      } else {
        await trx('cms_flow_operations').insert({
          ...row,
          date_created: now,
        });
      }
    }

    for (const op of input.operations) {
      const opId = keyToId.get(op.key);
      if (!opId) {
        continue;
      }

      const resolveId = op.resolve
        ? keyToId.get(op.resolve) ?? (existingIds.has(op.resolve) ? op.resolve : null)
        : null;
      const rejectId = op.reject
        ? keyToId.get(op.reject) ?? (existingIds.has(op.reject) ? op.reject : null)
        : null;

      await trx('cms_flow_operations').where({ id: opId }).update({
        resolve: resolveId,
        reject: rejectId,
      });
    }

    const entryOpId =
      keyToId.get(entryKey ?? '') ??
      (entryKey && existingIds.has(entryKey) ? entryKey : null);

    const flowUpdates: Record<string, unknown> = {
      operation: entryOpId,
      date_updated: now,
      user_updated: userId,
    };

    if (input.flow?.name !== undefined) flowUpdates.name = input.flow.name;
    if (input.flow?.status !== undefined) flowUpdates.status = input.flow.status;
    if (input.flow?.trigger_type !== undefined) flowUpdates.trigger_type = input.flow.trigger_type;
    if (input.flow?.trigger_options !== undefined) {
      flowUpdates.trigger_options = input.flow.trigger_options
        ? JSON.stringify(input.flow.trigger_options)
        : null;
    }
    if (input.flow?.accountability !== undefined) {
      flowUpdates.accountability = input.flow.accountability;
    }

    await trx('cms_flows').where({ id: flowId }).update(flowUpdates);

    const flow = await getFlowById(trx, flowId);
    if (!flow) {
      throw new AppError('Flow not found', 404, 'NOT_FOUND');
    }

    const operations = await getFlowOperations(trx, flowId);

    if (flow.status === 'active') {
      validateFlowForActivation(flow, operations);
    }

    return { flow, operations };
  });
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

  if (input.status === 'active') {
    const operations = await getFlowOperations(db, flowId);
    const candidate: FlowRow = {
      ...existing,
      ...input,
      trigger_type: input.trigger_type ?? existing.trigger_type,
      trigger_options:
        input.trigger_options !== undefined ? input.trigger_options : existing.trigger_options,
      operation: input.operation !== undefined ? input.operation : existing.operation,
    };
    validateFlowForActivation(candidate, operations);
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

export async function getFlowLogById(db: Knex, flowId: string, logId: string) {
  const row = await db('cms_flow_logs').where({ id: logId, flow: flowId }).first();
  if (!row) {
    throw new AppError('Flow log not found', 404, 'NOT_FOUND');
  }

  return {
    id: String(row.id),
    flow: String(row.flow),
    status: String(row.status),
    started_at: String(row.started_at),
    finished_at: row.finished_at ? String(row.finished_at) : null,
    execution_time: row.execution_time !== null ? Number(row.execution_time) : null,
    trigger_log: parseJsonColumn(row.trigger_log as never),
    operations_log: parseJsonColumn(row.operations_log as never),
  };
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
