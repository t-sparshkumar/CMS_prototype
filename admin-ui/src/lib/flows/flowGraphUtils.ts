import type { Edge, Node } from '@xyflow/react';
import type { FlowOperation, FlowOperationType, FlowSummary, FlowTriggerType } from '../api';
import { getOperationCatalogEntry } from './operationCatalog';

export const TRIGGER_NODE_ID = '__trigger__';

export type FlowNodeData = {
  label: string;
  operationType?: string;
  operationKey?: string;
  isCondition?: boolean;
  triggerType?: FlowTriggerType;
};

export interface OperationOptionsState {
  key: string;
  name: string;
  type: string;
  options: Record<string, unknown>;
}

export function apiToFlowGraph(
  flow: FlowSummary,
  operations: FlowOperation[],
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<FlowNodeData>[] = [
    {
      id: TRIGGER_NODE_ID,
      type: 'trigger',
      position: { x: 40, y: 160 },
      data: {
        label: 'Trigger',
        triggerType: flow.trigger_type,
      },
      draggable: false,
      selectable: true,
    },
  ];

  for (const op of operations) {
    const entry = getOperationCatalogEntry(op.type);
    nodes.push({
      id: op.id,
      type: entry?.dualOutput ? 'condition' : 'operation',
      position: {
        x: op.position_x ?? 280,
        y: op.position_y ?? 120,
      },
      data: {
        label: op.name ?? op.key,
        operationType: op.type,
        operationKey: op.key,
        isCondition: entry?.dualOutput ?? false,
      },
    });
  }

  const edges: Edge[] = [];
  if (flow.operation) {
    const entryOp = operations.find((op) => op.key === flow.operation || op.id === flow.operation);
    if (entryOp) {
      edges.push(buildConnectEdge(TRIGGER_NODE_ID, entryOp.id, 'resolve'));
    }
  }

  for (const op of operations) {
    if (op.resolve) {
      const targetOp = operations.find((entry) => entry.key === op.resolve || entry.id === op.resolve);
      if (targetOp) {
        edges.push({
          ...buildConnectEdge(op.id, targetOp.id, 'resolve'),
          label: op.type === 'condition' ? 'On success' : undefined,
        });
      }
    }
    if (op.reject) {
      const targetOp = operations.find((entry) => entry.key === op.reject || entry.id === op.reject);
      if (targetOp) {
        edges.push(buildConnectEdge(op.id, targetOp.id, 'reject'));
      }
    }
  }

  return { nodes: layoutFlowGraph(nodes, edges), edges };
}

const LAYOUT = {
  originX: 80,
  originY: 100,
  colWidth: 280,
  rowHeight: 150,
};

/** Arrange nodes left-to-right from the trigger, with reject branches below. */
export function layoutFlowGraph(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
): Node<FlowNodeData>[] {
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(TRIGGER_NODE_ID, { x: LAYOUT.originX, y: LAYOUT.originY });

  const resolveTarget = new Map<string, string>();
  const rejectTarget = new Map<string, string>();
  for (const edge of edges) {
    if (edge.sourceHandle === 'reject') {
      rejectTarget.set(edge.source, edge.target);
    } else {
      resolveTarget.set(edge.source, edge.target);
    }
  }

  const visited = new Set<string>([TRIGGER_NODE_ID]);

  function place(nodeId: string, col: number, row: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    positions.set(nodeId, {
      x: LAYOUT.originX + col * LAYOUT.colWidth,
      y: LAYOUT.originY + row * LAYOUT.rowHeight,
    });

    const reject = rejectTarget.get(nodeId);
    if (reject && !visited.has(reject)) {
      place(reject, col + 1, row + 1);
    }

    const resolve = resolveTarget.get(nodeId);
    if (resolve && !visited.has(resolve)) {
      place(resolve, col + 1, row);
    }
  }

  const entry = resolveTarget.get(TRIGGER_NODE_ID);
  if (entry) {
    place(entry, 1, 0);
  }

  let orphanCol = 1;
  for (const node of nodes) {
    if (node.id !== TRIGGER_NODE_ID && !visited.has(node.id)) {
      positions.set(node.id, {
        x: LAYOUT.originX + orphanCol * LAYOUT.colWidth,
        y: LAYOUT.originY + LAYOUT.rowHeight * 2,
      });
      orphanCol += 1;
    }
  }

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}

