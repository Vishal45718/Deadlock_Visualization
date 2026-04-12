import { useMemo } from 'react';
import useStore from '../store';
import { getProcessIds, getResourceIds, computeNeedMatrix, runBankersAlgorithm } from '../algorithms/bankersAlgorithm';
import { getAllocationMatrix } from '../utils/graphUtils';

function MatrixPanel() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const bankerConfig = useStore((state) => state.bankerConfig);
  const setMaxValue = useStore((state) => state.setMaxValue);

  const processIds = useMemo(() => getProcessIds(nodes), [nodes]);
  const resourceIds = useMemo(() => getResourceIds(nodes), [nodes]);

  const allocation = useMemo(() => getAllocationMatrix(processIds, resourceIds, edges), [processIds, resourceIds, edges]);
  const need = useMemo(() => computeNeedMatrix(processIds, resourceIds, bankerConfig.max, allocation), [processIds, resourceIds, bankerConfig.max, allocation]);

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none"></div>

      <div className="mb-6 relative">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-400">Banker's Algorithm State</p>
        <h2 className="mt-1 text-xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">Matrix Overview</h2>
      </div>

      <div className="overflow-x-auto pb-4"> 
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 min-w-[700px]">
          
          <div className="rounded-2xl border border-white/5 bg-black/30 p-4 shadow-inner">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/5 pb-2">Allocation</h3>
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase">
                  <th className="py-2.5 font-bold">Process</th>
                  {resourceIds.map((rid) => (
                    <th key={rid} className="py-2.5 font-bold text-center">{rid}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processIds.map((pid) => (
                  <tr key={pid} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-200">{pid}</td>
                    {resourceIds.map((rid) => (
                      <td key={`${pid}-${rid}`} className="py-2.5 text-center font-mono text-cyan-300">
                        {allocation[pid]?.[rid] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
                {processIds.length === 0 && (
                  <tr><td colSpan={resourceIds.length + 1} className="py-3 text-center text-slate-600 italic">No processes</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/30 p-4 shadow-inner">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/5 pb-2">Need</h3>
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase">
                  <th className="py-2.5 font-bold">Process</th>
                  {resourceIds.map((rid) => (
                    <th key={rid} className="py-2.5 font-bold text-center">{rid}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processIds.map((pid) => (
                  <tr key={pid} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-200">{pid}</td>
                    {resourceIds.map((rid) => {
                      const val = need[pid]?.[rid] ?? 0;
                      return (
                        <td key={`${pid}-${rid}`} className={`py-2.5 text-center font-mono ${val > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {processIds.length === 0 && (
                  <tr><td colSpan={resourceIds.length + 1} className="py-3 text-center text-slate-600 italic">No processes</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/30 p-4 shadow-inner">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/5 pb-2">Max (Editable)</h3>
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase">
                  <th className="py-2.5 font-bold">Process</th>
                  {resourceIds.map((rid) => (
                    <th key={rid} className="py-2.5 font-bold text-center">{rid}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processIds.map((pid) => (
                  <tr key={pid} className="border-t border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-2.5 font-semibold text-slate-200">{pid}</td>
                    {resourceIds.map((rid) => (
                      <td key={`${pid}-${rid}`} className="py-1 px-1">
                        <input
                          type="number"
                          min={0}
                          value={bankerConfig.max[pid]?.[rid] ?? 0}
                          onChange={(event) => setMaxValue(pid, rid, Number(event.target.value))}
                          className="w-full bg-black/50 border border-transparent rounded px-2 py-1 text-center font-mono text-emerald-300 group-hover:border-white/10 focus:border-cyan-500 focus:bg-cyan-900/20 outline-none transition-all"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {processIds.length === 0 && (
                  <tr><td colSpan={resourceIds.length + 1} className="py-3 text-center text-slate-600 italic">No processes</td></tr>
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
