import cron, { type ScheduledTask } from 'node-cron';
import type { Knex } from 'knex';
import { getDb } from '../../db/knex.js';
import { listActiveFlowsByTrigger } from './flows.service.js';
import { FlowRunner } from './flow-runner.js';

const scheduledJobs = new Map<string, ScheduledTask>();

export async function refreshFlowSchedules(db: Knex = getDb()): Promise<void> {
  for (const task of scheduledJobs.values()) {
    task.stop();
  }
  scheduledJobs.clear();

  const flows = await listActiveFlowsByTrigger(db, 'schedule');
  for (const flow of flows) {
    const cronExpr = String(flow.trigger_options?.cron ?? '').trim();
    if (!cronExpr || !cron.validate(cronExpr)) {
      console.warn(`[flows] invalid cron for flow "${flow.name}": ${cronExpr}`);
      continue;
    }

    const task = cron.schedule(cronExpr, () => {
      const runner = new FlowRunner(db);
      void runner
        .run(flow.id, {
          type: 'schedule',
          payload: {
            cron: cronExpr,
            timestamp: new Date().toISOString(),
          },
        })
        .catch((err) => {
          console.error(`[flows] scheduled flow "${flow.name}" failed`, err);
        });
    });

    scheduledJobs.set(flow.id, task);
  }

  console.info(`[flows] registered ${scheduledJobs.size} scheduled flow(s)`);
}

export function stopFlowSchedules(): void {
  for (const task of scheduledJobs.values()) {
    task.stop();
  }
  scheduledJobs.clear();
}
