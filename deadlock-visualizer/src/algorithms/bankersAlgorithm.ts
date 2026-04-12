import type { GraphNode, GraphEdge } from '../types';

export interface BankersResult {
  safe: boolean;
  sequence: string[];
  logs: string[];
}

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

export function runBankersAlgorithm(
  processIds: string[],
  resourceIds: string[],
  max: Record<string, Record<string, number>>,
  allocation: Record<string, Record<string, number>>,
  available: Record<string, number>
): BankersResult {
  const need = computeNeedMatrix(processIds, resourceIds, max, allocation);
  const logs: string[] = [];
  const work: Record<string, number> = {};
  resourceIds.forEach((rid) => {
    work[rid] = Math.max(0, available[rid] ?? 0);
  });
  const finish: Record<string, boolean> = {};
  processIds.forEach((pid) => {
    finish[pid] = false;
  });

  logs.push('Starting Banker\'s Algorithm');
  logs.push(`Available: ${resourceIds.map((rid) => `${rid}=${work[rid]}`).join(', ')}`);

  const safeSequence: string[] = [];
  let progress = true;

  while (safeSequence.length < processIds.length && progress) {
    progress = false;
    for (const pid of processIds) {
      if (finish[pid]) continue;
      const requestOk = resourceIds.every((rid) => need[pid][rid] <= work[rid]);
      logs.push(`Checking ${pid}: Need ${resourceIds.map((rid) => `${rid}=${need[pid][rid]}`).join(', ')}`);
      if (requestOk) {
        logs.push(`${pid} can finish and releases ${resourceIds.map((rid) => `${rid}=${allocation[pid][rid]}`).join(', ')}`);
        resourceIds.forEach((rid) => {
          work[rid] += allocation[pid][rid];
        });
        finish[pid] = true;
        safeSequence.push(pid);
        progress = true;
        break;
      }
      logs.push(`${pid} cannot finish yet.`);
    }
  }

  const safe = safeSequence.length === processIds.length;
  if (safe) {
    logs.push(`System is safe. Safe sequence: ${safeSequence.join(' → ')}`);
  } else {
    logs.push('System is unsafe; no safe sequence found.');
  }

  return {
    safe,
    sequence: safeSequence,
    logs
  };
}
