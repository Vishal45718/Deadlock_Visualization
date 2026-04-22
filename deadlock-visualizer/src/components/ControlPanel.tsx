import { useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import useStore from '../store';
import { detectDeadlock } from '../algorithms/deadlockDetection';
import { detectDeadlockWFG } from '../algorithms/waitForGraph';
import {
  getProcessIds,
  getResourceIds,
  runBankersAlgorithmWithSteps,
} from '../algorithms/bankersAlgorithm';
import { getAllocationMatrix } from '../utils/graphUtils';
import type { AlgorithmType, SimulationSpeed } from '../types';

// ─── Algorithm Info ─────────────────────────────────────────────────────────────

const ALGORITHM_INFO: Record<AlgorithmType, { name: string; time: string; space: string; desc: string; color: string }> = {
  dfs: {
    name: 'DFS Cycle Detection',
    time: 'O(V + E)',
    space: 'O(V)',
    desc: 'Detects cycles in the Resource Allocation Graph using DFS with a stack. A back-edge indicates a cycle.',
    color: 'cyan',
  },
  waitfor: {
    name: 'Wait-For Graph',
    time: 'O(V + E)',
    space: 'O(V²)',
    desc: 'Reduces the RAG to a process-only Wait-For Graph and runs DFS on it. Cleaner for multi-instance resources.',
    color: 'purple',
  },
  banker: {
    name: "Banker's Algorithm",
    time: 'O(n² × m)',
    space: 'O(n × m)',
    desc: 'Proactive deadlock avoidance. Checks if the system remains in a safe state after each allocation.',
    color: 'emerald',
  },
};

// ─── Badge Component ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-bold ${colorMap[color] ?? ''}`}>
      {label}
    </span>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="mb-2.5 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {label}
    </h3>
  );
}

// ─── ControlPanel ──────────────────────────────────────────────────────────────

