import type { Knex } from 'knex';
import type { FlowRow, FlowTriggerPayload } from '../../types/flow.js';
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

function matchesEventFlow(flow: FlowRow, context: EventContext): boolean {
  const options = flow.trigger_options ?? {};
  const type = String(options.type ?? 'action') as EventHookType;
  if (type !== context.hook) {
    return false;
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
): Promise<{ payload?: Record<string, unknown> }> {
  const flows = await listActiveFlowsByTrigger(db, 'event');
  const matching = flows.filter((flow) => matchesEventFlow(flow, context));

  let payload = context.payload ? { ...context.payload } : undefined;

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
      if (result.dataChain.$last && typeof result.dataChain.$last === 'object') {
        payload = {
          ...(payload ?? {}),
          ...(result.dataChain.$last as Record<string, unknown>),
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

  return { payload };
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
    throw new Error('Manual flow not found or inactive');
  }
  if (!matchesManualFlow(flow, typeof payload.collection === 'string' ? payload.collection : undefined)) {
    throw new Error('Flow is not configured for this collection');
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
    throw new Error('Webhook flow not found or inactive');
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

export async function runScheduledFlows(db: Knex): Promise<void> {
  const flows = await listActiveFlowsByTrigger(db, 'schedule');
  for (const flow of flows) {
    const runner = new FlowRunner(db);
    void runner
      .run(flow.id, {
        type: 'schedule',
        payload: {
          cron: flow.trigger_options?.cron ?? null,
          timestamp: new Date().toISOString(),
        },
      })
      .catch((err) => {
        console.error(`[flows] scheduled flow "${flow.name}" failed`, err);
      });
  }
}

export async function runOperationTriggeredFlows(db: Knex, flowId: string, payload: Record<string, unknown>) {
  const runner = new FlowRunner(db);
  return runner.run(flowId, { type: 'operation', payload });
}
