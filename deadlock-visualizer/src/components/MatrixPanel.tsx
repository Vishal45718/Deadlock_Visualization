import { useMemo } from 'react';
import useStore from '../store';
import { getProcessIds, getResourceIds, computeNeedMatrix } from '../algorithms/bankersAlgorithm';
import { getAllocationMatrix } from '../utils/graphUtils';

// ─── Shared Matrix Table ────────────────────────────────────────────────────────

interface MatrixTableProps {
  title: string;
  accent: 'cyan' | 'rose' | 'emerald';
  processIds: string[];
  resourceIds: string[];
  getData: (pid: string, rid: string) => number;
  highlightedIds: Set<string>;
  isVisualizing: boolean;
  onEdit?: (pid: string, rid: string, val: number) => void;
}

function MatrixTable({
  title, accent, processIds, resourceIds, getData, highlightedIds, isVisualizing, onEdit,
}: MatrixTableProps) {
  const styles = {
    cyan:    { head: 'text-cyan-400',    hl: 'bg-cyan-500/10 border-l-2 border-l-cyan-400',    val: 'text-cyan-300',    inp: 'text-cyan-300 focus:border-cyan-500/60 focus:bg-cyan-950/40' },
    rose:    { head: 'text-rose-400',    hl: 'bg-rose-500/10 border-l-2 border-l-rose-400',    val: 'text-rose-300',    inp: 'text-rose-300 focus:border-rose-500/60 focus:bg-rose-950/40' },
    emerald: { head: 'text-emerald-400', hl: 'bg-emerald-500/10 border-l-2 border-l-emerald-400', val: 'text-emerald-300', inp: 'text-emerald-300 focus:border-emerald-500/60 focus:bg-emerald-950/40' },
  }[accent];

  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-4 shadow-inner min-w-[160px]">
      <h3 className={`mb-3 text-[10px] font-bold uppercase tracking-[0.2em] ${styles.head} border-b border-white/5 pb-2`}>
        {title}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] text-slate-500 uppercase">
            <th className="py-2 pr-2 font-bold">P</th>
            {resourceIds.map((rid) => (
              <th key={rid} className="py-2 font-bold text-center">{rid}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processIds.map((pid) => {
            const isHl = isVisualizing && highlightedIds.has(pid);
            return (
              <tr key={pid} className={`border-t border-white/5 transition-all duration-300 ${isHl ? styles.hl : 'hover:bg-white/3'}`}>
                <td className={`py-2 pr-2 font-semibold text-xs ${isHl ? 'text-white' : 'text-slate-300'}`}>{pid}</td>
                {resourceIds.map((rid) => {
                  const val = getData(pid, rid);
                  if (onEdit) {
                    return (
                      <td key={rid} className="py-1 px-0.5">
                        <input
                          type="number" min={0} value={val}
                          onChange={(e) => onEdit(pid, rid, Number(e.target.value))}
                          className={`w-full bg-black/40 border border-transparent rounded px-1.5 py-1 text-center font-mono text-xs ${styles.inp} hover:border-white/10 outline-none transition-all`}
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={rid} className={`py-2 text-center font-mono text-xs ${isHl ? `font-bold ${styles.val}` : val > 0 ? styles.val : 'text-slate-600'}`}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {processIds.length === 0 && (
            <tr><td colSpan={resourceIds.length + 1} className="py-3 text-center text-slate-600 italic text-xs">No processes</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── MatrixPanel ────────────────────────────────────────────────────────────────

function MatrixPanel() {
  const nodes          = useStore((s) => s.nodes);
  const edges          = useStore((s) => s.edges);
  const bankerConfig   = useStore((s) => s.bankerConfig);
  const bankersResult  = useStore((s) => s.bankersResult);
  const setMaxValue    = useStore((s) => s.setMaxValue);
  const setAvailableValue = useStore((s) => s.setAvailableValue);
  const walkthroughSteps = useStore((s) => s.walkthroughSteps);
  const activeWalkthroughStepIndex = useStore((s) => s.activeWalkthroughStepIndex);
  const activeAlgorithm = useStore((s) => s.activeAlgorithm);

  const processIds  = useMemo(() => getProcessIds(nodes), [nodes]);
  const resourceIds = useMemo(() => getResourceIds(nodes), [nodes]);
  const allocation  = useMemo(() => getAllocationMatrix(processIds, resourceIds, edges), [processIds, resourceIds, edges]);
  const need        = useMemo(() => computeNeedMatrix(processIds, resourceIds, bankerConfig.max, allocation), [processIds, resourceIds, bankerConfig.max, allocation]);

  // Highlighted process IDs during Banker's walkthrough
  const highlightedIds = useMemo<Set<string>>(() => {
    if (activeAlgorithm !== 'banker' || activeWalkthroughStepIndex < 0 || walkthroughSteps.length === 0) return new Set();
    const step = walkthroughSteps[activeWalkthroughStepIndex];
    if (!step) return new Set();
    const ids = step.highlightNodes ?? (step.nodeId ? [step.nodeId] : []);
    return new Set(ids.filter((id) => processIds.includes(id)));
  }, [activeAlgorithm, activeWalkthroughStepIndex, walkthroughSteps, processIds]);

  const isVisualizingBanker = activeAlgorithm === 'banker' && walkthroughSteps.length > 0;

  const isSafe = bankersResult.safe;

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 relative">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-400">Banker's Algorithm State</p>
          <h2 className="mt-1 text-xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            Matrix Overview
          </h2>
        </div>
        <span className={`mt-1 shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${isSafe ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
          {isSafe ? '✓ Safe' : '✗ Unsafe'}
        </span>
      </div>

      {/* Safe sequence strip */}
      {bankersResult.sequence.length > 0 && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mr-1">Safe Sequence</span>
          {bankersResult.sequence.map((pid, i) => (
            <span key={pid} className="flex items-center gap-1.5">
              <span className={`rounded border px-2 py-0.5 text-[11px] font-mono font-bold transition-all duration-300 ${highlightedIds.has(pid) ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200 shadow-sm shadow-emerald-500/30' : 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400'}`}>
                {pid}
              </span>
              {i < bankersResult.sequence.length - 1 && <span className="text-slate-600 text-xs">→</span>}
            </span>
          ))}
        </div>
      )}

      {/* Matrices */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">

          {/* Allocation */}
          <MatrixTable
            title="Allocation" accent="cyan"
            processIds={processIds} resourceIds={resourceIds}
            getData={(pid, rid) => allocation[pid]?.[rid] ?? 0}
            highlightedIds={highlightedIds} isVisualizing={isVisualizingBanker}
          />

          {/* Need */}
          <MatrixTable
            title="Need" accent="rose"
            processIds={processIds} resourceIds={resourceIds}
            getData={(pid, rid) => need[pid]?.[rid] ?? 0}
            highlightedIds={highlightedIds} isVisualizing={isVisualizingBanker}
          />

          {/* Max (Editable) */}
          <MatrixTable
            title="Max (editable)" accent="emerald"
            processIds={processIds} resourceIds={resourceIds}
            getData={(pid, rid) => bankerConfig.max[pid]?.[rid] ?? 0}
            highlightedIds={highlightedIds} isVisualizing={isVisualizingBanker}
            onEdit={setMaxValue}
          />

          {/* Available (Editable) */}
          <div className="rounded-2xl border border-amber-500/20 bg-black/30 p-4 shadow-inner min-w-[140px]">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 border-b border-white/5 pb-2">
              Available
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-slate-500 uppercase">
                  <th className="py-2 pr-2 font-bold">R</th>
                  <th className="py-2 font-bold text-center">Count</th>
                </tr>
              </thead>
              <tbody>
                {resourceIds.map((rid) => (
                  <tr key={rid} className="border-t border-white/5 hover:bg-white/3 group transition-colors">
                    <td className="py-2 pr-2 text-xs font-semibold text-slate-300">{rid}</td>
                    <td className="py-1 px-0.5">
                      <input
                        type="number" min={0}
                        value={bankerConfig.available[rid] ?? 0}
                        onChange={(e) => setAvailableValue(rid, Number(e.target.value))}
                        className="w-full bg-black/40 border border-transparent rounded px-1.5 py-1 text-center font-mono text-xs text-amber-300 hover:border-white/10 focus:border-amber-500/60 focus:bg-amber-950/40 outline-none transition-all"
                      />
                    </td>
                  </tr>
                ))}
                {resourceIds.length === 0 && (
                  <tr><td colSpan={2} className="py-3 text-center text-slate-600 italic text-xs">No resources</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default MatrixPanel;