export function flowGraphToApi(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  editorMap: Map<string, OperationOptionsState>,
): {
  operations: Array<{
    id?: string;
    key: string;
    name?: string | null;
    type: FlowOperationType;
    options?: Record<string, unknown> | null;
    resolve?: string | null;
    reject?: string | null;
    position_x: number;
    position_y: number;
  }>;
  entry_operation: string | null;
} {
  const opNodes = nodes.filter((node) => node.id !== TRIGGER_NODE_ID);
  const idToKey = new Map<string, string>();

  for (const node of opNodes) {
    const state = editorMap.get(node.id);
    idToKey.set(node.id, state?.key ?? node.data.operationKey ?? node.id);
  }

  const resolveEdge = (sourceId: string, handle?: string | null): string | null => {
    const edge = edges.find(
      (entry) =>
        entry.source === sourceId &&
        (handle ? entry.sourceHandle === handle : !entry.sourceHandle || entry.sourceHandle === 'resolve'),
    );
    if (!edge) {
      return null;
    }
    return idToKey.get(edge.target) ?? edge.target;
  };

  const rejectEdge = (sourceId: string): string | null => {
    const edge = edges.find((entry) => entry.source === sourceId && entry.sourceHandle === 'reject');
    if (!edge) {
      return null;
    }
    return idToKey.get(edge.target) ?? edge.target;
  };

  const triggerEdge = edges.find((edge) => edge.source === TRIGGER_NODE_ID);
  const entryNode = triggerEdge ? opNodes.find((node) => node.id === triggerEdge.target) : opNodes[0];
  const entryKey = entryNode ? idToKey.get(entryNode.id) ?? entryNode.data.operationKey ?? null : null;

  const operations = opNodes.map((node) => {
    const state = editorMap.get(node.id);
    const key = state?.key ?? node.data.operationKey ?? node.id;
    const isCondition = node.data.isCondition ?? node.type === 'condition';
    return {
      id: node.id.startsWith('new-') ? undefined : node.id,
      key,
      name: state?.name ?? node.data.label,
      type: (state?.type ?? node.data.operationType ?? 'log') as FlowOperationType,
      options: state?.options ?? null,
      resolve: resolveEdge(node.id, isCondition ? 'resolve' : 'resolve'),
      reject: isCondition ? rejectEdge(node.id) : null,
      position_x: Math.round(node.position.x),
      position_y: Math.round(node.position.y),
    };
  });

  return { operations, entry_operation: entryKey };
}

export function buildEditorMap(operations: FlowOperation[]): Map<string, OperationOptionsState> {
  const map = new Map<string, OperationOptionsState>();
  for (const op of operations) {
    map.set(op.id, {
      key: op.key,
      name: op.name ?? op.key,
      type: op.type,
      options: (op.options ?? {}) as Record<string, unknown>,
    });
  }
  return map;
}

export function createOperationNode(
  type: string,
  label: string,
  position: { x: number; y: number },
): Node<FlowNodeData> {
  const entry = getOperationCatalogEntry(type);
  const id = `new-${crypto.randomUUID()}`;
  const key = `${type.replace(/[^a-z0-9]+/gi, '_')}_${id.slice(-6)}`;
  return {
    id,
    type: entry?.dualOutput ? 'condition' : 'operation',
    position,
    data: {
      label,
      operationType: type,
      operationKey: key,
      isCondition: entry?.dualOutput ?? false,
    },
  };
}

const GRID_X = 280;
const GRID_Y = 120;

/** Place the next node to the right of existing nodes, or below if the row is full. */
export function computeNextNodePosition(
  nodes: Array<{ position: { x: number; y: number }; id: string }>,
  excludeId = TRIGGER_NODE_ID,
): { x: number; y: number } {
  const opNodes = nodes.filter((node) => node.id !== excludeId);
  if (opNodes.length === 0) {
    return { x: LAYOUT.originX + LAYOUT.colWidth, y: LAYOUT.originY };
  }

  const maxX = Math.max(...opNodes.map((node) => node.position.x));
  const rightColumn = opNodes.filter((node) => node.position.x >= maxX - 40);
  const mainY = Math.min(...opNodes.map((node) => node.position.y));

  if (rightColumn.length >= 3) {
    return { x: maxX + GRID_X, y: mainY };
  }

  const maxYInColumn = Math.max(...rightColumn.map((node) => node.position.y));
  if (Math.abs(maxYInColumn - mainY) < 40) {
    return { x: maxX + GRID_X, y: mainY };
  }

  return { x: maxX, y: maxYInColumn + GRID_Y };
}

export function buildConnectEdge(
  sourceId: string,
  targetId: string,
  sourceHandle: 'resolve' | 'reject' = 'resolve',
): Edge {
  const isReject = sourceHandle === 'reject';
  return {
    id: `${sourceId}-${sourceHandle}-${targetId}`,
    source: sourceId,
    sourceHandle,
    target: targetId,
    targetHandle: 'in',
    type: 'smoothstep',
    animated: false,
    label: isReject ? 'On failure' : undefined,
    style: {
      stroke: isReject ? 'var(--flow-edge-reject)' : 'var(--flow-edge-resolve)',
      strokeWidth: 2,
    },
    markerEnd: {
      type: 'arrowclosed',
      width: 16,
      height: 16,
      color: isReject ? 'var(--flow-edge-reject)' : 'var(--flow-edge-resolve)',
    },
  };
}
