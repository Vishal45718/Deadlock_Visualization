import useStore from '../store';

function StepLog() {
  const logs = useStore((state) => state.logs);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Step Log</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Execution Trace</h2>
        </div>
        <p className="rounded-full bg-slate-800/80 px-3 py-2 text-sm text-slate-200">{logs.length} entries</p>
      </div>
      <div className="grid gap-3">
        {logs.slice(-10).reverse().map((entry, index) => (
          <div key={`${entry}-${index}`} className="rounded-3xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-slate-900/40">
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StepLog;
