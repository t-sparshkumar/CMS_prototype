import { useEffect, useState } from 'react';
import {
  fetchFlowLogDetail,
  fetchFlowLogs,
  triggerFlow,
  type FlowLogDetail,
  type FlowLogEntry,
  type FlowSummary,
} from '../../lib/api';

interface FlowLogPanelProps {
  flow: FlowSummary;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function defaultManualPayload(flow: FlowSummary): string {
  const hint = flow.trigger_options?.payloadHint;
  if (typeof hint === 'string') {
    try {
      return JSON.stringify(JSON.parse(hint), null, 2);
    } catch {
      return hint;
    }
  }
  return '{\n  "source": "admin-ui"\n}';
}

function isSuccessStatus(status: string): boolean {
  return status === 'completed' || status === 'success';
}

export default function FlowLogPanel({ flow }: FlowLogPanelProps) {
  const [logs, setLogs] = useState<FlowLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FlowLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [rerunPayload, setRerunPayload] = useState(() => defaultManualPayload(flow));

  async function loadLogs() {
    setLoading(true);
    try {
      const entries = await fetchFlowLogs(flow.id);
      setLogs(entries);
      setSelectedId((current) => {
        if (current && entries.some((entry) => entry.id === current)) {
          return current;
        }
        return entries[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
    setRerunPayload(defaultManualPayload(flow));
  }, [flow.id]);

  useEffect(() => {
    if (flow.trigger_type !== 'manual') {
      return;
    }
    setRerunPayload(defaultManualPayload(flow));
  }, [flow.id, flow.trigger_options?.payloadHint, flow.trigger_type]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void fetchFlowLogDetail(flow.id, selectedId).then(setDetail);
  }, [flow.id, selectedId]);

  useEffect(() => {
    if (detail?.trigger_log && typeof detail.trigger_log === 'object') {
      const payload = (detail.trigger_log as Record<string, unknown>).payload;
      if (payload && typeof payload === 'object') {
        setRerunPayload(JSON.stringify(payload, null, 2));
      }
    }
  }, [detail]);

  async function handleRerun() {
    try {
      const payload = JSON.parse(rerunPayload) as Record<string, unknown>;
      await triggerFlow(flow.id, payload);
      await loadLogs();
    } catch {
      /* invalid JSON or trigger failure */
    }
  }

  return (
    <div className="flow-log-panel">
      <aside className="flow-log-list">
        <div className="flow-log-list-header">
          <span className="material-symbols-outlined text-base">history</span>
          <span>Executions</span>
          <span className="flow-log-count">{logs.length}</span>
        </div>
        <div className="flow-log-list-body">
          {loading ? <p className="flow-log-muted">Loading logs…</p> : null}
          {!loading && logs.length === 0 ? (
            <div className="flow-log-empty">
              <span className="material-symbols-outlined flow-log-empty-icon">inbox</span>
              <p className="text-sm font-medium text-slate-700">No executions yet</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Run this flow manually or wait for a trigger to see history here.
              </p>
            </div>
          ) : null}
          {logs.map((log) => (
            <button
              key={log.id}
              type="button"
              className={`flow-log-item ${selectedId === log.id ? 'flow-log-item-active' : ''}`}
              onClick={() => setSelectedId(log.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`badge text-[10px] ${
                    isSuccessStatus(log.status)
                      ? 'badge-green'
                      : log.status === 'failed'
                        ? 'badge-red'
                        : 'badge-gray'
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-[11px] text-slate-400">{log.execution_time ?? 0} ms</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{formatDate(log.started_at)}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="flow-log-detail">
        {flow.trigger_type === 'manual' ? (
          <div className="flow-log-rerun">
            <p className="flow-log-section-label">Re-run payload</p>
            <textarea
              className="input mt-2 min-h-[96px] w-full font-mono text-xs"
              value={rerunPayload}
              onChange={(e) => setRerunPayload(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary mt-3 w-full sm:w-auto text-sm"
              onClick={() => void handleRerun()}
            >
              Re-run flow
            </button>
          </div>
        ) : null}

        {detail ? (
          <div className="flow-log-detail-body space-y-4">
            <div className="flow-log-card">
              <p className="flow-log-section-label">Trigger input</p>
              <pre className="flow-log-pre">{JSON.stringify(detail.trigger_log, null, 2)}</pre>
            </div>

            <div className="space-y-3">
              {(detail.operations_log ?? []).map((step, index) => (
                <div key={`${step.operation_id}-${index}`} className="flow-log-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{step.operation_key}</span>
                    <span className="badge badge-gray">{step.operation_type}</span>
                    <span
                      className={`badge ${
                        step.status === 'success'
                          ? 'badge-green'
                          : step.status === 'failed'
                            ? 'badge-red'
                            : 'badge-gray'
                      }`}
                    >
                      {step.status}
                    </span>
                    {step.branch && step.branch !== 'none' ? (
                      <span
                        className={`badge text-[10px] ${
                          step.branch === 'resolve' ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {step.branch}
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-400">{step.duration_ms} ms</span>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="flow-log-section-label">Input</p>
                      <pre className="flow-log-pre">{JSON.stringify(step.input, null, 2)}</pre>
                    </div>
                    <div>
                      <p className="flow-log-section-label">Output</p>
                      <pre className="flow-log-pre">{JSON.stringify(step.output, null, 2)}</pre>
                    </div>
                  </div>
                  {step.error ? <p className="mt-2 text-xs text-red-600">{step.error}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flow-log-detail-empty">
            <span className="material-symbols-outlined flow-log-empty-icon">list_alt</span>
            <p className="text-sm font-medium text-slate-700">Select a log entry</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Choose an execution from the list to inspect trigger input and step-by-step results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
