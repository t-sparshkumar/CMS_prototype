import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Edge, Node } from '@xyflow/react';
import AppLayout from '../components/AppLayout';
import FlowCanvas, { type FlowCanvasHandle } from '../components/flows/FlowCanvas';
import FlowLogPanel from '../components/flows/FlowLogPanel';
import FlowNodeInspector from '../components/flows/FlowNodeInspector';
import FlowOperationPalette from '../components/flows/FlowOperationPalette';
import FlowTriggerInspector from '../components/flows/FlowTriggerInspector';
import {
  fetchFlow,
  saveFlowGraph,
  triggerFlow,
  updateFlow,
  type FlowOperation,
  type FlowSummary,
} from '../lib/api';
import { getOperationCatalogEntry } from '../lib/flows/operationCatalog';
import {
  TRIGGER_NODE_ID,
  buildEditorMap,
  flowGraphToApi,
  type FlowNodeData,
  type OperationOptionsState,
} from '../lib/flows/flowGraphUtils';

type EditorTab = 'design' | 'logs';

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<FlowCanvasHandle>(null);
  const [flow, setFlow] = useState<FlowSummary | null>(null);
  const [operations, setOperations] = useState<FlowOperation[]>([]);
  const [editorMap, setEditorMap] = useState<Map<string, OperationOptionsState>>(new Map());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(TRIGGER_NODE_ID);
  const [tab, setTab] = useState<EditorTab>('design');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [graphEpoch, setGraphEpoch] = useState(0);
  const graphRef = useRef<{ nodes: Node<FlowNodeData>[]; edges: Edge[] }>({ nodes: [], edges: [] });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFlow(id);
      setFlow(result.flow);
      setOperations(result.operations);
      setEditorMap(buildEditorMap(result.operations));
      setGraphEpoch((epoch) => epoch + 1);
      setSelectedNodeId(TRIGGER_NODE_ID);
      setDirty(false);
    } catch {
      setError('Failed to load flow');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function confirmLeave(event: React.MouseEvent<HTMLAnchorElement>) {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      event.preventDefault();
    }
  }

  const selectedNode = useMemo(
    () => graphRef.current.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, graphEpoch, dirty],
  );

  const selectedOperation = selectedNodeId && selectedNodeId !== TRIGGER_NODE_ID
    ? editorMap.get(selectedNodeId) ?? null
    : null;

  function markDirty() {
    setDirty(true);
  }

  function handleGraphChange(nodes: Node<FlowNodeData>[], edges: Edge[]) {
    graphRef.current = { nodes, edges };
    markDirty();
  }

  function handleAddOperation(type: string, label: string) {
    const entry = getOperationCatalogEntry(type);
    const connectFrom =
      selectedNodeId && selectedNodeId !== TRIGGER_NODE_ID ? selectedNodeId : TRIGGER_NODE_ID;
    const created = canvasRef.current?.addOperation(type, label, connectFrom);
    if (!created) return;

    setEditorMap((current) => {
      const next = new Map(current);
      next.set(created.nodeId, {
        key: created.operationKey,
        name: label,
        type,
        options: { ...(entry?.defaultOptions ?? {}) },
      });
      return next;
    });
    setSelectedNodeId(created.nodeId);
    markDirty();
  }

  function handleOperationChange(updates: Partial<OperationOptionsState>) {
    if (!selectedNodeId) return;
    setEditorMap((current) => {
      const next = new Map(current);
      const existing = next.get(selectedNodeId);
      if (!existing) return current;
      const merged = { ...existing, ...updates, options: updates.options ?? existing.options };
      next.set(selectedNodeId, merged);
      return next;
    });
    if (updates.name && selectedNodeId) {
      canvasRef.current?.updateNodeLabel(selectedNodeId, updates.name);
    }
    markDirty();
  }

  async function handleSave() {
    if (!flow) return;
    setSaving(true);
    setError(null);
    try {
      const graph = canvasRef.current?.getGraph() ?? graphRef.current;
      const serialized = flowGraphToApi(graph.nodes, graph.edges, editorMap);
      const result = await saveFlowGraph(flow.id, {
        flow: {
          name: flow.name,
          status: flow.status,
          trigger_type: flow.trigger_type,
          trigger_options: flow.trigger_options,
          accountability: flow.accountability,
          operation: serialized.entry_operation,
        },
        operations: serialized.operations,
      });
      setFlow(result.flow);
      setOperations(result.operations);
      setEditorMap(buildEditorMap(result.operations));
      setGraphEpoch((epoch) => epoch + 1);
      setDirty(false);
    } catch {
      setError('Failed to save flow graph');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!flow) return;
    try {
      const next = flow.status === 'active' ? 'inactive' : 'active';
      const updated = await updateFlow(flow.id, { status: next });
      setFlow({ ...flow, ...updated });
    } catch {
      setError('Failed to update flow status');
    }
  }

  function parseManualPayload(triggerOptions: Record<string, unknown> | null | undefined) {
    const hint = triggerOptions?.payloadHint;
    if (typeof hint === 'string' && hint.trim()) {
      try {
        return JSON.parse(hint) as Record<string, unknown>;
      } catch {
        /* fall through to default payload */
      }
    }
    return { source: 'admin-ui', timestamp: new Date().toISOString() };
  }

  async function handleRun() {
    if (!flow) return;
    try {
      await triggerFlow(flow.id, parseManualPayload(flow.trigger_options));
      setTab('logs');
    } catch {
      setError('Failed to run flow');
    }
  }

  if (loading || !flow) {
    return (
      <AppLayout title="Triggers" breadcrumbs={[{ label: 'Triggers', to: '/settings/triggers' }, { label: 'Editor' }]}>
        <div className="dm-empty text-sm">{loading ? 'Loading flow…' : 'Flow not found'}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      fullWidth
      title={flow.name}
      subtitle="Visual flow editor"
      breadcrumbs={[
        { label: 'Triggers', to: '/settings/triggers' },
        { label: flow.name },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/settings/triggers" className="btn-secondary text-sm" onClick={confirmLeave}>
            Back
          </Link>
          <button type="button" className="btn-secondary text-sm" onClick={() => void handleToggleStatus()}>
            {flow.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          {flow.trigger_type === 'manual' ? (
            <button type="button" className="btn-secondary text-sm" onClick={() => void handleRun()}>
              Run
            </button>
          ) : null}
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      }
    >
      {error ? <div className="alert-error mb-4">{error}</div> : null}

      <div className="flow-editor-toolbar">
        <div className="flow-editor-tabs">
          <button
            type="button"
            className={`flow-editor-tab ${tab === 'design' ? 'flow-editor-tab-active' : ''}`}
            onClick={() => setTab('design')}
          >
            <span className="material-symbols-outlined text-base">account_tree</span>
            Design
          </button>
          <button
            type="button"
            className={`flow-editor-tab ${tab === 'logs' ? 'flow-editor-tab-active' : ''}`}
            onClick={() => setTab('logs')}
          >
            <span className="material-symbols-outlined text-base">history</span>
            Logs
          </button>
        </div>
        <div className="flow-editor-meta">
          <span className={`badge ${flow.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
            {flow.status}
          </span>
          {dirty ? (
            <span className="flow-editor-unsaved">
              <span className="flow-editor-unsaved-dot" />
              Unsaved changes
            </span>
          ) : (
            <span className="text-xs text-slate-500">All changes saved</span>
          )}
        </div>
      </div>

      {tab === 'logs' ? (
        <FlowLogPanel flow={flow} />
      ) : (
        <div className="flow-editor-layout">
          <aside className="flow-editor-sidebar">
            <FlowOperationPalette onAdd={handleAddOperation} />
          </aside>

          <div className="flow-editor-canvas-wrap">
            <FlowCanvas
              key={`${flow.id}-${graphEpoch}`}
              ref={canvasRef}
              flow={flow}
              operations={operations}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onGraphChange={handleGraphChange}
            />
          </div>

          <aside className="flow-editor-inspector">
            <div className="flow-inspector-header">
              <span className="material-symbols-outlined text-base text-slate-500">
                {selectedNodeId === TRIGGER_NODE_ID ? 'bolt' : 'tune'}
              </span>
              <span>{selectedNodeId === TRIGGER_NODE_ID ? 'Trigger setup' : 'Operation setup'}</span>
            </div>
            <div className="flow-inspector-body">
              {selectedNodeId === TRIGGER_NODE_ID ? (
                <FlowTriggerInspector
                  flow={flow}
                  onChange={(updates) => {
                    setFlow({ ...flow, ...updates });
                    markDirty();
                  }}
                />
              ) : (
                <FlowNodeInspector
                  node={selectedNode}
                  operation={selectedOperation}
                  onChange={handleOperationChange}
                  currentFlowId={flow.id}
                />
              )}
            </div>
          </aside>
        </div>
      )}
    </AppLayout>
  );
}
