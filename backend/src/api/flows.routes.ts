import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  createFlow,
  deleteFlow,
  getFlowById,
  getFlowLogById,
  getFlowOperations,
  listFlowLogs,
  listFlows,
  saveFlowGraph,
  updateFlow,
} from '../services/flows/flows.service.js';
import { refreshFlowSchedules } from '../services/flows/cron-scheduler.js';
import {
  isWebhookMethodAllowed,
  runManualFlow,
  runWebhookFlow,
} from '../services/flows/trigger.service.js';

export const flowsRouter = Router();

flowsRouter.use(requireAuth);
flowsRouter.use(requireAdmin);

flowsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const flows = await listFlows(db);
    res.json(success(flows));
  } catch (err) {
    next(err);
  }
});

flowsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = await createFlow(db, req.body, req.user?.id ?? null);
    await refreshFlowSchedules(db);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
});

flowsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const flow = await getFlowById(db, String(req.params.id));
    if (!flow) {
      res.status(404).json({ errors: [{ message: 'Flow not found' }] });
      return;
    }
    const operations = await getFlowOperations(db, flow.id);
    res.json(success({ flow, operations }));
  } catch (err) {
    next(err);
  }
});

flowsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const flow = await updateFlow(db, String(req.params.id), req.body, req.user?.id ?? null);
    await refreshFlowSchedules(db);
    res.json(success(flow));
  } catch (err) {
    next(err);
  }
});

flowsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    await deleteFlow(db, String(req.params.id));
    await refreshFlowSchedules(db);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
});

flowsRouter.put('/:id/graph', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = await saveFlowGraph(db, String(req.params.id), req.body, req.user?.id ?? null);
    await refreshFlowSchedules(db);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

flowsRouter.get('/:id/logs/:logId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const log = await getFlowLogById(db, String(req.params.id), String(req.params.logId));
    res.json(success(log));
  } catch (err) {
    next(err);
  }
});

flowsRouter.get('/:id/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const logs = await listFlowLogs(db, String(req.params.id));
    res.json(success(logs));
  } catch (err) {
    next(err);
  }
});

flowsRouter.post('/:id/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = await runManualFlow(
      db,
      String(req.params.id),
      (req.body ?? {}) as Record<string, unknown>,
      req.user?.id ?? null,
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

export const flowWebhooksRouter = Router();

flowWebhooksRouter.all('/:flowId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const flowId = String(req.params.flowId);
    const flow = await getFlowById(db, flowId);
    if (!flow || flow.status !== 'active' || flow.trigger_type !== 'webhook') {
      res.status(404).json({ errors: [{ message: 'Webhook flow not found or inactive' }] });
      return;
    }

    const secret = flow.trigger_options?.secret;
    if (typeof secret === 'string' && secret.length > 0) {
      const authHeader = req.headers.authorization ?? '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      if (bearer !== secret && token !== secret) {
        res.status(401).json({ errors: [{ message: 'Invalid webhook secret' }] });
        return;
      }
    }

    if (!isWebhookMethodAllowed(req.method, flow.trigger_options ?? undefined)) {
      res.status(405).json({ errors: [{ message: `HTTP method ${req.method} is not allowed for this webhook` }] });
      return;
    }

    const result = await runWebhookFlow(db, flowId, {
      method: req.method,
      body: req.body,
      query: req.query as Record<string, string>,
      headers: req.headers as Record<string, string>,
    });
    res.json(success(result.lastOutput ?? result));
  } catch (err) {
    next(err);
  }
});
