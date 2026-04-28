import useStore from '../store';

export default function StatusBar() {
  const nodes                = useStore((s) => s.nodes);
  const edges                = useStore((s) => s.edges);
  const deadlockedProcessIds = useStore((s) => s.deadlockedProcessIds);
  const bankersResult        = useStore((s) => s.bankersResult);
  const activeAlgorithm      = useStore((s) => s.activeAlgorithm);
  const activeScenario       = useStore((s) => s.activeScenario);
  const walkthroughSteps     = useStore((s) => s.walkthroughSteps);
  const activeIdx            = useStore((s) => s.activeWalkthroughStepIndex);

  const processCount  = nodes.filter((n) => n.type === 'process').length;
  const resourceCount = nodes.filter((n) => n.type === 'resource').length;
  const edgeCount     = edges.length;
  const isDeadlocked  = deadlockedProcessIds.length > 0;
  const isVisualizing = walkthroughSteps.length > 0;

  const algLabel: Record<string, string> = { dfs: 'DFS', waitfor: 'WFG', banker: "Banker's" };
  const scenarioLabel: Record<string, string> = {
    idle: 'Custom', deadlock: 'Deadlock Preset', safe: 'Safe Preset', complex: 'Complex Preset', random: 'Random',
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] font-medium text-slate-500 select-none">

      {/* Deadlock status */}
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${isDeadlocked ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
        <span className={isDeadlocked ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
          {isDeadlocked ? `Deadlocked (${deadlockedProcessIds.join(', ')})` : 'No Deadlock'}
        </span>
      </div>

      <Divider />

      {/* Safe state */}
      <div className="flex items-center gap-1.5">
        <span className={bankersResult.safe ? 'text-emerald-400' : 'text-rose-400'}>
          {bankersResult.safe ? '✓ Safe' : '✗ Unsafe'}
        </span>
      </div>

      <Divider />

      {/* Graph stats */}
      <span>Processes: <b className="text-slate-300">{processCount}</b></span>
      <span>Resources: <b className="text-slate-300">{resourceCount}</b></span>
      <span>Edges: <b className="text-slate-300">{edgeCount}</b></span>

      <Divider />

      <span>Algorithm: <b className="text-cyan-400">{algLabel[activeAlgorithm] ?? activeAlgorithm}</b></span>
      <span>Scenario: <b className="text-slate-300">{scenarioLabel[activeScenario] ?? activeScenario}</b></span>

      {/* Walkthrough progress */}
      {isVisualizing && (
        <>
          <Divider />
          <span className="text-cyan-400 font-semibold">
            Step {Math.max(0, activeIdx + 1)}/{walkthroughSteps.length}
          </span>
        </>
      )}

      {/* Right-aligned: safe sequence */}
      {bankersResult.sequence.length > 0 && (
        <span className="ml-auto text-slate-600">
          Seq: <span className="font-mono text-slate-400">{bankersResult.sequence.join(' → ')}</span>
        </span>
      )}
    </div>
  );
}

function Divider() {
  return <span className="h-3.5 w-px bg-white/8 hidden sm:block" />;
}
