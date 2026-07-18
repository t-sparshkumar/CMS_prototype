import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { getOperationCatalogEntry } from '../../lib/flows/operationCatalog';
import type { FlowNodeData } from '../../lib/flows/flowGraphUtils';

export default function FlowOperationNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const entry = getOperationCatalogEntry(data.operationType ?? 'log');
  const accentVar = entry?.accentVar ?? '--flow-node-default';
  const accentBgVar = entry?.accentBgVar ?? '--flow-node-default-bg';

  return (
    <div className={`flow-node flow-node-operation ${selected ? 'flow-node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" className="flow-handle flow-handle-in" />
      <div
        className="flow-node-header"
        style={{
          backgroundColor: `var(${accentBgVar})`,
          borderBottomColor: `color-mix(in srgb, var(${accentVar}) 20%, var(--app-border))`,
        }}
      >
        <span
          className="material-symbols-outlined flow-node-icon"
          style={{ color: `var(${accentVar})` }}
        >
          {entry?.icon ?? 'settings'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flow-node-category" style={{ color: `var(${accentVar})` }}>
            {entry?.label ?? data.operationType}
          </p>
          <p className="flow-node-title">{data.label}</p>
        </div>
      </div>
      <div className="flow-node-body">
        <p className="flow-node-key">{data.operationKey}</p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="resolve"
        className="flow-handle flow-handle-resolve"
      />
      <span className="flow-handle-label flow-handle-label-resolve">Next</span>
    </div>
  );
}
