import { useEffect, useState } from 'react';
import type { Node } from '@xyflow/react';
import FlowTemplateInput from './FlowTemplateInput';
import { getOperationCatalogEntry } from '../../lib/flows/operationCatalog';
import type { FlowNodeData } from '../../lib/flows/flowGraphUtils';
import { fetchCollections, fetchFlows, type CollectionMeta, type FlowSummary } from '../../lib/api';

import type { OperationOptionsState } from '../../lib/flows/flowGraphUtils';

interface FlowNodeInspectorProps {
  node: Node<FlowNodeData> | null;
  operation: OperationOptionsState | null;
  onChange: (updates: Partial<OperationOptionsState>) => void;
  currentFlowId?: string;
}

function jsonString(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
  }
}

export default function FlowNodeInspector({
  node,
  operation,
  onChange,
  currentFlowId,
}: FlowNodeInspectorProps) {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [flows, setFlows] = useState<FlowSummary[]>([]);

  useEffect(() => {
    void fetchCollections().then(setCollections);
    void fetchFlows().then(setFlows);
  }, []);

  const operationFlows = flows.filter(
    (entry) => entry.trigger_type === 'operation' && entry.id !== currentFlowId,
  );

  if (!node || !operation) {
    return (
      <div className="flow-inspector-empty">
        <span className="material-symbols-outlined flow-inspector-empty-icon">touch_app</span>
        <p className="text-sm font-medium text-slate-700">Select a node</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Click any step on the canvas to configure its settings, or select the trigger node to edit
          flow options.
        </p>
      </div>
    );
  }

  const entry = getOperationCatalogEntry(operation.type);
  const options = operation.options ?? entry?.defaultOptions ?? {};

  function setOption(key: string, value: unknown) {
    onChange({ options: { ...options, [key]: value } });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">Display name</span>
        <input
          type="text"
          className="input"
          value={operation.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="label">Operation key</span>
        <input
          type="text"
          className="input font-mono text-xs"
          value={operation.key}
          onChange={(e) => onChange({ key: e.target.value })}
        />
      </label>

      <p className="text-xs text-slate-500">
        Type: <span className="font-medium text-slate-700">{entry?.label ?? operation.type}</span>
      </p>

      {operation.type === 'condition' ? (
        <label className="block">
          <span className="label">Filter JSON</span>
          <textarea
            className="input min-h-[160px] font-mono text-xs"
            value={jsonString(options.filter, '{\n  "scope": "$trigger.payload"\n}')}
            onChange={(e) => {
              try {
                setOption('filter', JSON.parse(e.target.value));
              } catch {
                /* keep editing */
              }
            }}
          />
        </label>
      ) : null}

      {operation.type.startsWith('item-') ? (
        <>
          <label className="block">
            <span className="label">Collection</span>
            <select
              className="input"
              value={String(options.collection ?? '')}
              onChange={(e) => setOption('collection', e.target.value)}
            >
              <option value="">Select collection</option>
              {collections.map((collection) => (
                <option key={collection.collection} value={collection.collection}>
                  {collection.collection}
                </option>
              ))}
            </select>
          </label>
          {operation.type === 'item-read' ? (
            <>
              <FlowTemplateInput
                label="Item ID"
                value={String(options.id ?? options.key ?? '')}
                onChange={(value) => setOption('id', value)}
              />
              <label className="block">
                <span className="label">Query JSON</span>
                <textarea
                  className="input min-h-[120px] font-mono text-xs"
                  value={jsonString(options.query, '{\n  "limit": 100\n}')}
                  onChange={(e) => {
                    try {
                      setOption('query', JSON.parse(e.target.value));
                    } catch {
                      /* keep editing */
                    }
                  }}
                />
              </label>
            </>
          ) : null}
          {operation.type === 'item-create' || operation.type === 'item-update' ? (
            <label className="block">
              <span className="label">Payload JSON</span>
              <textarea
                className="input min-h-[120px] font-mono text-xs"
                value={jsonString(options.payload)}
                onChange={(e) => {
                  try {
                    setOption('payload', JSON.parse(e.target.value));
                  } catch {
                    /* keep editing */
                  }
                }}
              />
            </label>
          ) : null}
          {operation.type === 'item-update' || operation.type === 'item-delete' ? (
            <FlowTemplateInput
              label="Item key"
              value={String(options.key ?? options.id ?? '')}
              onChange={(value) => setOption('key', value)}
            />
          ) : null}
        </>
      ) : null}

      {operation.type === 'request' ? (
        <>
          <label className="block">
            <span className="label">Method</span>
            <select
              className="input"
              value={String(options.method ?? 'POST')}
              onChange={(e) => setOption('method', e.target.value)}
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <FlowTemplateInput
            label="URL"
            value={String(options.url ?? '')}
            onChange={(value) => setOption('url', value)}
          />
          <label className="block">
            <span className="label">Headers JSON</span>
            <textarea
              className="input min-h-[80px] font-mono text-xs"
              value={jsonString(options.headers, '{}')}
              onChange={(e) => {
                try {
                  setOption('headers', JSON.parse(e.target.value));
                } catch {
                  /* keep editing */
                }
              }}
            />
          </label>
          <FlowTemplateInput
            label="Body"
            value={typeof options.body === 'string' ? options.body : jsonString(options.body, 'null')}
            onChange={(value) => setOption('body', value)}
            multiline
          />
        </>
      ) : null}

      {operation.type === 'exec' ? (
        <label className="block">
          <span className="label">JavaScript</span>
          <textarea
            className="input min-h-[180px] font-mono text-xs"
            value={String(options.code ?? '')}
            onChange={(e) => setOption('code', e.target.value)}
          />
        </label>
      ) : null}

      {operation.type === 'mail' ? (
        <>
          <FlowTemplateInput
            label="To"
            value={String(options.to ?? '')}
            onChange={(value) => setOption('to', value)}
          />
          <FlowTemplateInput
            label="Subject"
            value={String(options.subject ?? '')}
            onChange={(value) => setOption('subject', value)}
          />
          <FlowTemplateInput
            label="Body"
            value={String(options.body ?? options.text ?? '')}
            onChange={(value) => setOption('body', value)}
            multiline
          />
        </>
      ) : null}

      {operation.type === 'trigger' ? (
        <>
          <label className="block">
            <span className="label">Target flow</span>
            <select
              className="input"
              value={String(options.flow ?? '')}
              onChange={(e) => setOption('flow', e.target.value)}
            >
              <option value="">Select flow</option>
              {operationFlows.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Payload JSON</span>
            <textarea
              className="input min-h-[100px] font-mono text-xs"
              value={jsonString(options.payload, '{}')}
              onChange={(e) => {
                try {
                  setOption('payload', JSON.parse(e.target.value));
                } catch {
                  /* keep editing */
                }
              }}
            />
          </label>
        </>
      ) : null}

      {operation.type === 'log' ? (
        <FlowTemplateInput
          label="Message"
          value={String(options.message ?? '')}
          onChange={(value) => setOption('message', value)}
          multiline
        />
      ) : null}
    </div>
  );
}
