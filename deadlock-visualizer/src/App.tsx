import { useEffect } from 'react';
import useStore from './store';
import Canvas from './components/Canvas';
import ControlPanel from './components/ControlPanel';
import MatrixPanel from './components/MatrixPanel';

function App() {
  const refreshAnalysis = useStore((state) => state.refreshAnalysis);

  useEffect(() => {
    refreshAnalysis();
  }, [refreshAnalysis]);

  return (
    <div className="min-h-screen bg-[#050510] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      <div className="absolute top-0 w-[500px] h-[500px] left-[10%] bg-cyan-900/20 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-[1700px] mx-auto px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between py-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">Interactive OS Simulator</p>
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
              Deadlock Visualizer
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400 sm:text-base font-medium">
              Build and explore resource allocation graphs, detect cycles, and run Banker's Algorithm step-by-step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md text-slate-300 shadow-sm">React + Zustand</span>
            <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 backdrop-blur-md text-cyan-300 shadow-sm">DFS & Banker's</span>
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <section className="flex flex-col gap-6">
            <Canvas />
            <MatrixPanel />
          </section>

          <aside className="flex flex-col gap-6 h-[800px] sticky top-6">
            <ControlPanel />
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
