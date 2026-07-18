import type { Knex } from 'knex';
import type { FlowRow, FlowTriggerPayload } from '../../types/flow.js';
import { AppError } from '../../middleware/errorHandler.js';
import { FlowRunner } from './flow-runner.js';
import { listActiveFlowsByTrigger } from './flows.service.js';

type EventHookType = 'filter' | 'action';
type EventAction = 'create' | 'update' | 'delete';

interface EventContext {
  collection: string;
  event: EventAction;
  hook: EventHookType;
  keys?: string[];
  payload?: Record<string, unknown>;
  accountability?: {
    user: string | null;
    role: string | null;
  };
}

const DEFAULT_WEBHOOK_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function parseWebhookMethods(options: Record<string, unknown> | null | undefined): string[] {
  const raw = options?.methods;
  if (typeof raw !== 'string' || !raw.trim()) {
    return DEFAULT_WEBHOOK_METHODS;
  }
  return raw
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

export function isWebhookMethodAllowed(
  method: string,
  options: Record<string, unknown> | null | undefined,
): boolean {
  return parseWebhookMethods(options).includes(method.toUpperCase());
}

export function matchesEventFlow(flow: FlowRow, context: EventContext): boolean {
  const options = flow.trigger_options ?? {};
  const type = String(options.type ?? 'action') as EventHookType;
  if (type !== context.hook) {
    return false;
  }

  const collections = options.collections;
  if (Array.isArray(collections) && collections.length > 0) {
    if (!collections.map(String).includes(context.collection)) {
      return false;
    }
  }

  const scope = options.scope;
  const scopes = Array.isArray(scope) ? scope.map(String) : scope ? [String(scope)] : [];
  if (scopes.length === 0) {
    return true;
  }

  const eventKey = `items.${context.event}`;
  const collectionKey = `${context.collection}.${context.event}`;
  return scopes.some((entry) => entry === eventKey || entry === collectionKey || entry === context.collection);
}

function matchesManualFlow(flow: FlowRow, collection?: string): boolean {
  if (!collection) {
    return true;
  }
  const options = flow.trigger_options ?? {};
  const collections = options.collections;
  if (!Array.isArray(collections) || collections.length === 0) {
    return true;
  }
  return collections.map(String).includes(collection);
}

export async function runEventFlows(
  db: Knex,
  context: EventContext,
): Promise<{ payload?: Record<string, unknown>; blocked?: boolean }> {
  const flows = await listActiveFlowsByTrigger(db, 'event');
  const matching = flows.filter((flow) => matchesEventFlow(flow, context));

  let payload = context.payload ? { ...context.payload } : undefined;
  let blocked = false;

  for (const flow of matching) {
    const trigger: FlowTriggerPayload = {
      type: 'event',
      collection: context.collection,
      event: context.event,
      hook: context.hook,
      keys: context.keys,
      payload,
      accountability: context.accountability,
    };

    if (context.hook === 'filter') {
      const runner = new FlowRunner(db);
      const result = await runner.run(flow.id, trigger, context.accountability?.user ?? null);
      if (!result.success) {
        blocked = true;
        continue;
      }
      if (result.dataChain.$last && typeof result.dataChain.$last === 'object') {
        const last = result.dataChain.$last as Record<string, unknown>;
        if (
          last._block === true ||
          last.block === true ||
          last.blocked === true ||
          last.allow === false ||
          last.cancel === true
        ) {
          blocked = true;
          continue;
        }
        payload = {
          ...(payload ?? {}),
          ...last,
        };
      }
    } else {
      void new FlowRunner(db)
        .run(flow.id, trigger, context.accountability?.user ?? null)
        .catch((err) => {
          console.error(`[flows] async event flow "${flow.name}" failed`, err);
        });
    }
  }

  return { payload, blocked: blocked || undefined };
}

export async function runManualFlow(
  db: Knex,
  flowId: string,
  payload: Record<string, unknown>,
  userId: string | null,
) {
  const flow = await listActiveFlowsByTrigger(db, 'manual').then((flows) =>
    flows.find((entry) => entry.id === flowId),
  );
  if (!flow) {
    throw new AppError('Manual flow not found or inactive', 404, 'NOT_FOUND');
  }
  if (!matchesManualFlow(flow, typeof payload.collection === 'string' ? payload.collection : undefined)) {
    throw new AppError('Flow is not configured for this collection', 403, 'FORBIDDEN');
  }

  const runner = new FlowRunner(db);
  return runner.run(
    flowId,
    {
      type: 'manual',
      payload,
      accountability: { user: userId, role: null },
    },
    userId,
  );
}

export async function runWebhookFlow(
  db: Knex,
  flowId: string,
  input: {
    method: string;
    body?: unknown;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  },
) {
  const { getFlowById } = await import('./flows.service.js');
  const flow = await getFlowById(db, flowId);
  if (!flow || flow.status !== 'active' || flow.trigger_type !== 'webhook') {
    throw new AppError('Webhook flow not found or inactive', 404, 'NOT_FOUND');
  }

  const runner = new FlowRunner(db);
  return runner.run(flowId, {
    type: 'webhook',
    body: input.body,
    query: input.query,
    headers: input.headers,
    payload: {
      method: input.method,
      body: input.body,
      query: input.query,
      headers: input.headers,
    },
  });
}

export async function runOperationTriggeredFlows(db: Knex, flowId: string, payload: Record<string, unknown>) {
  const runner = new FlowRunner(db);
  return runner.run(flowId, { type: 'operation', payload });
}
