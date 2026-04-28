import { useRef, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import useStore from '../store';
import { detectDeadlock } from '../algorithms/deadlockDetection';
import { detectDeadlockWFG } from '../algorithms/waitForGraph';
import { getProcessIds, getResourceIds, runBankersAlgorithmWithSteps } from '../algorithms/bankersAlgorithm';
import { getAllocationMatrix } from '../utils/graphUtils';
import type { AlgorithmType, SimulationSpeed } from '../types';

const ALGORITHM_INFO: Record<AlgorithmType, { name: string; time: string; space: string; desc: string; color: string }> = {
  dfs:    { name: 'DFS Cycle Detection', time: 'O(V+E)', space: 'O(V)',    desc: 'Detects cycles in the RAG using DFS. A back-edge to the current stack means deadlock.', color: 'cyan' },
  waitfor:{ name: 'Wait-For Graph',      time: 'O(V+E)', space: 'O(V²)',   desc: 'Reduces the RAG to a process-only graph then runs DFS. Better for multi-instance resources.', color: 'purple' },
  banker: { name: "Banker's Algorithm",  time: 'O(n²m)', space: 'O(n×m)', desc: 'Proactive avoidance — checks if the system stays in a safe state after each allocation.', color: 'emerald' },
};

// ─── Small atoms ───────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  const cls: Record<string, string> = {
    cyan:    'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    purple:  'bg-purple-500/15 text-purple-300 border-purple-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };
  return <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold ${cls[color] ?? ''}`}>{label}</span>;
}

function Section({ label, children, defaultOpen = true }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-white/5 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-2.5 group"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition">{label}</span>
        <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="animate-slide-in-up">{children}</div>}
    </div>
  );
}

// ─── Node Inspector ────────────────────────────────────────────────────────────

function NodeInspector() {
  const selectedSourceId     = useStore((s) => s.selectedSourceId);
  const nodes                = useStore((s) => s.nodes);
  const edges                = useStore((s) => s.edges);
  const deadlockedProcessIds = useStore((s) => s.deadlockedProcessIds);
  const removeNode           = useStore((s) => s.removeNode);
  const setSelectedSourceId  = useStore((s) => s.setSelectedSourceId);

  if (!selectedSourceId) return null;
  const node = nodes.find((n) => n.id === selectedSourceId);
  if (!node) return null;

  const isDeadlocked = node.type === 'process' && deadlockedProcessIds.includes(node.id);
  const outgoing = edges.filter((e) => e.from === node.id);
  const incoming = edges.filter((e) => e.to   === node.id);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 animate-slide-in-up">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Inspector</p>
        <button onClick={() => setSelectedSourceId(undefined)} className="text-[10px] text-slate-600 hover:text-slate-300 transition">✕</button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`text-base ${node.type === 'process' ? '⬤' : '▪'}`}>
          {node.type === 'process' ? '⬤' : '▪'}
        </span>
        <span className="font-bold text-sm text-white">{node.id}</span>
        <span className="text-[10px] text-slate-500">{node.type === 'process' ? 'Process' : 'Resource'}</span>
        {node.type === 'resource' && (
          <span className="ml-auto text-[10px] font-mono text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 rounded px-1.5 py-0.5">{node.count ?? 1} inst.</span>
        )}
      </div>

      {/* State badge */}
      <div className="mb-2.5">
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${isDeadlocked ? 'border-rose-500/40 bg-rose-500/10 text-rose-400' : 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400'}`}>
          {isDeadlocked ? '⚠ Deadlocked' : '✓ Running'}
        </span>
      </div>

      {/* Edges */}
      {outgoing.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Outgoing</p>
          <div className="flex flex-wrap gap-1">
            {outgoing.map((e) => (
              <span key={e.id} className={`text-[10px] font-mono rounded border px-1.5 py-0.5 ${e.type === 'request' ? 'border-cyan-500/25 text-cyan-400 bg-cyan-500/8' : 'border-emerald-500/25 text-emerald-400 bg-emerald-500/8'}`}>
                {e.from}→{e.to}
              </span>
            ))}
          </div>
        </div>
      )}
      {incoming.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Incoming</p>
          <div className="flex flex-wrap gap-1">
            {incoming.map((e) => (
              <span key={e.id} className={`text-[10px] font-mono rounded border px-1.5 py-0.5 ${e.type === 'allocation' ? 'border-amber-500/25 text-amber-400 bg-amber-500/8' : 'border-slate-500/25 text-slate-400'}`}>
                {e.from}→{e.to}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => removeNode(node.id)}
        className="mt-1 w-full rounded-lg border border-rose-500/25 bg-rose-500/8 py-1.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/15 transition"
      >
        🗑 Delete {node.id}
      </button>
    </div>
  );
}

// ─── ControlPanel ──────────────────────────────────────────────────────────────

function ControlPanel() {
  const loadScenario    = useStore((s) => s.loadScenario);
  const generateRandom  = useStore((s) => s.generateRandom);
  const resetGraph      = useStore((s) => s.resetGraph);
  const recoverProcess  = useStore((s) => s.recoverProcess);
  const exportGraph     = useStore((s) => s.exportGraph);
  const importGraph     = useStore((s) => s.importGraph);
  const exportSVG       = useStore((s) => s.exportSVG);
  const addProcess      = useStore((s) => s.addProcess);
  const addResource     = useStore((s) => s.addResource);

  const startVisualization  = useStore((s) => s.startVisualization);
  const stepVisualization   = useStore((s) => s.stepVisualization);
  const endVisualization    = useStore((s) => s.endVisualization);
  const toggleAutoPlay      = useStore((s) => s.toggleAutoPlay);

  const activeWalkthroughStepIndex = useStore((s) => s.activeWalkthroughStepIndex);
  const walkthroughSteps    = useStore((s) => s.walkthroughSteps);
  const isAutoPlaying       = useStore((s) => s.isAutoPlaying);

  const nodes              = useStore((s) => s.nodes);
  const edges              = useStore((s) => s.edges);
  const bankerConfig       = useStore((s) => s.bankerConfig);
  const bankersResult      = useStore((s) => s.bankersResult);
  const deadlockedProcessIds = useStore((s) => s.deadlockedProcessIds);
  const activeScenario     = useStore((s) => s.activeScenario);
  const logs               = useStore((s) => s.logs);
  const clearLogs          = useStore((s) => s.clearLogs);
  const activeAlgorithm    = useStore((s) => s.activeAlgorithm);
  const setActiveAlgorithm = useStore((s) => s.setActiveAlgorithm);
  const simulationSpeed    = useStore((s) => s.simulationSpeed);
  const setSimulationSpeed = useStore((s) => s.setSimulationSpeed);

  const fileInputRef     = useRef<HTMLInputElement | null>(null);
  const logContainerRef  = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  const handleExport = () => {
    const blob = new Blob([exportGraph()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'deadlock-graph.json' });
    a.click(); URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    importGraph(await file.text()); e.target.value = '';
  };

  const handleRunVisualization = () => {
    const pIds = getProcessIds(nodes);
    const rIds = getResourceIds(nodes);
    if (activeAlgorithm === 'dfs') {
      startVisualization(detectDeadlock(nodes, edges).walkthroughSteps);
    } else if (activeAlgorithm === 'waitfor') {
      startVisualization(detectDeadlockWFG(nodes, edges).walkthroughSteps);
    } else {
      const alloc = getAllocationMatrix(pIds, rIds, edges);
      startVisualization(runBankersAlgorithmWithSteps(pIds, rIds, bankerConfig.max, alloc, bankerConfig.available).walkthroughSteps);
    }
  };

  const isVisualizing = walkthroughSteps.length > 0 && activeWalkthroughStepIndex < walkthroughSteps.length;
  const progress      = walkthroughSteps.length > 0 ? ((activeWalkthroughStepIndex + 1) / walkthroughSteps.length) * 100 : 0;
  const algInfo       = ALGORITHM_INFO[activeAlgorithm];

  const colorMap = (info: typeof algInfo, active: boolean) => ({
    cyan:    active ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'       : 'border-white/5 bg-white/3 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300',
    purple:  active ? 'border-purple-500/60 bg-purple-500/15 text-purple-300' : 'border-white/5 bg-white/3 text-slate-400 hover:border-purple-500/30 hover:text-purple-300',
    emerald: active ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300' : 'border-white/5 bg-white/3 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-300',
  }[info.color]);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/5 bg-slate-900/60 backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-rose-500/8 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400">Simulation Controls</p>
        <h2 className="mt-0.5 text-xl font-extrabold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">Control Center</h2>
      </div>

      {/* Node Inspector (when a node is selected) */}
      <NodeInspector />

      {/* ── Builder ─────────────────────────────────────────────────────── */}
      <Section label="Builder">
        <div className="grid grid-cols-2 gap-2">
          <button id="add-process-btn" onClick={addProcess}
            className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40">
            ⬤ + Process
          </button>
          <button id="add-resource-btn" onClick={addResource}
            className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-sm font-semibold text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40">
            ▪ + Resource
          </button>
        </div>
      </Section>

      {/* ── Algorithm ───────────────────────────────────────────────────── */}
      <Section label="Algorithm">
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {(Object.keys(ALGORITHM_INFO) as AlgorithmType[]).map((alg) => {
            const info   = ALGORITHM_INFO[alg];
            const active = activeAlgorithm === alg;
            return (
              <button key={alg} onClick={() => setActiveAlgorithm(alg)}
                className={`rounded-xl border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${colorMap(info, active)}`}>
                {alg === 'dfs' ? 'DFS' : alg === 'waitfor' ? 'WFG' : "Banker's"}
              </button>
            );
          })}
        </div>
        <div className={`rounded-xl border p-3 text-xs mb-0
          ${algInfo.color === 'cyan'    ? 'border-cyan-500/20 bg-cyan-500/5'    : ''}
          ${algInfo.color === 'purple'  ? 'border-purple-500/20 bg-purple-500/5'  : ''}
          ${algInfo.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5' : ''}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-slate-200">{algInfo.name}</span>
            <Badge label={`T:${algInfo.time}`} color={algInfo.color} />
            <Badge label={`S:${algInfo.space}`} color={algInfo.color} />
          </div>
          <p className="text-slate-400 leading-relaxed">{algInfo.desc}</p>
        </div>
      </Section>

      {/* ── Simulation ──────────────────────────────────────────────────── */}
      <Section label="Simulation">
        <div className="flex gap-1.5 mb-3">
          {(['slow', 'normal', 'fast'] as SimulationSpeed[]).map((s) => (
            <button key={s} onClick={() => setSimulationSpeed(s)}
              className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all
                ${simulationSpeed === s ? 'border-slate-500/60 bg-slate-700/50 text-slate-200' : 'border-white/5 bg-white/3 text-slate-500 hover:text-slate-300'}`}>
              {s === 'slow' ? '🐢 Slow' : s === 'normal' ? '⚡ Normal' : '🚀 Fast'}
            </button>
          ))}
        </div>

        {isVisualizing ? (
          <div className="flex flex-col gap-2">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-2">
              <button id="step-btn" onClick={stepVisualization} disabled={activeWalkthroughStepIndex >= walkthroughSteps.length - 1}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all">
                Next Step →
              </button>
              <button id="autoplay-btn" onClick={toggleAutoPlay}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${isAutoPlaying ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}`}>
                {isAutoPlaying ? '⏸' : '▶'}
              </button>
              <button id="stop-btn" onClick={endVisualization}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/20 transition-all">
                ✕
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-500">Step {Math.max(0, activeWalkthroughStepIndex + 1)} of {walkthroughSteps.length}</p>
          </div>
        ) : (
          <button id="run-visualization-btn" onClick={handleRunVisualization}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30">
            ▶ Run {algInfo.name}
          </button>
        )}

        <button id="recover-btn" onClick={recoverProcess} disabled={deadlockedProcessIds.length === 0}
          className="mt-2 w-full rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-all hover:bg-rose-500/15 disabled:opacity-30 disabled:cursor-not-allowed">
          🔧 Recover (Terminate Process)
        </button>
      </Section>

      {/* ── Scenarios ───────────────────────────────────────────────────── */}
      <Section label="Scenarios">
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'deadlock', label: '🔴 Deadlock',    cls: 'rose'    },
            { key: 'safe',     label: '✅ Safe State',  cls: 'emerald' },
            { key: 'complex',  label: '🔺 Complex 3P',  cls: 'purple'  },
            { key: 'random',   label: '🎲 Random',      cls: 'amber'   },
          ] as const).map(({ key, label, cls }) => {
            const isActive = activeScenario === key;
            const colors: Record<string, string> = {
              rose:    isActive ? 'border-rose-500/50 bg-rose-500/15 text-rose-300'       : 'border-white/5 bg-white/3 text-rose-300/70 hover:border-rose-500/30',
              emerald: isActive ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-white/5 bg-white/3 text-emerald-300/70 hover:border-emerald-500/30',
              purple:  isActive ? 'border-purple-500/50 bg-purple-500/15 text-purple-300' : 'border-white/5 bg-white/3 text-purple-300/70 hover:border-purple-500/30',
              amber:   isActive ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'    : 'border-white/5 bg-white/3 text-amber-300/70 hover:border-amber-500/30',
            };
            const onClick = key === 'random' ? generateRandom : () => loadScenario(key as 'deadlock' | 'safe' | 'complex');
            return (
              <button key={key} id={`${key}-preset-btn`} onClick={onClick}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${colors[cls]}`}>
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Graph I/O ───────────────────────────────────────────────────── */}
      <Section label="Graph I/O" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={resetGraph}                        className="rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">Clear</button>
          <button onClick={handleExport}                     className="rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">JSON ↓</button>
          <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">Import</button>
        </div>
        <button onClick={exportSVG} className="mt-1.5 w-full rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">
          🖼 Export SVG
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
      </Section>

      {/* ── Analysis Result ─────────────────────────────────────────────── */}
      <Section label="Analysis">
        <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-4">
          <div className="flex items-center justify-between mb-3">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${bankersResult.safe ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
              {bankersResult.safe ? '✓ SAFE' : '✗ UNSAFE'}
            </span>
          </div>
          <div className="mb-2.5">
            <p className="text-[10px] text-slate-500 mb-1">Banker's Sequence</p>
            <p className="text-sm font-mono text-slate-300">{bankersResult.sequence.length > 0 ? bankersResult.sequence.join(' → ') : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Deadlocked Processes</p>
            <p className="text-sm">
              {deadlockedProcessIds.length > 0
                ? <span className="text-rose-400 font-mono font-semibold">{deadlockedProcessIds.join(', ')}</span>
                : <span className="text-emerald-400">None detected</span>}
            </p>
          </div>
        </div>
      </Section>

      {/* ── Console ─────────────────────────────────────────────────────── */}
      <Section label="Console">
        <div className="rounded-2xl border border-white/5 bg-black/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-600">{logs.length} entries</span>
            <button onClick={clearLogs} className="text-[10px] text-slate-600 hover:text-slate-400 transition">Clear</button>
          </div>
          <div ref={logContainerRef} className="flex h-28 flex-col gap-0.5 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
            {logs.map((entry, i) => (
              <p key={`${entry}-${i}`} className="font-mono text-[10px] text-slate-400 leading-5">
                <span className="text-slate-600 mr-1.5">›</span>{entry}
              </p>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

export default ControlPanel;
