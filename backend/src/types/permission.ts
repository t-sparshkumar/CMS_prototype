import type { FilterOperator } from './item.js';

export const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface CmsPermissionRow {
  id: number;
  role: string;
  collection: string;
  action: PermissionAction;
  permissions: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  presets: Record<string, unknown> | null;
  fields: string[] | null;
}

export type PermissionFilter = Record<string, Partial<Record<FilterOperator, string | string[]>>>;

export interface AccessContext {
  allowed: boolean;
  fullAccess: boolean;
  roleId: string;
  action: PermissionAction;
  collection: string;
  allowedFields: string[] | '*';
  rowFilter: PermissionFilter;
}

export interface CreatePermissionInput {
  role: string;
  collection: string;
  action: PermissionAction;
  fields?: string[] | '*';
  permissions?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  presets?: Record<string, unknown> | null;
}

export interface PermissionMeta {
  id: number;
  role: string;
  collection: string;
  action: PermissionAction;
  fields: string[] | '*';
  permissions: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  presets: Record<string, unknown> | null;
  rowFilter: PermissionFilter;
}
