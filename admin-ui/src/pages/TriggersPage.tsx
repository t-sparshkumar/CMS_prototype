import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/AppLayout';
import ConfirmDialog from '../components/data-model/ConfirmDialog';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import {
  createFlow,
  deleteFlow,
  fetchFlowLogs,
  fetchFlows,
  triggerFlow,
  updateFlow,
  type FlowLogEntry,
  type FlowSummary,
  type FlowTriggerType,
} from '../lib/api';
import { apiUrl } from '../lib/apiBase';

const TRIGGER_TYPES: { value: FlowTriggerType; label: string; description: string }[] = [
  { value: 'event', label: 'Event Hook', description: 'Run on item create, update, or delete' },
  { value: 'webhook', label: 'Webhook', description: 'Expose an HTTP endpoint for this flow' },
  { value: 'schedule', label: 'Schedule', description: 'Run on a cron schedule' },
  { value: 'manual', label: 'Manual', description: 'Trigger from the admin UI or API' },
  { value: 'operation', label: 'Another Flow', description: 'Invoked by a Trigger Flow operation' },
];

const TRIGGER_LABELS: Record<FlowTriggerType, string> = {
  event: 'Event Hook',
  webhook: 'Webhook',
  schedule: 'Schedule',
  manual: 'Manual',
  operation: 'Another Flow',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-gray',
  completed: 'badge-green',
  failed: 'badge-red',
  running: 'badge-amber',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function webhookUrl(flowId: string): string {
  return apiUrl(`/flows/trigger/${flowId}`);
}

export default function TriggersPage() {
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlowSummary | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<FlowSummary | null>(null);
  const [logs, setLogs] = useState<FlowLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [newName, setNewName] = useState('');
  const [newTriggerType, setNewTriggerType] = useState<FlowTriggerType>('manual');
  const [newCron, setNewCron] = useState('0 * * * *');
  const [newEventScope, setNewEventScope] = useState('items.create');
  const [newEventHook, setNewEventHook] = useState<'filter' | 'action'>('action');
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setFlows(await fetchFlows());
    } catch {
      setError('Failed to load flows');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredFlows = useMemo(() => {
    if (!search.trim()) return flows;
    const q = search.toLowerCase();
    return flows.filter(
      (flow) =>
        flow.name.toLowerCase().includes(q) ||
        flow.trigger_type.toLowerCase().includes(q) ||
        flow.status.toLowerCase().includes(q),
    );
  }, [flows, search]);

  async function loadLogs(flow: FlowSummary) {
    setSelectedFlow(flow);
    setLogsLoading(true);
    try {
      setLogs(await fetchFlowLogs(flow.id));
    } catch {
      setError('Failed to load flow logs');
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleToggleStatus(flow: FlowSummary) {
    try {
      const next = flow.status === 'active' ? 'inactive' : 'active';
      await updateFlow(flow.id, { status: next });
      await load();
      if (selectedFlow?.id === flow.id) {
        setSelectedFlow({ ...flow, status: next });
      }
    } catch {
      setError('Failed to update flow status');
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);

    const triggerOptions: Record<string, unknown> = {};
    if (newTriggerType === 'schedule') {
      triggerOptions.cron = newCron.trim();
    } else if (newTriggerType === 'event') {
      triggerOptions.type = newEventHook;
      triggerOptions.scope = [newEventScope.trim()];
    }

    try {
      await createFlow({
        name: newName.trim(),
        status: 'inactive',
        trigger_type: newTriggerType,
        trigger_options: triggerOptions,
        operations: [
          {
            key: 'log_start',
            type: 'log',
            name: 'Log trigger',
            options: { message: 'Flow triggered: {{$trigger.type}}' },
          },
        ],
      });
      setCreateOpen(false);
      setNewName('');
      await load();
    } catch {
      setError('Failed to create flow');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFlow(deleteTarget.id);
      if (selectedFlow?.id === deleteTarget.id) {
        setSelectedFlow(null);
        setLogs([]);
      }
      setDeleteTarget(null);
      await load();
    } catch {
      setError('Failed to delete flow');
    }
  }

  async function handleManualTrigger(flow: FlowSummary) {
    try {
      await triggerFlow(flow.id, { source: 'admin-ui', timestamp: new Date().toISOString() });
      await loadLogs(flow);
    } catch {
      setError('Failed to trigger flow');
    }
  }

  return (
    <AppLayout
      fullWidth
      title="Triggers"
      subtitle="Automations and workflows — event hooks, webhooks, schedules, and chained operations"
      breadcrumbs={[{ label: 'Triggers' }]}
      actions={
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" className="h-4 w-4" />
          New Flow
        </button>
      }
    >
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="page-toolbar">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search flows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <span className="toolbar-divider" />
        <span className="toolbar-count">
          {filteredFlows.length} flow{filteredFlows.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <section className="dm-shell min-h-[28rem]">
          <div className="dm-shell-header">
            <span>Flows</span>
            <span className="text-slate-400">
              {selectedFlow ? `Selected: ${selectedFlow.name}` : 'Select a flow to view logs'}
            </span>
          </div>

          {isLoading ? (
            <div className="dm-empty text-sm">Loading flows…</div>
          ) : filteredFlows.length === 0 ? (
            <div className="dm-empty">
              <span className="dm-empty-icon">
                <Icon name="bolt" className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">No flows yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create a flow to automate item events, webhooks, or scheduled tasks.
              </p>
              <button type="button" className="btn-primary mt-4 text-sm" onClick={() => setCreateOpen(true)}>
                <Icon name="plus" className="h-4 w-4" />
                New Flow
              </button>
            </div>
          ) : (
            <div>
              {filteredFlows.map((flow) => {
                const selected = selectedFlow?.id === flow.id;
                return (
                  <div
                    key={flow.id}
                    className={`border-b border-surface-border px-4 py-4 transition-colors last:border-b-0 sm:px-5 ${
                      selected ? 'bg-brand-50/50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => void loadLogs(flow)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Icon name="bolt" className="h-4 w-4" />
                          </span>
                          <span className="truncate text-sm font-semibold text-slate-900">{flow.name}</span>
                          <span className={`badge ${STATUS_BADGE[flow.status] ?? 'badge-gray'}`}>
                            {flow.status}
                          </span>
                          <span className="badge badge-blue">{TRIGGER_LABELS[flow.trigger_type]}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          Updated {formatDate(flow.date_updated)}
                        </p>
                        {flow.trigger_type === 'webhook' ? (
                          <code className="mt-2 block break-all rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                            {webhookUrl(flow.id)}
                          </code>
                        ) : null}
                      </button>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {flow.trigger_type === 'manual' ? (
                          <button
                            type="button"
                            className="btn-secondary text-sm"
                            onClick={() => void handleManualTrigger(flow)}
                          >
                            Run
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn-secondary text-sm"
                          onClick={() => void handleToggleStatus(flow)}
                        >
                          {flow.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn-danger text-sm"
                          onClick={() => setDeleteTarget(flow)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dm-shell flex min-h-[28rem] flex-col">
          <div className="dm-shell-header">
            <span>Execution logs</span>
            {selectedFlow ? (
              <span className="truncate text-slate-400">{selectedFlow.name}</span>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col p-4 sm:p-5">
            {selectedFlow?.trigger_type === 'webhook' ? (
              <div className="mb-4 rounded-xl border border-surface-border bg-slate-50/80 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Webhook URL
                </p>
                <code className="mt-1.5 block break-all text-xs text-slate-700">
                  {webhookUrl(selectedFlow.id)}
                </code>
              </div>
            ) : null}

            {logsLoading ? (
              <div className="dm-empty flex-1 text-sm">Loading logs…</div>
            ) : !selectedFlow ? (
              <div className="dm-empty flex-1">
                <span className="dm-empty-icon">
                  <Icon name="history" className="h-5 w-5" />
                </span>
                <p className="text-sm text-slate-500">Select a flow to view execution history.</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="dm-empty flex-1">
                <span className="dm-empty-icon">
                  <Icon name="history" className="h-5 w-5" />
                </span>
                <p className="text-sm text-slate-500">No executions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-surface-border bg-white px-4 py-3.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`badge ${STATUS_BADGE[log.status] ?? 'badge-gray'}`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(log.started_at)}</span>
                    </div>
                    {log.execution_time !== null ? (
                      <p className="mt-2 text-xs text-slate-500">{log.execution_time} ms</p>
                    ) : null}
                    {Array.isArray(log.operations_log) && log.operations_log.length > 0 ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {log.operations_log.length} operation
                        {log.operations_log.length === 1 ? '' : 's'}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Flow">
        <div className="space-y-4">
          <label className="block">
            <span className="label">Name</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input"
              placeholder="Notify on publish"
            />
          </label>

          <label className="block">
            <span className="label">Trigger</span>
            <select
              value={newTriggerType}
              onChange={(e) => setNewTriggerType(e.target.value as FlowTriggerType)}
              className="input"
            >
              {TRIGGER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              {TRIGGER_TYPES.find((t) => t.value === newTriggerType)?.description}
            </p>
          </label>

          {newTriggerType === 'schedule' ? (
            <label className="block">
              <span className="label">Cron expression</span>
              <input
                type="text"
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
                className="input font-mono"
                placeholder="0 * * * *"
              />
            </label>
          ) : null}

          {newTriggerType === 'event' ? (
            <>
              <label className="block">
                <span className="label">Hook type</span>
                <select
                  value={newEventHook}
                  onChange={(e) => setNewEventHook(e.target.value as 'filter' | 'action')}
                  className="input"
                >
                  <option value="action">Action (after commit)</option>
                  <option value="filter">Filter (before commit)</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Scope</span>
                <input
                  type="text"
                  value={newEventScope}
                  onChange={(e) => setNewEventScope(e.target.value)}
                  className="input font-mono"
                  placeholder="items.create or my_collection.update"
                />
              </label>
            </>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!newName.trim() || isCreating}
              onClick={() => void handleCreate()}
            >
              {isCreating ? 'Creating…' : 'Create flow'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete flow"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This removes all operations and execution logs.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
