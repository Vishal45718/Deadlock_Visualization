import { useMemo, useState } from 'react';
import type { PointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import useStore from '../store';
import type { GraphNode } from '../types';

const NODE_SIZE = 60;
const RESOURCE_SIZE = 72;

function Canvas() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const selectedSourceId = useStore((state) => state.selectedSourceId);
  const deadlockedProcessIds = useStore((state) => state.deadlockedProcessIds);
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const connectNodes = useStore((state) => state.connectNodes);
  const setSelectedSourceId = useStore((state) => state.setSelectedSourceId);
  const updateResourceCount = useStore((state) => state.updateResourceCount);
  const removeNode = useStore((state) => state.removeNode);
  const removeEdge = useStore((state) => state.removeEdge);

  const highlightedNodeIds = useStore((state) => state.highlightedNodeIds);
  const highlightedEdgeIds = useStore((state) => state.highlightedEdgeIds);

  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes]);

  const handlePointerDown = (event: PointerEvent<SVGCircleElement | SVGRectElement>, node: GraphNode) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    setDragState({
      id: node.id,
      offsetX: event.clientX - rect.left - node.x,
      offsetY: event.clientY - rect.top - node.y
    });
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragState) return;
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left - dragState.offsetX;
    const y = event.clientY - rect.top - dragState.offsetY;
    updateNodePosition(dragState.id, Math.max(40, Math.min(x, rect.width - 80)), Math.max(40, Math.min(y, rect.height - 80)));
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  const handleNodeClick = (node: GraphNode) => {
    if (selectedSourceId && selectedSourceId !== node.id) {
      connectNodes(selectedSourceId, node.id);
      return;
    }
    setSelectedSourceId(node.id === selectedSourceId ? undefined : node.id);
  };
  
  const handleNodeContextMenu = (event: ReactMouseEvent, node: GraphNode) => {
    event.preventDefault();
    if (node.type === 'resource') {
      const delta = event.shiftKey ? -1 : 1;
      updateResourceCount(node.id, delta);
    } else {
      removeNode(node.id);
    }
  };

  const renderEdge = (edge: typeof edges[number]) => {
    const source = nodeMap[edge.from];
    const target = nodeMap[edge.to];
    if (!source || !target) return null;
    const sx = source.x + (source.type === 'process' ? NODE_SIZE / 2 : RESOURCE_SIZE / 2);
    const sy = source.y + (source.type === 'process' ? NODE_SIZE / 2 : RESOURCE_SIZE / 2);
    const tx = target.x + (target.type === 'process' ? NODE_SIZE / 2 : RESOURCE_SIZE / 2);
    const ty = target.y + (target.type === 'process' ? NODE_SIZE / 2 : RESOURCE_SIZE / 2);

    const isHighlighted = highlightedEdgeIds.includes(edge.id);
    // Determine target radius based on node type
    const targetRadius = target.type === 'process' ? NODE_SIZE / 2 : RESOURCE_SIZE / 2;
    const dx = tx - sx;
    const dy = ty - sy;
    const length = Math.sqrt(dx * dx + dy * dy);
    // Shift slightly back if target is square vs circle, but standard length reduction is good enough
    const offset = targetRadius + (isHighlighted ? 4 : 2);
    const targetX = tx - (dx / length) * offset;
    const targetY = ty - (dy / length) * offset;

    const strokeColor = isHighlighted ? '#eab308' : (edge.type === 'allocation' ? '#10b981' : '#0ea5e9');
    
    return (
      <g key={edge.id} onClick={(e) => { e.stopPropagation(); removeEdge(edge.id); }} onContextMenu={(e) => { e.preventDefault(); removeEdge(edge.id); }} style={{ cursor: 'pointer' }}>
        <defs>
          <marker id={`arrow-${edge.id}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={strokeColor} />
          </marker>
        </defs>
        <line
          x1={sx}
          y1={sy}
          x2={targetX}
          y2={targetY}
          stroke={strokeColor}
          strokeWidth={isHighlighted ? 5 : 3}
          strokeDasharray={edge.type === 'request' ? '8 6' : '0'}
          markerEnd={`url(#arrow-${edge.id})`}
          opacity={isHighlighted ? 1 : 0.7}
          className="transition-all duration-300"
        />
        <line x1={sx} y1={sy} x2={targetX} y2={targetY} stroke="transparent" strokeWidth={20} />
      </g>
    );
  };

  return (
    <div className="relative h-[640px] overflow-hidden rounded-3xl border border-white/5 bg-slate-950 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.1),rgba(255,255,255,0))]"></div>
      
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md px-4 py-3 text-xs text-slate-300 font-medium leading-relaxed shadow-lg">
          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-cyan-400"></div> Click node to Select / Drag to Move</div>
          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Select Source → Select Dest to Connect</div>
          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Right-Click Resource to +1 instance (Shift+RC to -1)</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Right-Click Process or Edge to Delete</div>
        </div>
      </div>
      
      <svg
        className="relative h-full w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedSourceId(undefined);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {edges.map(renderEdge)}
        {nodes.map((node) => {
          const isDeadlocked = deadlockedProcessIds.includes(node.id);
          const isSelected = node.id === selectedSourceId;
          const isHighlighted = highlightedNodeIds.includes(node.id);
          
          let fillClass = '#1e293b'; 
          if (node.type === 'process') fillClass = isDeadlocked ? '#450a0a' : '#0f172a';
          else fillClass = '#020617';
          
          let strokeClass = '#334155';
          if (isSelected) strokeClass = '#38bdf8';
          else if (isHighlighted) strokeClass = '#eab308';
          else if (isDeadlocked) strokeClass = '#ef4444';

          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="transition-transform duration-200">
              {node.type === 'process' ? (
                <g>
                  <circle
                    cx={NODE_SIZE / 2}
                    cy={NODE_SIZE / 2}
                    r={NODE_SIZE / 2}
                    fill={fillClass}
                    stroke={strokeClass}
                    strokeWidth={isSelected || isHighlighted ? 4 : 2}
                    filter={isHighlighted || isDeadlocked ? "url(#glow)" : undefined}
                    onPointerDown={(event) => handlePointerDown(event, node)}
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                    onContextMenu={(e) => handleNodeContextMenu(e, node)}
                    style={{ cursor: 'grab' }}
                    className="transition-all duration-300 hover:brightness-125"
                  />
                  <text x={NODE_SIZE / 2} y={NODE_SIZE / 2 + 6} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#f1f5f9" pointerEvents="none">
                    {node.label}
                  </text>
                  {isDeadlocked && (
                    <circle cx={NODE_SIZE} cy={0} r={6} fill="#ef4444" />
                  )}
                </g>
              ) : (
                <g>
                  <rect
                    x={0}
                    y={0}
                    width={RESOURCE_SIZE}
                    height={RESOURCE_SIZE}
                    rx={16}
                    fill={fillClass}
                    stroke={strokeClass}
                    strokeWidth={isSelected || isHighlighted ? 4 : 2}
                    filter={isHighlighted ? "url(#glow)" : undefined}
                    onPointerDown={(event) => handlePointerDown(event, node)}
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                    onContextMenu={(e) => handleNodeContextMenu(e, node)}
                    style={{ cursor: 'grab' }}
                    className="transition-all duration-300 hover:brightness-125"
                  />
                  <text x={RESOURCE_SIZE / 2} y={RESOURCE_SIZE / 2 - 4} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#f1f5f9" pointerEvents="none">
                    {node.label}
                  </text>
                  <circle cx={RESOURCE_SIZE / 2} cy={RESOURCE_SIZE / 2 + 16} r={10} fill="#38bdf8" fillOpacity="0.2" pointerEvents="none" />
                  <text x={RESOURCE_SIZE / 2} y={RESOURCE_SIZE / 2 + 20} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#38bdf8" pointerEvents="none">
                    {node.count ?? 1} 
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default Canvas;
