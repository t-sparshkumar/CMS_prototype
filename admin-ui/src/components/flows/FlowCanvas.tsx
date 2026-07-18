import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import FlowConditionNode from './FlowConditionNode';
import FlowOperationNode from './FlowOperationNode';
import FlowTriggerNode from './FlowTriggerNode';
import {
  TRIGGER_NODE_ID,
  apiToFlowGraph,
  buildConnectEdge,
  computeNextNodePosition,
  createOperationNode,
  type FlowNodeData,
} from '../../lib/flows/flowGraphUtils';
import type { FlowOperation, FlowSummary } from '../../lib/api';

const nodeTypes = {
  trigger: FlowTriggerNode,
  operation: FlowOperationNode,
  condition: FlowConditionNode,
};

const FIT_VIEW_OPTIONS = { padding: 0.35, maxZoom: 1.05, minZoom: 0.75, duration: 200 };

export interface FlowCanvasHandle {
  addOperation: (
    type: string,
    label: string,
    connectFromId: string | null,
  ) => { nodeId: string; operationKey: string };
  removeNode: (nodeId: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  getGraph: () => { nodes: Node<FlowNodeData>[]; edges: Edge[] };
}

interface FlowCanvasProps {
  flow: FlowSummary;
  operations: FlowOperation[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onGraphChange: (nodes: Node<FlowNodeData>[], edges: Edge[]) => void;
}

function edgeFromConnection(connection: Connection): Edge {
  const isReject = connection.sourceHandle === 'reject';
  return {
    ...buildConnectEdge(
      connection.source ?? '',
      connection.target ?? '',
      isReject ? 'reject' : 'resolve',
    ),
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isReject ? 'var(--flow-edge-reject)' : 'var(--flow-edge-resolve)',
    },
  };
}

const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(function FlowCanvas(
  { flow, operations, selectedNodeId, onSelectNode, onGraphChange },
  ref,
) {
  const initial = useMemo(() => apiToFlowGraph(flow, operations), [flow, operations]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const loadedFlowId = useRef(flow.id);
  const flowInstance = useRef<ReactFlowInstance<Node<FlowNodeData>, Edge> | null>(null);
  const lastFitCount = useRef(0);

  const fitCanvas = useCallback(() => {
    requestAnimationFrame(() => {
      void flowInstance.current?.fitView(FIT_VIEW_OPTIONS);
    });
  }, []);

  useEffect(() => {
    if (loadedFlowId.current === flow.id) {
      return;
    }
    loadedFlowId.current = flow.id;
    const graph = apiToFlowGraph(flow, operations);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    lastFitCount.current = 0;
    fitCanvas();
  }, [flow, operations, setEdges, setNodes, fitCanvas]);

  useEffect(() => {
    onGraphChange(nodes, edges);
  }, [nodes, edges, onGraphChange]);

  useEffect(() => {
    if (nodes.length === lastFitCount.current) {
      return;
    }
    lastFitCount.current = nodes.length;
    fitCanvas();
  }, [nodes.length, fitCanvas]);

  useImperativeHandle(
    ref,
    () => ({
      addOperation(type, label, connectFromId) {
        const position = computeNextNodePosition(nodes);
        const node = createOperationNode(type, label, position);
        const operationKey = node.data.operationKey ?? node.id;
        const sourceId = connectFromId ?? TRIGGER_NODE_ID;

        setNodes((current) => [...current, node]);

        const sourceExists =
          sourceId === TRIGGER_NODE_ID || nodes.some((entry) => entry.id === sourceId);
        if (sourceExists) {
          setEdges((current) => {
            const duplicate = current.some(
              (edge) => edge.source === sourceId && edge.target === node.id,
            );
            if (duplicate) return current;
            return [
              ...current,
              {
                ...buildConnectEdge(sourceId, node.id, 'resolve'),
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: 'var(--flow-edge-resolve)',
                },
              },
            ];
          });
        }

        return { nodeId: node.id, operationKey };
      },
      removeNode(nodeId) {
        if (nodeId === TRIGGER_NODE_ID) return;
        setNodes((current) => current.filter((node) => node.id !== nodeId));
        setEdges((current) =>
          current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        );
      },
      updateNodeLabel(nodeId, label) {
        setNodes((current) =>
          current.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, label } } : node,
          ),
        );
      },
      getGraph() {
        return { nodes, edges };
      },
    }),
    [edges, nodes, setEdges, setNodes],
  );

  const handleNodesChange: OnNodesChange<Node<FlowNodeData>> = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const onInit = useCallback(
    (instance: ReactFlowInstance<Node<FlowNodeData>, Edge>) => {
      flowInstance.current = instance;
      fitCanvas();
    },
    [fitCanvas],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(edgeFromConnection(connection), eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<FlowNodeData>) => {
      onSelectNode(node.id);
    },
    [onSelectNode],
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(TRIGGER_NODE_ID);
  }, [onSelectNode]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }
      if (!selectedNodeId || selectedNodeId === TRIGGER_NODE_ID) {
        return;
      }
      setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
      setEdges((current) =>
        current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
      );
      onSelectNode(TRIGGER_NODE_ID);
    },
    [onSelectNode, selectedNodeId, setEdges, setNodes],
  );

  const disconnectedCount = useMemo(() => {
    const connected = new Set<string>();
    for (const edge of edges) {
      connected.add(edge.source);
      connected.add(edge.target);
    }
    return nodes.filter(
      (node) => node.id !== TRIGGER_NODE_ID && !connected.has(node.id),
    ).length;
  }, [edges, nodes]);

  return (
    <div className="flow-canvas-shell" onKeyDown={onKeyDown} tabIndex={0}>
      {disconnectedCount > 0 ? (
        <div className="flow-canvas-hint">
          <span className="material-symbols-outlined text-base">info</span>
          {disconnectedCount} node{disconnectedCount === 1 ? '' : 's'} not connected — drag from a
          green handle to link steps, or click an operation while a node is selected to auto-connect.
        </div>
      ) : null}
      <ReactFlow<Node<FlowNodeData>, Edge>
        className="flow-canvas"
        nodes={nodes.map((node) => ({
          ...node,
          selected: node.id === selectedNodeId,
        }))}
        edges={edges}
        onInit={onInit}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        snapToGrid
        snapGrid={[20, 20]}
        connectionLineStyle={{ stroke: 'var(--flow-edge-resolve)', strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 2 },
        }}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="var(--flow-canvas-grid)" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          className="flow-minimap"
          maskColor="var(--flow-canvas-minimap-mask)"
          nodeStrokeWidth={2}
        />
      </ReactFlow>
    </div>
  );
});

export default FlowCanvas;
