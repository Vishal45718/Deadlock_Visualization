import { useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import useStore from '../store';
import { detectDeadlock } from '../algorithms/deadlockDetection';

function ControlPanel() {
  const loadScenario = useStore((state) => state.loadScenario);
  const resetGraph = useStore((state) => state.resetGraph);
  const recoverProcess = useStore((state) => state.recoverProcess);
  const exportGraph = useStore((state) => state.exportGraph);
  const importGraph = useStore((state) => state.importGraph);
  
  const addProcess = useStore((state) => state.addProcess);
  const addResource = useStore((state) => state.addResource);
  const startVisualization = useStore((state) => state.startVisualization);
  const stepVisualization = useStore((state) => state.stepVisualization);
  const endVisualization = useStore((state) => state.endVisualization);
  
  const activeWalkthroughStepIndex = useStore((state) => state.activeWalkthroughStepIndex);
  const walkthroughSteps = useStore((state) => state.walkthroughSteps);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  
  const bankersResult = useStore((state) => state.bankersResult);
  const deadlockedProcessIds = useStore((state) => state.deadlockedProcessIds);
  const activeScenario = useStore((state) => state.activeScenario);
  const logs = useStore((state) => state.logs);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    importGraph(text);
    event.target.value = '';
  };
  
  const handleVisualizeDeadlock = () => {
    const { walkthroughSteps } = detectDeadlock(nodes, edges);
    startVisualization(walkthroughSteps);
  };
  
  const isVisualizing = activeWalkthroughStepIndex >= -1 && walkthroughSteps.length > 0 && activeWalkthroughStepIndex < walkthroughSteps.length;

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/60 backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl"></div>
      
      <div className="relative mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Simulation Controls</p>
        <h2 className="mt-1 text-2xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">Control Center</h2>
      </div>

      {/* Primary Actions */}
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Builder</h3>
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        <button
          onClick={addProcess}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:shadow-glow-cyan focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></span>
          + Add Process
        </button>
        <button
          onClick={addResource}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:shadow-glow-emerald focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></span>
          + Add Resource
        </button>
      </div>
      
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Algorithms</h3>
      <div className="grid gap-3 mb-6">
        {isVisualizing ? (
          <div className="flex gap-2">
            <button
              onClick={stepVisualization}
              className="flex-1 rounded-2xl bg-cyan-500 hover:bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition"
            >
              Next Step
            </button>
            <button
              onClick={endVisualization}
              className="rounded-2xl border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 px-4 py-3 text-sm font-bold transition"
            >
              Stop
            </button>
          </div>
        ) : (
          <button
            onClick={handleVisualizeDeadlock}
            className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition"
          >
            Run Deadlock DFS Visualization
          </button>
        )}
        
        <button
          onClick={recoverProcess}
          disabled={deadlockedProcessIds.length === 0}
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Recover (Terminate P)
        </button>
      </div>

      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Scenarios</h3>
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        <button
          onClick={() => loadScenario('deadlock')}
          className="rounded-2xl border border-white/5 bg-gradient-to-br from-rose-500/20 to-transparent px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-500/30"
        >
          Deadlock Preset
        </button>
        <button
          onClick={() => loadScenario('safe')}
          className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-500/20 to-transparent px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-500/30"
        >
          Safe Preset
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={resetGraph} className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition">Clear Graph</button>
        <button onClick={handleExport} className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition">Export JSON</button>
        <button onClick={handleImportClick} className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition">Import</button>
      </div>
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />

      <div className="mt-4 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md p-4 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Banker's Status</p>
          <span className={bankersResult.safe ? 'rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase font-bold text-emerald-400' : 'rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase font-bold text-rose-400'}>
            {bankersResult.safe ? 'SAFE' : 'UNSAFE'}
          </span>
        </div>
        <p className="text-sm font-mono text-slate-300 break-words mb-3">
          {bankersResult.sequence.length > 0 ? bankersResult.sequence.join(' → ') : 'No Sequence'}
        </p>
        
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Deadlocks</p>
        <p className="text-sm text-slate-300">
          {deadlockedProcessIds.length ? <span className="text-rose-400">{deadlockedProcessIds.join(', ')}</span> : <span className="text-emerald-400">None detected</span>}
        </p>
      </div>

      <div className="mt-4 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">Console</p>
        <div ref={logContainerRef} className="flex h-32 flex-col gap-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
          {logs.map((entry, index) => (
            <p key={`${entry}-${index}`} className="font-mono text-[11px] text-slate-400 drop-shadow-sm">
              <span className="text-slate-600 mr-2">{'>'}</span>{entry}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
