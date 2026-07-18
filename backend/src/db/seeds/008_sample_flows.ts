import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';

const SAMPLE_FLOW_NAME = 'Page Update Webhook Pipeline';

/**
 * Seed a Directus-style example flow: event hook → condition waterfall → read → exec → request.
 * Idempotent — skips if the sample flow already exists.
 */
export async function seed(knex: Knex): Promise<void> {
  const existing = await knex('cms_flows').where({ name: SAMPLE_FLOW_NAME }).first<{ id: string }>();
  if (existing) {
    return;
  }

  const flowId = randomUUID();
  const now = new Date().toISOString();

  const opIds = {
    checkTitle: randomUUID(),
    checkStatus: randomUUID(),
    readPage: randomUUID(),
    transform: randomUUID(),
    notify: randomUUID(),
    logSkipped: randomUUID(),
  };

  await knex('cms_flows').insert({
    id: flowId,
    name: SAMPLE_FLOW_NAME,
    status: 'inactive',
    trigger_type: 'event',
    trigger_options: JSON.stringify({
      type: 'action',
      scope: ['pages.update'],
    }),
    accountability: 'all',
    operation: opIds.checkTitle,
    date_created: now,
    date_updated: now,
    user_created: null,
    user_updated: null,
  });

  const operations = [
    {
      id: opIds.checkTitle,
      key: 'check_title',
      name: 'Has Title',
      type: 'condition',
      options: {
        filter: {
          scope: '$trigger.payload',
          title: { _null: false },
        },
      },
      resolve: opIds.readPage,
      reject: opIds.checkStatus,
      position_x: 280,
      position_y: 80,
    },
    {
      id: opIds.checkStatus,
      key: 'check_status',
      name: 'Is Published',
      type: 'condition',
      options: {
        filter: {
          scope: '$trigger.payload',
          status: { _eq: 'published' },
        },
      },
      resolve: opIds.readPage,
      reject: opIds.logSkipped,
      position_x: 280,
      position_y: 220,
    },
    {
      id: opIds.readPage,
      key: 'read_page',
      name: 'Read Page',
      type: 'item-read',
      options: {
        collection: 'pages',
        id: '{{ $trigger.keys.0 }}',
      },
      resolve: opIds.transform,
      reject: null,
      position_x: 560,
      position_y: 80,
    },
    {
      id: opIds.transform,
      key: 'transform',
      name: 'Transform Payload',
      type: 'exec',
      options: {
        code: `
module.exports = function(data) {
  const page = data.$last;
  return {
    event: 'pages.update',
    pageId: data.$trigger.keys?.[0],
    title: page?.title ?? null,
    status: page?.status ?? null,
    updatedAt: new Date().toISOString(),
  };
};
        `.trim(),
      },
      resolve: opIds.notify,
      reject: null,
      position_x: 840,
      position_y: 80,
    },
    {
      id: opIds.notify,
      key: 'notify_webhook',
      name: 'Notify Webhook',
      type: 'request',
      options: {
        method: 'POST',
        url: '{{ $env.WEBHOOK_URL }}',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{{ $last }}',
      },
      resolve: null,
      reject: null,
      position_x: 1120,
      position_y: 80,
    },
    {
      id: opIds.logSkipped,
      key: 'log_skipped',
      name: 'Log Skipped',
      type: 'log',
      options: {
        message: 'Page update skipped — title empty and status not published',
      },
      resolve: null,
      reject: null,
      position_x: 560,
      position_y: 220,
    },
  ];

  for (const op of operations) {
    await knex('cms_flow_operations').insert({
      id: op.id,
      flow: flowId,
      key: op.key,
      name: op.name,
      type: op.type,
      options: op.options ? JSON.stringify(op.options) : null,
      resolve: op.resolve,
      reject: op.reject,
      position_x: op.position_x,
      position_y: op.position_y,
      date_created: now,
      date_updated: now,
    });
  }
}
