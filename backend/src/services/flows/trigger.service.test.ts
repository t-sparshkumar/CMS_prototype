import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FlowRow } from '../../types/flow.js';
import {
  isWebhookMethodAllowed,
  matchesEventFlow,
  parseWebhookMethods,
} from './trigger.service.js';

function eventFlow(overrides: Partial<FlowRow> = {}): FlowRow {
  return {
    id: 'flow-1',
    name: 'Event flow',
    status: 'active',
    trigger_type: 'event',
    trigger_options: { type: 'action', scope: ['pages.update'] },
    accountability: 'all',
    operation: 'op-1',
    date_created: '',
    date_updated: '',
    user_created: null,
    user_updated: null,
    ...overrides,
  };
}

describe('trigger.service event matching', () => {
  it('matches scope by collection event key', () => {
    const flow = eventFlow({
      trigger_options: { type: 'action', scope: ['pages.update'] },
    });
    assert.equal(
      matchesEventFlow(flow, { collection: 'pages', event: 'update', hook: 'action' }),
      true,
    );
    assert.equal(
      matchesEventFlow(flow, { collection: 'pages', event: 'create', hook: 'action' }),
      false,
    );
  });

  it('respects collections filter when non-empty', () => {
    const flow = eventFlow({
      trigger_options: {
        type: 'action',
        scope: ['pages.update', 'posts.update'],
        collections: ['pages'],
      },
    });

    assert.equal(
      matchesEventFlow(flow, { collection: 'pages', event: 'update', hook: 'action' }),
      true,
    );
    assert.equal(
      matchesEventFlow(flow, { collection: 'posts', event: 'update', hook: 'action' }),
      false,
    );
  });

  it('ignores collections filter when empty', () => {
    const flow = eventFlow({
      trigger_options: {
        type: 'action',
        scope: ['posts.update'],
        collections: [],
      },
    });

    assert.equal(
      matchesEventFlow(flow, { collection: 'posts', event: 'update', hook: 'action' }),
      true,
    );
  });

  it('requires matching hook type', () => {
    const flow = eventFlow({
      trigger_options: { type: 'filter', scope: ['pages.update'] },
    });

    assert.equal(
      matchesEventFlow(flow, { collection: 'pages', event: 'update', hook: 'filter' }),
      true,
    );
    assert.equal(
      matchesEventFlow(flow, { collection: 'pages', event: 'update', hook: 'action' }),
      false,
    );
  });
});

describe('trigger.service webhook methods', () => {
  it('defaults to common HTTP methods', () => {
    assert.deepEqual(parseWebhookMethods(null), ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    assert.equal(isWebhookMethodAllowed('post', null), true);
    assert.equal(isWebhookMethodAllowed('OPTIONS', null), false);
  });

  it('parses comma-separated methods case-insensitively', () => {
    const options = { methods: 'get, post ,PATCH' };
    assert.deepEqual(parseWebhookMethods(options), ['GET', 'POST', 'PATCH']);
    assert.equal(isWebhookMethodAllowed('PATCH', options), true);
    assert.equal(isWebhookMethodAllowed('DELETE', options), false);
  });
});
