import type { GraphNode, GraphEdge, WalkthroughStep, BankersResult } from '../types';

export { BankersResult };

export function getProcessIds(nodes: GraphNode[]) {
  return nodes.filter((node) => node.type === 'process').map((node) => node.id);
}

export function getResourceIds(nodes: GraphNode[]) {
  return nodes.filter((node) => node.type === 'resource').map((node) => node.id);
}

export function computeAllocationMatrix(processIds: string[], resourceIds: string[], edges: GraphEdge[]) {
  const allocation: Record<string, Record<string, number>> = {};
  processIds.forEach((pid) => {
    allocation[pid] = {};
    resourceIds.forEach((rid) => {
      allocation[pid][rid] = 0;
    });
  });

  edges.forEach((edge) => {
    if (edge.type === 'allocation' && resourceIds.includes(edge.from) && processIds.includes(edge.to)) {
      allocation[edge.to][edge.from] += 1;
    }
  });

  return allocation;
}

export function computeNeedMatrix(
  processIds: string[],
  resourceIds: string[],
  max: Record<string, Record<string, number>>,
  allocation: Record<string, Record<string, number>>
) {
  const need: Record<string, Record<string, number>> = {};
  processIds.forEach((pid) => {
    need[pid] = {};
    resourceIds.forEach((rid) => {
      const maxValue = max[pid]?.[rid] ?? allocation[pid]?.[rid] ?? 0;
      const allocated = allocation[pid]?.[rid] ?? 0;
      need[pid][rid] = Math.max(0, maxValue - allocated);
    });
  });
  return need;
}

export function runBankersAlgorithmWithSteps(
  processIds: string[],
  resourceIds: string[],
  max: Record<string, Record<string, number>>,
  allocation: Record<string, Record<string, number>>,
  available: Record<string, number>
): BankersResult & { walkthroughSteps: WalkthroughStep[] } {
  const need = computeNeedMatrix(processIds, resourceIds, max, allocation);
  const logs: string[] = [];
  const walkthroughSteps: WalkthroughStep[] = [];
  const work: Record<string, number> = {};
  resourceIds.forEach((rid) => {
    work[rid] = Math.max(0, available[rid] ?? 0);
  });
  const finish: Record<string, boolean> = {};
  processIds.forEach((pid) => {
    finish[pid] = false;
  });

  const availStr = resourceIds.map((rid) => `${rid}=${work[rid]}`).join(', ');
  logs.push("Starting Banker's Algorithm");
  logs.push(`Available: ${availStr}`);
  walkthroughSteps.push({
    message: `🏦 Starting Banker's Algorithm | Available: ${availStr}`,
    phase: 'info',
  });

  const safeSequence: string[] = [];
  let progress = true;
  let iteration = 0;

  while (safeSequence.length < processIds.length && progress) {
    progress = false;
    iteration++;
    walkthroughSteps.push({
      message: `--- Iteration ${iteration}: Work = [${resourceIds.map((r) => `${r}:${work[r]}`).join(', ')}] ---`,
      phase: 'info',
    });

    for (const pid of processIds) {
      if (finish[pid]) continue;
      const needStr = resourceIds.map((rid) => `${rid}=${need[pid][rid]}`).join(', ');
      const requestOk = resourceIds.every((rid) => need[pid][rid] <= work[rid]);
      logs.push(`Checking ${pid}: Need ${needStr}`);

      walkthroughSteps.push({
        nodeId: pid,
        message: `Checking ${pid}: Need [${needStr}] vs Work [${resourceIds.map((r) => `${r}:${work[r]}`).join(', ')}]`,
        phase: 'visit',
        highlightNodes: [pid],
      });

      if (requestOk) {
        const releaseStr = resourceIds.map((rid) => `${rid}=${allocation[pid][rid]}`).join(', ');
        logs.push(`${pid} can finish and releases ${releaseStr}`);
        walkthroughSteps.push({
          nodeId: pid,
          message: `✔ ${pid} can finish! Releases [${releaseStr}]`,
          phase: 'safe',
          highlightNodes: [pid],
        });
        resourceIds.forEach((rid) => {
          work[rid] += allocation[pid][rid];
        });
        finish[pid] = true;
        safeSequence.push(pid);
        progress = true;
        break;
      }
      logs.push(`${pid} cannot finish yet.`);
      walkthroughSteps.push({
        nodeId: pid,
        message: `✗ ${pid} cannot finish yet. Needs more resources.`,
        phase: 'backtrack',
        highlightNodes: [pid],
      });
    }
  }

  const safe = safeSequence.length === processIds.length;
  if (safe) {
    logs.push(`System is safe. Safe sequence: ${safeSequence.join(' → ')}`);
    walkthroughSteps.push({
      message: `✅ SAFE STATE! Safe sequence: ${safeSequence.join(' → ')}`,
      phase: 'safe',
      highlightNodes: safeSequence,
    });
  } else {
    logs.push('System is unsafe; no safe sequence found.');
    walkthroughSteps.push({
      message: '❌ UNSAFE STATE! No safe sequence exists — potential deadlock.',
      phase: 'unsafe',
    });
  }

  return { safe, sequence: safeSequence, logs, walkthroughSteps };
}

export function runBankersAlgorithm(
  processIds: string[],
  resourceIds: string[],
  max: Record<string, Record<string, number>>,
  allocation: Record<string, Record<string, number>>,
  available: Record<string, number>
): BankersResult {
  const { safe, sequence, logs } = runBankersAlgorithmWithSteps(
    processIds,
    resourceIds,
    max,
    allocation,
    available
  );
  return { safe, sequence, logs };
}
