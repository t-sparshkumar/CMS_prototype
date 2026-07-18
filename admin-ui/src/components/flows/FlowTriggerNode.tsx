import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { TRIGGER_CATALOG } from '../../lib/flows/triggerCatalog';
import type { FlowNodeData } from '../../lib/flows/flowGraphUtils';

export default function FlowTriggerNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const catalog =
    TRIGGER_CATALOG.find((entry) => entry.type === data.triggerType) ??
    TRIGGER_CATALOG[0] ?? {
      type: 'manual' as const,
      label: 'Manual',
      description: 'Trigger from the admin UI or API',
    };

  return (
    <div className={`flow-node flow-node-trigger ${selected ? 'flow-node-selected' : ''}`}>
      <div
        className="flow-node-header"
        style={{
          backgroundColor: 'var(--flow-node-trigger-bg)',
          borderBottomColor: 'color-mix(in srgb, var(--flow-node-trigger) 20%, var(--app-border))',
        }}
      >
        <span
          className="material-symbols-outlined flow-node-icon"
          style={{ color: 'var(--flow-node-trigger)' }}
        >
          bolt
        </span>
        <div className="min-w-0 flex-1">
          <p className="flow-node-category" style={{ color: 'var(--flow-node-trigger)' }}>
            Trigger
          </p>
          <p className="flow-node-title">{catalog.label}</p>
        </div>
      </div>
      <div className="flow-node-body">
        <p className="flow-node-desc">{catalog.description}</p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="resolve"
        className="flow-handle flow-handle-resolve"
      />
      <span className="flow-handle-label flow-handle-label-resolve">Start</span>
    </div>
  );
}
