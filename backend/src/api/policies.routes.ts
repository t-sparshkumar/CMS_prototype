import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { success } from '../core/response.js';
import { getDb } from '../db/knex.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { logActivity } from '../services/activity.service.js';
import {
  createPolicy,
  deletePolicy,
  getRolePolicyIds,
  listPolicies,
  setRolePolicies,
  updatePolicy,
} from '../services/policies.service.js';
import type { PolicyRule } from '../types/policy.js';

export const policiesRouter = Router();

policiesRouter.use(requireAuth, requireAdmin);

policiesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const policies = await listPolicies(db);
    res.json(success(policies, { total_count: policies.length, filter_count: policies.length }));
  } catch (err) {
    next(err);
  }
});

policiesRouter.get('/roles/:roleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const policyIds = await getRolePolicyIds(db, String(req.params.roleId));
    res.json(success(policyIds));
  } catch (err) {
    next(err);
  }
});

policiesRouter.put('/roles/:roleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const roleId = String(req.params.roleId);
    const policyIds = Array.isArray(req.body.policy_ids)
      ? req.body.policy_ids.map(String)
      : [];
    const saved = await setRolePolicies(db, roleId, policyIds);
    const role = await db('cms_roles').where({ id: roleId }).first();
    await logActivity(db, {
      action: 'update',
      user: req.user?.id ?? null,
      collection: 'cms_roles',
      item: roleId,
      comment: `Updated policies for role ${role?.name ?? roleId}`,
    });
    res.json(success(saved));
  } catch (err) {
    next(err);
  }
});

policiesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const policy = await createPolicy(db, {
      name: String(req.body.name ?? ''),
      description: req.body.description !== undefined ? String(req.body.description) : null,
      icon: req.body.icon !== undefined ? String(req.body.icon) : null,
      rules: Array.isArray(req.body.rules) ? (req.body.rules as PolicyRule[]) : [],
    });
    await logActivity(db, {
      action: 'create',
      user: req.user?.id ?? null,
      collection: 'cms_policies',
      item: policy.id,
      comment: `Created policy ${policy.name}`,
    });
    res.status(201).json(success(policy));
  } catch (err) {
    next(err);
  }
});

policiesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const policy = await updatePolicy(db, String(req.params.id), {
      name: req.body.name !== undefined ? String(req.body.name) : undefined,
      description: req.body.description !== undefined ? String(req.body.description) : undefined,
      icon: req.body.icon !== undefined ? String(req.body.icon) : undefined,
      rules: Array.isArray(req.body.rules) ? (req.body.rules as PolicyRule[]) : undefined,
    });
    await logActivity(db, {
      action: 'update',
      user: req.user?.id ?? null,
      collection: 'cms_policies',
      item: policy.id,
      comment: `Updated policy ${policy.name}`,
    });
    res.json(success(policy));
  } catch (err) {
    next(err);
  }
});

policiesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const policyId = String(req.params.id);
    const existing = await db('cms_policies').where({ id: policyId }).first();
    await deletePolicy(db, policyId);
    await logActivity(db, {
      action: 'delete',
      user: req.user?.id ?? null,
      collection: 'cms_policies',
      item: policyId,
      comment: `Deleted policy ${existing?.name ?? policyId}`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
