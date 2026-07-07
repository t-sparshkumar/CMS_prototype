import type { Knex } from 'knex';
import type { PermissionAction } from './permission.js';

export interface PolicyRule {
  collection: string;
  action: PermissionAction;
  fields?: string[] | '*';
  permissions?: Record<string, unknown> | null;
}

export interface CmsPolicyRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rules: PolicyRule[] | string;
  is_system: boolean;
}

export interface PolicyMeta {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rules: PolicyRule[];
  is_system: boolean;
  role_count: number;
}

export interface CreatePolicyInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  rules: PolicyRule[];
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  rules?: PolicyRule[];
}

export interface RoleWithStats {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  admin_access: boolean;
  app_access: boolean;
  user_count: number;
  policy_count: number;
  policy_ids: string[];
}
