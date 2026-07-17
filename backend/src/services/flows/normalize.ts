import { parseJsonColumn } from '../../core/field.js';
import type { FlowOperationRow, FlowRow } from '../../types/flow.js';

export function normalizeFlowRow(row: Record<string, unknown>): FlowRow {
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status as FlowRow['status'],
    trigger_type: row.trigger_type as FlowRow['trigger_type'],
    trigger_options: parseJsonColumn(row.trigger_options as never) as Record<string, unknown> | null,
    accountability: row.accountability as FlowRow['accountability'],
    operation: row.operation ? String(row.operation) : null,
    date_created: String(row.date_created),
    date_updated: String(row.date_updated),
    user_created: row.user_created ? String(row.user_created) : null,
    user_updated: row.user_updated ? String(row.user_updated) : null,
  };
}

export function normalizeOperationRow(row: Record<string, unknown>): FlowOperationRow {
  return {
    id: String(row.id),
    flow: String(row.flow),
    name: row.name ? String(row.name) : null,
    key: String(row.key),
    type: row.type as FlowOperationRow['type'],
    options: parseJsonColumn(row.options as never) as Record<string, unknown> | null,
    resolve: row.resolve ? String(row.resolve) : null,
    reject: row.reject ? String(row.reject) : null,
    position_x: Number(row.position_x ?? 1),
    position_y: Number(row.position_y ?? 1),
    date_created: String(row.date_created),
    date_updated: String(row.date_updated),
  };
}