function ControlPanel() {
  const loadScenario = useStore((s) => s.loadScenario);
  const generateRandom = useStore((s) => s.generateRandom);
  const resetGraph = useStore((s) => s.resetGraph);
  const recoverProcess = useStore((s) => s.recoverProcess);
  const exportGraph = useStore((s) => s.exportGraph);
  const importGraph = useStore((s) => s.importGraph);
  const exportSVG = useStore((s) => s.exportSVG);

  const addProcess = useStore((s) => s.addProcess);
  const addResource = useStore((s) => s.addResource);

  const startVisualization = useStore((s) => s.startVisualization);
  const stepVisualization = useStore((s) => s.stepVisualization);
  const endVisualization = useStore((s) => s.endVisualization);
  const toggleAutoPlay = useStore((s) => s.toggleAutoPlay);

  const activeWalkthroughStepIndex = useStore((s) => s.activeWalkthroughStepIndex);
  const walkthroughSteps = useStore((s) => s.walkthroughSteps);
  const isAutoPlaying = useStore((s) => s.isAutoPlaying);

  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const bankerConfig = useStore((s) => s.bankerConfig);

  const bankersResult = useStore((s) => s.bankersResult);
  const deadlockedProcessIds = useStore((s) => s.deadlockedProcessIds);
  const activeScenario = useStore((s) => s.activeScenario);
  const logs = useStore((s) => s.logs);
  const clearLogs = useStore((s) => s.clearLogs);

  const activeAlgorithm = useStore((s) => s.activeAlgorithm);
  const setActiveAlgorithm = useStore((s) => s.setActiveAlgorithm);
  const simulationSpeed = useStore((s) => s.simulationSpeed);
  const setSimulationSpeed = useStore((s) => s.setSimulationSpeed);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleExport = () => {
    const payload = exportGraph();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'deadlock-graph.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    importGraph(text);
    event.target.value = '';
  };

  const handleRunVisualization = () => {
    const processIds = getProcessIds(nodes);
    const resourceIds = getResourceIds(nodes);

    if (activeAlgorithm === 'dfs') {
      const { walkthroughSteps } = detectDeadlock(nodes, edges);
      startVisualization(walkthroughSteps);
    } else if (activeAlgorithm === 'waitfor') {
      const { walkthroughSteps } = detectDeadlockWFG(nodes, edges);
      startVisualization(walkthroughSteps);
    } else if (activeAlgorithm === 'banker') {
      const allocation = getAllocationMatrix(processIds, resourceIds, edges);
      const { walkthroughSteps } = runBankersAlgorithmWithSteps(
        processIds,
        resourceIds,
        bankerConfig.max,
        allocation,
        bankerConfig.available
      );
      startVisualization(walkthroughSteps);
    }
  };

  const isVisualizing =
    activeWalkthroughStepIndex >= -1 &&
    walkthroughSteps.length > 0 &&
    activeWalkthroughStepIndex < walkthroughSteps.length;

  const progress =
    walkthroughSteps.length > 0
      ? ((activeWalkthroughStepIndex + 1) / walkthroughSteps.length) * 100
      : 0;

  const algInfo = ALGORITHM_INFO[activeAlgorithm];

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-900/60 backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-rose-500/8 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400">Simulation Controls</p>
        <h2 className="mt-0.5 text-xl font-extrabold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
          Control Center
        </h2>
      </div>

      {/* ── Builder ─────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader label="Builder" />
        <div className="grid grid-cols-2 gap-2">
          <button
            id="add-process-btn"
            onClick={addProcess}
            className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/20 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="text-base">⬤</span> + Process
            </span>
          </button>
          <button
            id="add-resource-btn"
            onClick={addResource}
            className="group relative overflow-hidden rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-sm font-semibold text-orange-300 transition-all hover:bg-orange-500/20 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="text-base">▪</span> + Resource
            </span>
          </button>
        </div>
      </div>

      {/* ── Algorithm Selection ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader label="Algorithm" />
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {(Object.keys(ALGORITHM_INFO) as AlgorithmType[]).map((alg) => {
            const info = ALGORITHM_INFO[alg];
            const active = activeAlgorithm === alg;
            const colorMap: Record<string, string> = {
              cyan: active ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300' : 'border-white/5 bg-white/3 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300',
              purple: active ? 'border-purple-500/60 bg-purple-500/15 text-purple-300' : 'border-white/5 bg-white/3 text-slate-400 hover:border-purple-500/30 hover:text-purple-300',
              emerald: active ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300' : 'border-white/5 bg-white/3 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-300',
            };
            return (
              <button
                key={alg}
                onClick={() => setActiveAlgorithm(alg)}
                className={`rounded-xl border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${colorMap[info.color]}`}
              >
                {alg === 'dfs' ? 'DFS' : alg === 'waitfor' ? 'WFG' : "Banker's"}
              </button>
            );
          })}
        </div>

        {/* Algorithm Info Card */}
        <div className={`rounded-xl border p-3 mb-3 text-xs
          ${algInfo.color === 'cyan' ? 'border-cyan-500/20 bg-cyan-500/5' : ''}
          ${algInfo.color === 'purple' ? 'border-purple-500/20 bg-purple-500/5' : ''}
          ${algInfo.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5' : ''}
        `}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-slate-200">{algInfo.name}</span>
            <Badge label={`T: ${algInfo.time}`} color={algInfo.color} />
            <Badge label={`S: ${algInfo.space}`} color={algInfo.color} />
          </div>
          <p className="text-slate-400 leading-relaxed">{algInfo.desc}</p>
        </div>
      </div>

      {/* ── Simulation Controls ───────────────────────────────────────────────── */}
      <div>
        <SectionHeader label="Simulation" />

        {/* Speed selector */}
        <div className="flex gap-1.5 mb-3">
          {(['slow', 'normal', 'fast'] as SimulationSpeed[]).map((s) => (
            <button
              key={s}
              onClick={() => setSimulationSpeed(s)}
              className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all
                ${simulationSpeed === s
                  ? 'border-slate-500/60 bg-slate-700/50 text-slate-200'
                  : 'border-white/5 bg-white/3 text-slate-500 hover:text-slate-300'}`}
            >
              {s === 'slow' ? '🐢 Slow' : s === 'normal' ? '⚡ Normal' : '🚀 Fast'}
            </button>
          ))}
        </div>

        {isVisualizing ? (
          <div className="flex flex-col gap-2">
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-2">
              <button
                id="step-btn"
                onClick={stepVisualization}
                disabled={activeWalkthroughStepIndex >= walkthroughSteps.length - 1}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all"
              >
                Next Step →
              </button>
              <button
                id="autoplay-btn"
                onClick={toggleAutoPlay}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all
                  ${isAutoPlaying
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}`}
              >
                {isAutoPlaying ? '⏸' : '▶'}
              </button>
              <button
                id="stop-btn"
                onClick={endVisualization}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/20 transition-all"
              >
                ✕
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-500">
              Step {Math.max(0, activeWalkthroughStepIndex + 1)} of {walkthroughSteps.length}
            </p>
          </div>
        ) : (
          <button
            id="run-visualization-btn"
            onClick={handleRunVisualization}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30"
          >
            ▶ Run {algInfo.name}
          </button>
        )}

        <button
          id="recover-btn"
          onClick={recoverProcess}
          disabled={deadlockedProcessIds.length === 0}
          className="mt-2 w-full rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-all hover:bg-rose-500/15 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          🔧 Recover (Terminate Process)
        </button>
      </div>

      {/* ── Scenarios ──────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader label="Scenarios" />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            id="deadlock-preset-btn"
            onClick={() => loadScenario('deadlock')}
            className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${activeScenario === 'deadlock' ? 'border-rose-500/50 bg-rose-500/15 text-rose-300' : 'border-white/5 bg-white/3 text-rose-300/70 hover:border-rose-500/30'}`}
          >
            🔴 Deadlock
          </button>
          <button
            id="safe-preset-btn"
            onClick={() => loadScenario('safe')}
            className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${activeScenario === 'safe' ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-white/5 bg-white/3 text-emerald-300/70 hover:border-emerald-500/30'}`}
          >
            ✅ Safe State
          </button>
          <button
            id="complex-preset-btn"
            onClick={() => loadScenario('complex')}
            className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${activeScenario === 'complex' ? 'border-purple-500/50 bg-purple-500/15 text-purple-300' : 'border-white/5 bg-white/3 text-purple-300/70 hover:border-purple-500/30'}`}
          >
            🔺 Complex (3P)
          </button>
          <button
            id="random-btn"
            onClick={generateRandom}
            className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${activeScenario === 'random' ? 'border-amber-500/50 bg-amber-500/15 text-amber-300' : 'border-white/5 bg-white/3 text-amber-300/70 hover:border-amber-500/30'}`}
          >
            🎲 Random
          </button>
        </div>
      </div>

      {/* ── Import/Export ────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader label="Graph I/O" />
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={resetGraph} className="rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">Clear</button>
          <button onClick={handleExport} className="rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">JSON ↓</button>
          <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">Import</button>
        </div>
        <button onClick={exportSVG} className="mt-1.5 w-full rounded-lg border border-white/5 bg-white/3 px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition">
          🖼 Export as SVG Image
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
      </div>

      {/* ── Status ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Analysis Result</p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${bankersResult.safe ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
            {bankersResult.safe ? 'SAFE' : 'UNSAFE'}
          </span>
        </div>

        <div className="mb-2">
          <p className="text-[10px] text-slate-500 mb-1">Banker's Sequence</p>
          <p className="text-sm font-mono text-slate-300">
            {bankersResult.sequence.length > 0 ? bankersResult.sequence.join(' → ') : '—'}
          </p>
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

      {/* ── Console Log ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 bg-black/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Console</p>
          <button onClick={clearLogs} className="text-[10px] text-slate-600 hover:text-slate-400 transition">Clear</button>
        </div>
        <div
          ref={logContainerRef}
          className="flex h-28 flex-col gap-0.5 overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
        >
          {logs.map((entry, index) => (
            <p key={`${entry}-${index}`} className="font-mono text-[10px] text-slate-400 leading-5">
              <span className="text-slate-600 mr-1.5">›</span>{entry}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
