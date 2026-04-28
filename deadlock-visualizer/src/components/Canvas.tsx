import { useMemo, useState, useCallback } from 'react';
import type { PointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import useStore from '../store';
import type { GraphNode } from '../types';

const NODE_R   = 32;  // process circle radius
const RES_SIZE = 68;  // resource rect width/height

// ─── Edge Renderer ─────────────────────────────────────────────────────────────

interface EdgeProps {
  edge: { id: string; from: string; to: string; type: 'request' | 'allocation' };
  nodeMap: Record<string, GraphNode>;
  isHighlighted: boolean;
  isDeadlockEdge: boolean;
  onRemove: (id: string) => void;
}

function Edge({ edge, nodeMap, isHighlighted, isDeadlockEdge, onRemove }: EdgeProps) {
  const source = nodeMap[edge.from];
  const target = nodeMap[edge.to];
  if (!source || !target) return null;

  const sx = source.x + (source.type === 'process' ? NODE_R : RES_SIZE / 2);
  const sy = source.y + (source.type === 'process' ? NODE_R : RES_SIZE / 2);
  const tx = target.x + (target.type === 'process' ? NODE_R : RES_SIZE / 2);
  const ty = target.y + (target.type === 'process' ? NODE_R : RES_SIZE / 2);

  const targetRadius = target.type === 'process' ? NODE_R : RES_SIZE / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = targetRadius + 6;
  const targetX = tx - (dx / length) * offset;
  const targetY = ty - (dy / length) * offset;

  let strokeColor: string;
  let glowColor: string;
  if (isDeadlockEdge || isHighlighted) {
    strokeColor = '#ef4444';
    glowColor   = 'rgba(239,68,68,0.6)';
  } else if (edge.type === 'allocation') {
    strokeColor = '#10b981';
    glowColor   = 'rgba(16,185,129,0.4)';
  } else {
    strokeColor = '#38bdf8';
    glowColor   = 'rgba(56,189,248,0.4)';
  }

  const strokeWidth = isHighlighted || isDeadlockEdge ? 4 : 2.5;
  const markerId    = `arrow-${edge.id}`;

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onRemove(edge.id); }}
      onContextMenu={(e) => { e.preventDefault(); onRemove(edge.id); }}
      style={{ cursor: 'pointer' }}
    >
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={strokeColor} />
        </marker>
        {(isHighlighted || isDeadlockEdge) && (
          <filter id={`glow-edge-${edge.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>
      {/* Invisible hit area */}
      <line x1={sx} y1={sy} x2={targetX} y2={targetY} stroke="transparent" strokeWidth={24} />
      {/* Glow */}
      {(isHighlighted || isDeadlockEdge) && (
        <line x1={sx} y1={sy} x2={targetX} y2={targetY} stroke={glowColor} strokeWidth={strokeWidth + 6} strokeLinecap="round" opacity={0.5} />
      )}
      {/* Edge */}
      <line
        x1={sx} y1={sy} x2={targetX} y2={targetY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={edge.type === 'request' ? '8 5' : '0'}
        markerEnd={`url(#${markerId})`}
        opacity={0.9}
        className="transition-all duration-300"
      />
    </g>
  );
}

// ─── Node Renderer ─────────────────────────────────────────────────────────────

interface NodeRendererProps {
  node: GraphNode;
  isDeadlocked: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  allocatedCount: number;
  onPointerDown: (e: PointerEvent<SVGCircleElement | SVGRectElement>, node: GraphNode) => void;
  onClick: (node: GraphNode) => void;
  onContextMenu: (e: ReactMouseEvent, node: GraphNode) => void;
}

function NodeRenderer({ node, isDeadlocked, isSelected, isHighlighted, allocatedCount, onPointerDown, onClick, onContextMenu }: NodeRendererProps) {
  const isProcess = node.type === 'process';

  let fill: string, stroke: string, strokeWidth: number;
  if (isProcess) {
    fill        = isDeadlocked ? '#3b0a0a' : '#0f1a2e';
    stroke      = isSelected ? '#38bdf8' : isHighlighted ? '#f59e0b' : isDeadlocked ? '#ef4444' : '#1e3a5f';
    strokeWidth = isSelected || isHighlighted || isDeadlocked ? 3.5 : 2;
  } else {
    fill        = '#0a1628';
    stroke      = isSelected ? '#38bdf8' : isHighlighted ? '#f59e0b' : '#1e3f6e';
    strokeWidth = isSelected || isHighlighted ? 3.5 : 2;
  }

  const glowId   = `node-glow-${node.id}`;
  const totalInstances = node.count ?? 1;
  // Render up to 6 dots inside resource box
  const showDots = totalInstances <= 6;

  return (
    <g transform={`translate(${node.x}, ${node.y})`} className="transition-transform duration-200">
      <defs>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={isDeadlocked ? 8 : 5} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {isProcess && (
          <radialGradient id={`pg-${node.id}`} cx="40%" cy="35%" r="65%">
            <stop offset="0%"   stopColor={isDeadlocked ? '#7f1d1d' : isSelected ? '#1e4a6e' : '#1a2f4a'} />
            <stop offset="100%" stopColor={isDeadlocked ? '#200505' : '#070d1a'} />
          </radialGradient>
        )}
        {!isProcess && (
          <linearGradient id={`rg-${node.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#0f1f3a" />
            <stop offset="100%" stopColor="#050d1a" />
          </linearGradient>
        )}
      </defs>

      {isProcess ? (
        <>
          {(isDeadlocked || isSelected || isHighlighted) && (
            <circle cx={NODE_R} cy={NODE_R} r={NODE_R + 6} fill="none"
              stroke={isDeadlocked ? '#ef4444' : isSelected ? '#38bdf8' : '#f59e0b'}
              strokeWidth={2} opacity={0.4} filter={`url(#${glowId})`}
            />
          )}
          <circle
            cx={NODE_R} cy={NODE_R} r={NODE_R}
            fill={`url(#pg-${node.id})`} stroke={stroke} strokeWidth={strokeWidth}
            filter={(isDeadlocked || isHighlighted) ? `url(#${glowId})` : undefined}
            onPointerDown={(e) => onPointerDown(e, node)}
            onClick={(e) => { e.stopPropagation(); onClick(node); }}
            onContextMenu={(e) => onContextMenu(e, node)}
            style={{ cursor: 'grab' }}
            className="transition-all duration-300 hover:brightness-125"
          />
          <text x={NODE_R} y={NODE_R + 6} textAnchor="middle" fontSize="16" fontWeight="800" fill="#f1f5f9" fontFamily="Inter, sans-serif" pointerEvents="none">
            {node.label}
          </text>
          {isDeadlocked && (
            <circle cx={NODE_R * 2 - 4} cy={4} r={7} fill="#ef4444">
              <animate attributeName="r"       values="7;9;7" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.6;1" dur="1.2s" repeatCount="indefinite" />
            </circle>
          )}
        </>
      ) : (
        <>
          {(isSelected || isHighlighted) && (
            <rect x={-5} y={-5} width={RES_SIZE + 10} height={RES_SIZE + 10} rx={20} fill="none"
              stroke={isSelected ? '#38bdf8' : '#f59e0b'} strokeWidth={2} opacity={0.35}
              filter={`url(#${glowId})`}
            />
          )}
          <rect
            x={0} y={0} width={RES_SIZE} height={RES_SIZE} rx={14}
            fill={`url(#rg-${node.id})`} stroke={stroke} strokeWidth={strokeWidth}
            filter={isHighlighted ? `url(#${glowId})` : undefined}
            onPointerDown={(e) => onPointerDown(e, node)}
            onClick={(e) => { e.stopPropagation(); onClick(node); }}
            onContextMenu={(e) => onContextMenu(e, node)}
            style={{ cursor: 'grab' }}
            className="transition-all duration-300 hover:brightness-125"
          />
          {/* Resource label */}
          <text x={RES_SIZE / 2} y={18} textAnchor="middle" fontSize="13" fontWeight="700" fill="#e2e8f0" fontFamily="Inter, sans-serif" pointerEvents="none">
            {node.label}
          </text>
          {/* Instance dots */}
          {showDots ? (
            <g pointerEvents="none">
              {Array.from({ length: totalInstances }).map((_, i) => {
                const cols   = Math.min(totalInstances, 3);
                const rows   = Math.ceil(totalInstances / 3);
                const col    = i % 3;
                const row    = Math.floor(i / 3);
                const spacingX = 14;
                const spacingY = 14;
                const startX = RES_SIZE / 2 - ((cols - 1) * spacingX) / 2;
                const startY = 34 + (RES_SIZE / 2 - 34 - (rows - 1) * spacingY) / 2;
                const cx     = startX + col * spacingX;
                const cy     = startY + row * spacingY;
                const isAlloc = i < allocatedCount;
                return (
                  <circle key={i} cx={cx} cy={cy} r={5}
                    fill={isAlloc ? stroke : 'transparent'}
                    stroke={isAlloc ? stroke : '#1e4a6e'}
                    strokeWidth={1.5}
                    opacity={isAlloc ? 0.85 : 0.45}
                  />
                );
              })}
            </g>
          ) : (
            /* Fallback: count badge for many instances */
            <>
              <circle cx={RES_SIZE / 2} cy={RES_SIZE / 2 + 10} r={12} fill="#0c2340" stroke="#1e4a8f" strokeWidth={1.5} pointerEvents="none" />
              <text x={RES_SIZE / 2} y={RES_SIZE / 2 + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#38bdf8" pointerEvents="none">
                {totalInstances}
              </text>
            </>
          )}
          {/* Allocated / free label */}
          <text x={RES_SIZE / 2} y={RES_SIZE - 6} textAnchor="middle" fontSize="9" fill="#334155" pointerEvents="none" fontFamily="Inter, sans-serif">
            {allocatedCount}/{totalInstances}
          </text>
        </>
      )}
    </g>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────────────

function Canvas() {
  const nodes                  = useStore((s) => s.nodes);
  const edges                  = useStore((s) => s.edges);
  const selectedSourceId       = useStore((s) => s.selectedSourceId);
  const deadlockedProcessIds   = useStore((s) => s.deadlockedProcessIds);
  const updateNodePosition     = useStore((s) => s.updateNodePosition);
  const connectNodes           = useStore((s) => s.connectNodes);
  const setSelectedSourceId    = useStore((s) => s.setSelectedSourceId);
  const updateResourceCount    = useStore((s) => s.updateResourceCount);
  const removeNode             = useStore((s) => s.removeNode);
  const removeEdge             = useStore((s) => s.removeEdge);
  const highlightedNodeIds     = useStore((s) => s.highlightedNodeIds);
  const highlightedEdgeIds     = useStore((s) => s.highlightedEdgeIds);
  const walkthroughSteps       = useStore((s) => s.walkthroughSteps);
  const activeWalkthroughStepIndex = useStore((s) => s.activeWalkthroughStepIndex);

  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [mousePos,  setMousePos ] = useState<{ x: number; y: number } | null>(null);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  // Allocated count per resource (for instance dots)
  const allocatedPerResource = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    nodes.filter((n) => n.type === 'resource').forEach((n) => { counts[n.id] = 0; });
    edges.forEach((e) => {
      if (e.type === 'allocation' && counts[e.from] !== undefined) {
        counts[e.from] = (counts[e.from] ?? 0) + 1;
      }
    });
    return counts;
  }, [nodes, edges]);

  // Edges that are part of a deadlock cycle
  const deadlockEdgeIds = useMemo(() => {
    const dlSet = new Set(deadlockedProcessIds);
    return new Set(
      edges
        .filter((e) => {
          const from = nodeMap[e.from];
          const to   = nodeMap[e.to];
          if (!from || !to) return false;
          if (e.type === 'request'    && dlSet.has(e.from)) return true;
          if (e.type === 'allocation' && dlSet.has(e.to))   return true;
          return false;
        })
        .map((e) => e.id)
    );
  }, [edges, deadlockedProcessIds, nodeMap]);

  const currentStep = walkthroughSteps[activeWalkthroughStepIndex];

  // ── Pointer handlers ──────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGCircleElement | SVGRectElement>, node: GraphNode) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({ id: node.id, offsetX: event.clientX - node.x, offsetY: event.clientY - node.y });
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const svg  = event.currentTarget;
      const rect = svg.getBoundingClientRect();
      // Always track mouse for edge preview
      setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });

      if (!dragState) return;
      const newX = event.clientX - rect.left - dragState.offsetX;
      const newY = event.clientY - rect.top  - dragState.offsetY;
      updateNodePosition(
        dragState.id,
        Math.max(40, Math.min(newX, rect.width  - 100)),
        Math.max(40, Math.min(newY, rect.height - 80)),
      );
    },
    [dragState, updateNodePosition]
  );

  const handlePointerUp    = useCallback(() => setDragState(null), []);
  const handlePointerLeave = useCallback(() => { setDragState(null); setMousePos(null); }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (selectedSourceId && selectedSourceId !== node.id) {
        connectNodes(selectedSourceId, node.id);
        return;
      }
      setSelectedSourceId(node.id === selectedSourceId ? undefined : node.id);
    },
    [selectedSourceId, connectNodes, setSelectedSourceId]
  );

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: GraphNode) => {
      event.preventDefault();
      if (node.type === 'resource') updateResourceCount(node.id, event.shiftKey ? -1 : 1);
      else removeNode(node.id);
    },
    [updateResourceCount, removeNode]
  );

  // Selected source center (for edge preview line)
  const sourceCx = selectedSourceId && nodeMap[selectedSourceId]
    ? nodeMap[selectedSourceId].x + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)
    : null;
  const sourceCy = selectedSourceId && nodeMap[selectedSourceId]
    ? nodeMap[selectedSourceId].y + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-950 shadow-2xl" style={{ height: 560 }}>
      {/* Ambient gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(56,189,248,0.07),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,rgba(239,68,68,0.05),transparent)]" />

      {/* Deadlock badge overlay */}
      {deadlockedProcessIds.length > 0 && walkthroughSteps.length === 0 && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/80 px-3 py-2 text-[11px] font-semibold text-rose-300 backdrop-blur-xl shadow-lg pointer-events-none">
          <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
          Deadlock — {deadlockedProcessIds.join(', ')}
        </div>
      )}

      {/* Walkthrough step status bar */}
      {walkthroughSteps.length > 0 && currentStep && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 rounded-2xl px-4 py-2 text-xs font-semibold backdrop-blur-xl border shadow-lg
          ${currentStep.phase === 'cycle' || currentStep.phase === 'unsafe'
            ? 'bg-rose-950/80 border-rose-500/30 text-rose-300'
            : currentStep.phase === 'safe'
            ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
            : currentStep.phase === 'visit'
            ? 'bg-blue-950/80 border-blue-500/30 text-blue-300'
            : 'bg-slate-900/80 border-slate-700/30 text-slate-300'
          }`}
        >
          <span className={`h-2 w-2 rounded-full flex-shrink-0
            ${currentStep.phase === 'cycle' || currentStep.phase === 'unsafe' ? 'bg-rose-400 animate-pulse' : ''}
            ${currentStep.phase === 'safe'  ? 'bg-emerald-400' : ''}
            ${currentStep.phase === 'visit' ? 'bg-blue-400'    : ''}
            ${!['cycle','unsafe','safe','visit'].includes(currentStep.phase ?? '') ? 'bg-slate-400' : ''}
          `} />
          <span className="max-w-[480px] truncate">{currentStep.message}</span>
          <span className="ml-2 text-slate-500">{activeWalkthroughStepIndex + 1}/{walkthroughSteps.length}</span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="rounded-xl border border-white/5 bg-black/50 backdrop-blur-md px-3 py-2 text-[11px] font-medium text-slate-400 leading-relaxed">
          <div className="flex items-center gap-2 mb-1">
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" /></svg>
            Request edge
          </div>
          <div className="flex items-center gap-2 mb-1">
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#10b981" strokeWidth="2" /></svg>
            Allocation edge
          </div>
          <div className="flex items-center gap-2">
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#ef4444" strokeWidth="2.5" /></svg>
            Deadlock cycle
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/50 backdrop-blur-md px-3 py-2 text-[11px] text-slate-500 leading-relaxed">
          <div>🖱️ Click → Select | Drag → Move</div>
          <div>🔗 Click two nodes to connect</div>
          <div>⌨️ Right-click → Delete / +Instance</div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        id="deadlock-canvas-svg"
        className="h-full w-full touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedSourceId(undefined); }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
          <radialGradient id="grid-fade" cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor="rgba(255,255,255,1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <mask id="grid-mask">
            <rect width="100%" height="100%" fill="url(#grid-fade)" />
          </mask>
        </defs>

        {/* Grid */}
        <rect width="100%" height="100%" fill="url(#grid)" mask="url(#grid-mask)" />

        {/* Edge preview line when a source node is selected */}
        {selectedSourceId && mousePos && sourceCx !== null && sourceCy !== null && (
          <line
            x1={sourceCx} y1={sourceCy} x2={mousePos.x} y2={mousePos.y}
            stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="6 4"
            opacity={0.45} pointerEvents="none"
          />
        )}

        {/* Edges */}
        {edges.map((edge) => (
          <Edge
            key={edge.id}
            edge={edge}
            nodeMap={nodeMap}
            isHighlighted={highlightedEdgeIds.includes(edge.id)}
            isDeadlockEdge={deadlockEdgeIds.has(edge.id) && walkthroughSteps.length === 0}
            onRemove={removeEdge}
          />
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            isDeadlocked={deadlockedProcessIds.includes(node.id)}
            isSelected={node.id === selectedSourceId}
            isHighlighted={highlightedNodeIds.includes(node.id)}
            allocatedCount={allocatedPerResource[node.id] ?? 0}
            onPointerDown={handlePointerDown}
            onClick={handleNodeClick}
            onContextMenu={handleNodeContextMenu}
          />
        ))}

        {/* Rotating selection ring on source node */}
        {selectedSourceId && nodeMap[selectedSourceId] && (
          <circle
            cx={nodeMap[selectedSourceId].x + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)}
            cy={nodeMap[selectedSourceId].y + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)}
            r={(nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2) + 10}
            fill="none" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 3" opacity={0.6}
          >
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${nodeMap[selectedSourceId].x + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)} ${nodeMap[selectedSourceId].y + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)}`}
              to={`360 ${nodeMap[selectedSourceId].x + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)} ${nodeMap[selectedSourceId].y + (nodeMap[selectedSourceId].type === 'process' ? NODE_R : RES_SIZE / 2)}`}
              dur="4s" repeatCount="indefinite"
            />
          </circle>
        )}
      </svg>
    </div>
  );
}

export default Canvas;
