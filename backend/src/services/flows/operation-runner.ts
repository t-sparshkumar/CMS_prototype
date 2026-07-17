import vm from 'node:vm';
import type { Knex } from 'knex';
import type { AccessContext, PermissionAction } from '../../types/permission.js';
import type { DataChain, FlowOperationRow, OperationRunResult } from '../../types/flow.js';
import { evaluateConditionFilter } from './condition-evaluator.js';
import { parseTemplates } from './data-chain.js';
import { getEnv } from '../../config/env.js';

const SCRIPT_TIMEOUT_MS = 5_000;

function systemAccess(collection: string, action: PermissionAction): AccessContext {
  return {
    allowed: true,
    fullAccess: true,
    roleId: 'system',
    action,
    collection,
    allowedFields: '*',
    rowFilter: {},
  };
}

async function runItemRead(
  db: Knex,
  options: Record<string, unknown>,
  chain: DataChain,
): Promise<unknown> {
  const collection = String(options.collection ?? '');
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;

  if (parsed.id || parsed.key) {
    const id = String(parsed.id ?? parsed.key);
    const { getItem } = await import('../items.service.js');
    return getItem(db, collection, id, null, null, systemAccess(collection, 'read'));
  }

  const query = (parsed.query ?? {}) as Record<string, unknown>;
  const limit = typeof query.limit === 'number' ? query.limit : 100;
  const { listItems } = await import('../items.service.js');
  const result = await listItems(
    db,
    collection,
    {
      filter: (query.filter ?? {}) as never,
      sort: [],
      limit,
      offset: 0,
      fields: null,
      fieldsRaw: null,
      search: null,
      includeArchived: true,
    },
    systemAccess(collection, 'read'),
  );
  return result.items;
}

async function runItemCreate(
  db: Knex,
  options: Record<string, unknown>,
  chain: DataChain,
  userId: string | null,
): Promise<unknown> {
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;
  const collection = String(parsed.collection ?? '');
  const payload = (parsed.payload ?? {}) as Record<string, unknown>;
  const { createItem } = await import('../items.service.js');
  return createItem(db, collection, payload, userId, systemAccess(collection, 'create'));
}

async function runItemUpdate(
  db: Knex,
  options: Record<string, unknown>,
  chain: DataChain,
  userId: string | null,
): Promise<unknown> {
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;
  const collection = String(parsed.collection ?? '');
  const key = String(parsed.key ?? parsed.id ?? '');
  const payload = (parsed.payload ?? {}) as Record<string, unknown>;
  const { updateItem } = await import('../items.service.js');
  return updateItem(db, collection, key, payload, userId, systemAccess(collection, 'update'));
}

async function runItemDelete(
  db: Knex,
  options: Record<string, unknown>,
  chain: DataChain,
  userId: string | null,
): Promise<unknown> {
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;
  const collection = String(parsed.collection ?? '');
  const key = String(parsed.key ?? parsed.id ?? '');
  const { deleteItem } = await import('../items.service.js');
  await deleteItem(db, collection, key, userId, systemAccess(collection, 'delete'));
  return { deleted: key };
}

async function runRequest(options: Record<string, unknown>, chain: DataChain): Promise<unknown> {
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;
  const url = String(parsed.url ?? '');
  const method = String(parsed.method ?? 'GET').toUpperCase();
  const headers = (parsed.headers ?? {}) as Record<string, string>;
  const body = parsed.body;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  return {
    status: response.status,
    statusText: response.statusText,
    data,
  };
}

function runExec(options: Record<string, unknown>, chain: DataChain): unknown {
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;
  const code = String(parsed.code ?? '');

  const sandbox = {
    data: chain,
    $trigger: chain.$trigger,
    $last: chain.$last,
    $env: chain.$env,
    module: { exports: {} as Record<string, unknown> },
    exports: {} as Record<string, unknown>,
    console,
    JSON,
    Math,
    Date,
  };

  const script = new vm.Script(code);
  const context = vm.createContext(sandbox);
  script.runInContext(context, { timeout: SCRIPT_TIMEOUT_MS });

  return sandbox.module.exports.default ?? sandbox.module.exports ?? null;
}

