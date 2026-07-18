import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FlowGraphValidationError,
  validateFlowForActivation,
  validateFlowGraph,
  type SaveFlowGraphOperationInput,
} from './flows.service.js';
import type { FlowOperationRow, FlowRow } from '../../types/flow.js';

function sampleOps(): SaveFlowGraphOperationInput[] {
  return [
    {
      key: 'entry',
      type: 'condition',
      resolve: 'success',
      reject: 'fallback',
      position_x: 0,
      position_y: 0,
      options: { filter: { status: { _eq: 'published' } } },
    },
    {
      key: 'success',
      type: 'log',
      resolve: null,
      reject: null,
      position_x: 200,
      position_y: 0,
    },
    {
      key: 'fallback',
      type: 'log',
      resolve: null,
      reject: null,
      position_x: 200,
      position_y: 120,
    },
  ];
}

describe('flows.service graph validation', () => {
  it('accepts a valid graph with resolve/reject refs by key', () => {
    assert.doesNotThrow(() => validateFlowGraph(sampleOps(), 'entry'));
  });

  it('rejects duplicate operation keys', () => {
    const ops = sampleOps();
    ops.push({
      key: 'entry',
      type: 'log',
      position_x: 0,
      position_y: 200,
    });

    assert.throws(
      () => validateFlowGraph(ops, 'entry'),
      (err: unknown) => err instanceof FlowGraphValidationError && /Duplicate operation key/.test(err.message),
    );
  });

  it('rejects unknown resolve/reject targets', () => {
    const ops: SaveFlowGraphOperationInput[] = [
      { ...sampleOps()[0], resolve: 'missing_node' },
      ...sampleOps().slice(1),
    ];

    assert.throws(
      () => validateFlowGraph(ops, 'entry'),
      (err: unknown) => err instanceof FlowGraphValidationError && /unknown target/.test(err.message),
    );
  });

  it('rejects graphs without an entry operation', () => {
    assert.throws(
      () => validateFlowGraph(sampleOps(), null),
      (err: unknown) => err instanceof FlowGraphValidationError && /entry operation/.test(err.message),
    );
  });

  it('detects cycles in the operation graph', () => {
    const ops: SaveFlowGraphOperationInput[] = [
      { key: 'a', type: 'log', resolve: 'b', reject: null, position_x: 0, position_y: 0 },
      { key: 'b', type: 'log', resolve: 'c', reject: null, position_x: 100, position_y: 0 },
      { key: 'c', type: 'log', resolve: 'a', reject: null, position_x: 200, position_y: 0 },
    ];

    assert.throws(
      () => validateFlowGraph(ops, 'a'),
      (err: unknown) => err instanceof FlowGraphValidationError && /Cycle detected/.test(err.message),
    );
  });

  it('rejects unreachable orphan operations', () => {
    const ops = sampleOps();
    ops.push({
      key: 'orphan',
      type: 'log',
      resolve: null,
      reject: null,
      position_x: 400,
      position_y: 0,
    });

    assert.throws(
      () => validateFlowGraph(ops, 'entry'),
      (err: unknown) => err instanceof FlowGraphValidationError && /Unreachable operations/.test(err.message),
    );
  });

  it('accepts entry operation referenced by id', () => {
    const ops: SaveFlowGraphOperationInput[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        key: 'entry',
        type: 'log',
        resolve: null,
        reject: null,
        position_x: 0,
        position_y: 0,
      },
    ];

    assert.doesNotThrow(() =>
      validateFlowGraph(ops, '11111111-1111-1111-1111-111111111111'),
    );
  });
});

describe('flows.service activation validation', () => {
  const baseFlow: FlowRow = {
    id: 'flow-1',
    name: 'Test',
    status: 'active',
    trigger_type: 'event',
    trigger_options: { type: 'action', scope: ['pages.update'] },
    accountability: 'all',
    operation: 'op-1',
    date_created: '',
    date_updated: '',
    user_created: null,
    user_updated: null,
  };

  const operations: FlowOperationRow[] = [
    {
      id: 'op-1',
      flow: 'flow-1',
      key: 'entry',
      name: 'Entry',
      type: 'log',
      options: null,
      resolve: null,
      reject: null,
      position_x: 0,
      position_y: 0,
      date_created: '',
      date_updated: '',
    },
  ];

  it('requires entry operation before activation', () => {
    assert.throws(
      () => validateFlowForActivation({ ...baseFlow, operation: null }, operations),
      (err: unknown) => err instanceof FlowGraphValidationError && /entry operation/.test(err.message),
    );
  });

  it('requires event scope before activation', () => {
    assert.throws(
      () =>
        validateFlowForActivation(
          { ...baseFlow, trigger_options: { type: 'action', scope: [] } },
          operations,
        ),
      (err: unknown) => err instanceof FlowGraphValidationError && /scope/.test(err.message),
    );
  });

  it('requires cron expression for schedule flows', () => {
    assert.throws(
      () =>
        validateFlowForActivation(
          {
            ...baseFlow,
            trigger_type: 'schedule',
            trigger_options: {},
          },
          operations,
        ),
      (err: unknown) => err instanceof FlowGraphValidationError && /cron/.test(err.message),
    );
  });

  it('rejects invalid cron expressions for schedule flows', () => {
    assert.throws(
      () =>
        validateFlowForActivation(
          {
            ...baseFlow,
            trigger_type: 'schedule',
            trigger_options: { cron: 'not-a-cron' },
          },
          operations,
        ),
      (err: unknown) =>
        err instanceof FlowGraphValidationError && /valid cron expression/.test(err.message),
    );
  });
});
