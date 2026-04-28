/**
 * HeroSection — Educational intro explaining what deadlocks are,
 * why they matter, and giving a real-world analogy with visual elements.
 */

import { useState } from 'react';

const TABS = ['What is a Deadlock?', 'Real-World Analogy', 'Where It Happens'] as const;
type Tab = (typeof TABS)[number];

function TrafficAnalogy() {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="relative w-64 h-64">
        {/* Intersection roads */}
        <div className="absolute inset-x-[40%] inset-y-0 bg-slate-700/30 rounded" />
        <div className="absolute inset-y-[40%] inset-x-0 bg-slate-700/30 rounded" />

        {/* Cars — each pointing toward the intersection, arrows showing direction */}
        {/* Car A (top, going down) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <div className="text-2xl">🚗</div>
          <div className="text-[9px] font-bold text-rose-400">Car A</div>
          <div className="text-rose-400 text-xs">↓</div>
        </div>
        {/* Car B (right, going left) */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div className="text-2xl">🚕</div>
            <div className="text-[9px] font-bold text-amber-400">Car B</div>
          </div>
          <div className="text-amber-400 text-xs">←</div>
        </div>
        {/* Car C (bottom, going up) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <div className="text-xs text-blue-400">↑</div>
          <div className="text-2xl">🚙</div>
          <div className="text-[9px] font-bold text-blue-400">Car C</div>
        </div>
        {/* Car D (left, going right) */}
        <div className="absolute top-1/2 left-4 -translate-y-1/2 flex items-center gap-1">
          <div className="text-emerald-400 text-xs">→</div>
          <div className="flex flex-col items-center">
            <div className="text-2xl">🚌</div>
            <div className="text-[9px] font-bold text-emerald-400">Car D</div>
          </div>
        </div>

        {/* Deadlock label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-[10px] font-bold text-rose-400 text-center backdrop-blur-sm">
            GRIDLOCK<br />
            <span className="text-[9px] text-rose-500/80 font-normal">All waiting on each other</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeadlockConditionCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/3 p-3 hover:bg-white/5 transition-colors">
      <div className="text-xl mb-1.5">{icon}</div>
      <div className="text-xs font-bold text-slate-200 mb-1">{title}</div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function HeroSection({ forceExpanded = false }: { forceExpanded?: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('What is a Deadlock?');
  const [expanded, setExpanded] = useState(true);
  const isExpanded = forceExpanded || expanded;

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-80 h-48 bg-gradient-to-bl from-cyan-500/8 to-transparent pointer-events-none rounded-3xl" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              📖 Learn
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-white">Understanding Deadlocks</h2>
          <p className="text-xs text-slate-400 mt-0.5">Coffman's four conditions + real-world intuition</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 rounded-xl border border-white/5 bg-white/3 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/8 transition"
        >
          {expanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-white/5 pb-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-[11px] font-bold rounded-t-lg transition-all -mb-px border-b-2
                  ${activeTab === tab
                    ? 'border-cyan-500 text-cyan-300 bg-cyan-500/8'
                    : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'What is a Deadlock?' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  A <span className="text-cyan-300 font-semibold">deadlock</span> occurs when a group of processes
                  are each waiting for a resource held by another process in the group — and none can proceed.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  It's a <em>circular dependency of waiting</em>. The system freezes: no process makes progress,
                  no resource is released, and the deadlock is permanent unless externally broken.
                </p>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/80">
                  <span className="font-bold text-amber-300">Coffman's 4 Conditions</span> — all must hold simultaneously:
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DeadlockConditionCard
                  icon="🔒"
                  title="Mutual Exclusion"
                  desc="At least one resource must be held non-shareable."
                />
                <DeadlockConditionCard
                  icon="⏸"
                  title="Hold & Wait"
                  desc="A process holds one resource while requesting others."
                />
                <DeadlockConditionCard
                  icon="🚫"
                  title="No Preemption"
                  desc="Resources can't be forcibly taken — only voluntarily released."
                />
                <DeadlockConditionCard
                  icon="🔄"
                  title="Circular Wait"
                  desc="P1 waits on P2, P2 waits on P3, ..., Pn waits on P1."
                />
              </div>
            </div>
          )}

          {activeTab === 'Real-World Analogy' && (
            <div className="grid gap-4 sm:grid-cols-2 items-center">
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Traffic Gridlock 🚦</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Imagine a 4-way intersection where:
                </p>
                <ul className="text-xs text-slate-300 space-y-1.5 mb-3">
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">🚗</span> Car A needs Car B to move first</li>
                  <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">🚕</span> Car B needs Car C to move first</li>
                  <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">🚙</span> Car C needs Car D to move first</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">🚌</span> Car D needs Car A to move first</li>
                </ul>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5 text-[11px] text-rose-300">
                  Result: <strong>Complete gridlock.</strong> No car can move. This is exactly a deadlock in OS.
                </div>
              </div>
              <TrafficAnalogy />
            </div>
          )}

          {activeTab === 'Where It Happens' && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  emoji: '💻',
                  title: 'Operating Systems',
                  color: 'cyan',
                  points: ['Thread/process scheduling', 'Device allocation (printer, disk)', 'Memory page locking'],
                },
                {
                  emoji: '🗄️',
                  title: 'Databases',
                  color: 'purple',
                  points: ['Row-level lock contention', 'Transaction isolation conflicts', 'MVCC deadlock cycles'],
                },
                {
                  emoji: '🌐',
                  title: 'Distributed Systems',
                  color: 'emerald',
                  points: ['Distributed lock managers', 'Microservice circular deps', 'Consensus protocol stalls'],
                },
              ].map((item) => {
                const borderColor = item.color === 'cyan' ? 'border-cyan-500/20 bg-cyan-500/5' : item.color === 'purple' ? 'border-purple-500/20 bg-purple-500/5' : 'border-emerald-500/20 bg-emerald-500/5';
                const titleColor = item.color === 'cyan' ? 'text-cyan-300' : item.color === 'purple' ? 'text-purple-300' : 'text-emerald-300';
                return (
                  <div key={item.title} className={`rounded-xl border p-4 ${borderColor}`}>
                    <div className="text-2xl mb-2">{item.emoji}</div>
                    <h4 className={`text-sm font-bold mb-2 ${titleColor}`}>{item.title}</h4>
                    <ul className="space-y-1">
                      {item.points.map((p) => (
                        <li key={p} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                          <span className="mt-0.5 text-slate-600">›</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