async function runMail(options: Record<string, unknown>, chain: DataChain): Promise<unknown> {
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;
  const to = String(parsed.to ?? '');
  const subject = String(parsed.subject ?? '');
  const body = String(parsed.body ?? parsed.text ?? '');

  const env = getEnv();
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    console.info('[flow:mail]', { to, subject, body: body.slice(0, 200) });
    return { queued: false, logged: true, to, subject };
  }

  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM ?? `cms@${env.ADMIN_UI_URL}`,
    to,
    subject,
    text: body,
    html: typeof parsed.html === 'string' ? parsed.html : undefined,
  });

  return { messageId: info.messageId, accepted: info.accepted };
}

function runLog(options: Record<string, unknown>, chain: DataChain): unknown {
  const parsed = parseTemplates(options, chain) as Record<string, unknown>;
  const message = parsed.message ?? parsed;
  console.info('[flow:log]', message);
  return message;
}

export async function executeOperation(
  db: Knex,
  operation: FlowOperationRow,
  chain: DataChain,
  context: {
    userId: string | null;
    triggerFlow: (flowId: string, payload: Record<string, unknown>) => Promise<unknown>;
  },
): Promise<OperationRunResult> {
  const options = (operation.options ?? {}) as Record<string, unknown>;
  const parsedOptions = parseTemplates(options, chain) as Record<string, unknown>;

  try {
    switch (operation.type) {
      case 'condition': {
        const filter = (parsedOptions.filter ?? {}) as Record<string, unknown>;
        const passed = evaluateConditionFilter(filter as never, chain);
        return {
          success: true,
          output: { passed },
          branch: passed ? 'resolve' : 'reject',
        };
      }

      case 'item-read': {
        const output = await runItemRead(db, parsedOptions, chain);
        return { success: true, output, branch: 'resolve' };
      }

      case 'item-create': {
        const output = await runItemCreate(db, parsedOptions, chain, context.userId);
        return { success: true, output, branch: 'resolve' };
      }

      case 'item-update': {
        const output = await runItemUpdate(db, parsedOptions, chain, context.userId);
        return { success: true, output, branch: 'resolve' };
      }

      case 'item-delete': {
        const output = await runItemDelete(db, parsedOptions, chain, context.userId);
        return { success: true, output, branch: 'resolve' };
      }

      case 'request': {
        const output = await runRequest(parsedOptions, chain);
        return { success: true, output, branch: 'resolve' };
      }

      case 'exec': {
        const output = runExec(parsedOptions, chain);
        return { success: true, output, branch: 'resolve' };
      }

      case 'mail': {
        const output = await runMail(parsedOptions, chain);
        return { success: true, output, branch: 'resolve' };
      }

      case 'trigger': {
        const flowId = String(parsedOptions.flow ?? '');
        const payload = (parsedOptions.payload ?? chain.$trigger) as Record<string, unknown>;
        const iterationMode = String(parsedOptions.iterationMode ?? 'serial');
        const batch = parsedOptions.batch;

        if (Array.isArray(batch) && iterationMode === 'serial') {
          const results: unknown[] = [];
          for (const entry of batch) {
            const result = await context.triggerFlow(flowId, {
              ...payload,
              iteration: entry,
            });
            results.push(result);
          }
          return { success: true, output: results, branch: 'resolve' };
        }

        const output = await context.triggerFlow(flowId, payload);
        return { success: true, output, branch: 'resolve' };
      }

      case 'log': {
        const output = runLog(parsedOptions, chain);
        return { success: true, output, branch: 'resolve' };
      }

      default:
        return {
          success: false,
          output: null,
          branch: 'reject',
          error: `Unsupported operation type "${operation.type}"`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return {
      success: false,
      output: null,
      branch: 'reject',
      error: message,
    };
  }
}
