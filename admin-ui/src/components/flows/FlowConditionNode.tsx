import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../lib/flows/flowGraphUtils';

export default function FlowConditionNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div className={`flow-node flow-node-condition ${selected ? 'flow-node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" className="flow-handle flow-handle-in" />
      <div
        className="flow-node-header"
        style={{
          backgroundColor: 'var(--flow-node-condition-bg)',
          borderBottomColor: 'color-mix(in srgb, var(--flow-node-condition) 20%, var(--app-border))',
        }}
      >
        <span
          className="material-symbols-outlined flow-node-icon"
          style={{ color: 'var(--flow-node-condition)' }}
        >
          call_split
        </span>
        <div className="min-w-0 flex-1">
          <p className="flow-node-category" style={{ color: 'var(--flow-node-condition)' }}>
            Condition
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
        style={{ top: '38%' }}
        className="flow-handle flow-handle-resolve"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="reject"
        style={{ top: '68%' }}
        className="flow-handle flow-handle-reject"
      />
      <span className="flow-handle-label flow-handle-label-resolve">Pass</span>
      <span className="flow-handle-label flow-handle-label-reject">Fail</span>
    </div>
  );
}
