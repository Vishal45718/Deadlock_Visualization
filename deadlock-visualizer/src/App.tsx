import { useEffect } from 'react';
import useStore from './store';
import Canvas from './components/Canvas';
import ControlPanel from './components/ControlPanel';
import MatrixPanel from './components/MatrixPanel';
import HeroSection from './components/HeroSection';

function App() {
  const refreshAnalysis = useStore((state) => state.refreshAnalysis);

  useEffect(() => {
    refreshAnalysis();
  }, [refreshAnalysis]);

  return (
    <div className="min-h-screen bg-[#040a14] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      {/* Global ambient light blobs */}
      <div className="fixed top-0 left-[5%] w-[600px] h-[500px] bg-cyan-900/15 rounded-full blur-[180px] pointer-events-none" />
      <div className="fixed bottom-0 right-[5%] w-[500px] h-[400px] bg-purple-900/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 w-[400px] h-[300px] bg-blue-900/8 rounded-full blur-[140px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-[1800px] mx-auto px-4 py-8 sm:px-6 lg:px-10 relative z-10">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Animated live indicator */}
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400">
                Interactive OS Simulator
              </p>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              Deadlock Visualizer
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400 leading-relaxed">
              Build resource allocation graphs, detect cycles with DFS or Wait-For Graph,
              run Banker's Algorithm step-by-step, and explore all four Coffman conditions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold shrink-0">
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md text-slate-300 shadow-sm">
              React + Zustand
            </span>
            <span className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 backdrop-blur-md text-cyan-300 shadow-sm">
              DFS · WFG · Banker's
            </span>
            <span className="rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-1.5 backdrop-blur-md text-purple-300 shadow-sm">
              TypeScript
            </span>
          </div>
        </header>

        {/* ── Educational Hero Section ──────────────────────────────────────── */}
        <div className="mb-6">
          <HeroSection />
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────────────── */}
        <main className="grid gap-6 xl:grid-cols-[1fr_420px]">

          {/* Left column: Canvas + Matrix */}
          <section className="flex flex-col gap-6 min-w-0">
            <Canvas />
            <MatrixPanel />
          </section>

          {/* Right column: Control Panel (sticky) */}
          <aside className="flex flex-col gap-6 xl:h-[calc(100vh-80px)] xl:sticky xl:top-6 overflow-y-auto"
            style={{ scrollbarWidth: 'none' }}>
            <ControlPanel />
          </aside>
        </main>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="mt-10 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
          <p>Deadlock Visualizer · Built with React, Zustand & SVG</p>
          <div className="flex gap-4">
            <a href="https://en.wikipedia.org/wiki/Deadlock_(computer_science)" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition">Wikipedia: Deadlock</a>
            <a href="https://en.wikipedia.org/wiki/Banker%27s_algorithm" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition">Banker's Algorithm</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
