import { v4 as uuidv4 } from 'uuid';
import type { Knex } from 'knex';
import { parseJsonColumn } from '../../core/field.js';
import type {
  DataChain,
  FlowLogStatus,
  FlowOperationLogEntry,
  FlowOperationRow,
  FlowRow,
  FlowRunResult,
  FlowTriggerPayload,
} from '../../types/flow.js';
import { appendLast, createDataChain } from './data-chain.js';
import { executeOperation } from './operation-runner.js';
import { getFlowById, getFlowOperations, loadAllowedEnv } from './flows.service.js';
import { normalizeFlowRow, normalizeOperationRow } from './normalize.js';

const MAX_STEPS = Number(process.env.FLOW_MAX_STEPS ?? 100);
const MAX_RUNTIME_MS = Number(process.env.FLOW_MAX_TIMEOUT_MS ?? 30_000);

export class FlowRunner {
  private readonly db: Knex;
  private readonly depth: number;

  constructor(db: Knex, depth = 0) {
    this.db = db;
    this.depth = depth;
  }

  async run(flowId: string, trigger: FlowTriggerPayload, userId: string | null = null): Promise<FlowRunResult> {
    if (this.depth > 5) {
      throw new Error('Maximum nested flow depth exceeded');
    }

    const flow = await getFlowById(this.db, flowId);
    if (!flow || flow.status !== 'active') {
      throw new Error(`Flow "${flowId}" is not active`);
    }
    if (trigger.type === 'operation' && flow.trigger_type !== 'operation') {
      throw new Error(
        `Flow "${flow.name}" must use the "Another Flow" trigger type to be invoked from another flow`,
      );
    }

    const operations = await getFlowOperations(this.db, flowId);
    const operationMap = new Map(operations.map((op) => [op.id, op]));
    const entryId = flow.operation;
    if (!entryId || !operationMap.has(entryId)) {
      throw new Error(`Flow "${flowId}" has no entry operation`);
    }

    const logId = uuidv4();
    const startedAt = Date.now();
    const triggerLog = { ...trigger };
    const operationsLog: FlowOperationLogEntry[] = [];

    await this.db('cms_flow_logs').insert({
      id: logId,
      flow: flowId,
      status: 'running',
      started_at: new Date().toISOString(),
      trigger_log: JSON.stringify(triggerLog),
      operations_log: JSON.stringify([]),
    });

    const env = loadAllowedEnv();
    let accountability = trigger.accountability ?? { user: userId, role: null as string | null };
    if (userId && !accountability.role) {
      const userRow = await this.db('cms_users').where({ id: userId }).first<{ role: string }>();
      if (userRow?.role) {
        accountability = { ...accountability, role: userRow.role };
      }
    }

    let chain: DataChain = createDataChain(
      {
        ...trigger,
        accountability,
      },
      env,
    );
    chain.$accountability = accountability;

    let currentId: string | null = entryId;
    let steps = 0;
    let lastOutput: unknown = null;
    let success = true;
    let errorMessage: string | undefined;
    const visited = new Set<string>();

    try {
      while (currentId) {
        if (steps >= MAX_STEPS) {
          throw new Error(`Flow exceeded maximum step count (${MAX_STEPS})`);
        }
        if (Date.now() - startedAt > MAX_RUNTIME_MS) {
          throw new Error(`Flow exceeded maximum runtime (${MAX_RUNTIME_MS}ms)`);
        }
        if (visited.has(currentId)) {
          throw new Error(`Infinite loop detected at operation "${currentId}"`);
        }
        visited.add(currentId);
        steps += 1;

        const operation = operationMap.get(currentId);
        if (!operation) {
          throw new Error(`Operation "${currentId}" not found`);
        }

        const stepStarted = Date.now();
        const result = await executeOperation(this.db, operation, chain, {
          userId,
          accountabilityMode: flow.accountability,
          triggerAccountability: accountability,
          triggerFlow: async (nestedFlowId, payload) => {
            const nested = new FlowRunner(this.db, this.depth + 1);
            const nestedResult = await nested.run(
              nestedFlowId,
              { type: 'operation', payload, accountability: trigger.accountability },
              userId,
            );
            return nestedResult.lastOutput;
          },
        });

        lastOutput = result.output;
        chain = appendLast(chain, result.output);

        operationsLog.push({
          operation_id: operation.id,
          operation_key: operation.key,
          operation_type: operation.type,
          status: result.success ? 'success' : 'failed',
          branch: result.branch,
          input: (operation.options ?? {}) as Record<string, unknown>,
          output: result.output,
          error: result.error,
          duration_ms: Date.now() - stepStarted,
        });

        if (!result.success) {
          success = false;
          errorMessage = result.error;
          currentId = operation.reject;
          if (!currentId) {
            break;
          }
          continue;
        }

        const branch = result.branch === 'none' ? 'resolve' : result.branch;
        currentId = branch === 'reject' ? operation.reject : operation.resolve;
      }
    } catch (err) {
      success = false;
      errorMessage = err instanceof Error ? err.message : 'Flow execution failed';
    }

    const executionTime = Date.now() - startedAt;
    const status: FlowLogStatus = success ? 'completed' : 'failed';

    await this.db('cms_flow_logs').where({ id: logId }).update({
      status,
      finished_at: new Date().toISOString(),
      execution_time: executionTime,
      operations_log: JSON.stringify(operationsLog),
    });

    return {
      success,
      dataChain: chain,
      lastOutput,
      logId,
      error: errorMessage,
    };
  }
}

export { normalizeFlowRow, normalizeOperationRow } from './normalize.js';
