/**
 * Wait-For Graph (WFG) Deadlock Detection
 *
 * Complexity: O(V + E) time, O(V) space
 *
 * The WFG is derived from the RAG by converting it to a process-only graph.
 * For each resource R allocated to P2 and requested by P1: P1 → P2.
 * Then we run DFS cycle detection on this reduced graph.
 */
import type { GraphNode, GraphEdge, WalkthroughStep } from '../types';

export interface WFGResult {
  deadlockedProcessIds: string[];
  waitForEdges: { from: string; to: string }[];
  walkthroughSteps: WalkthroughStep[];
  traversalOrder: string[];
}

export function buildWaitForGraph(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { waitForEdges: { from: string; to: string; resourceId: string }[] } {
  const processIds = nodes.filter((n) => n.type === 'process').map((n) => n.id);
  const resourceIds = nodes.filter((n) => n.type === 'resource').map((n) => n.id);

  // Map: resource → set of processes it's allocated to
  const allocatedTo: Record<string, string[]> = {};
  resourceIds.forEach((rid) => (allocatedTo[rid] = []));
  edges.forEach((e) => {
    if (e.type === 'allocation' && resourceIds.includes(e.from) && processIds.includes(e.to)) {
      allocatedTo[e.from].push(e.to);
    }
  });

  // Build wait-for: P1 waits for P2 if P1 requests R and P2 holds R
  const waitForEdges: { from: string; to: string; resourceId: string }[] = [];
  edges.forEach((e) => {
    if (e.type === 'request' && processIds.includes(e.from) && resourceIds.includes(e.to)) {
      const requestingProcess = e.from;
      const requestedResource = e.to;
      const holders = allocatedTo[requestedResource] ?? [];
      holders.forEach((holder) => {
        if (holder !== requestingProcess) {
          waitForEdges.push({ from: requestingProcess, to: holder, resourceId: requestedResource });
        }
      });
    }
  });

  return { waitForEdges };
}

export function detectDeadlockWFG(nodes: GraphNode[], edges: GraphEdge[]): WFGResult {
  const processIds = nodes.filter((n) => n.type === 'process').map((n) => n.id);
  const { waitForEdges } = buildWaitForGraph(nodes, edges);

  const walkthroughSteps: WalkthroughStep[] = [];
  const traversalOrder: string[] = [];

  walkthroughSteps.push({
    message: '🔍 Building Wait-For Graph from Resource Allocation Graph...',
    phase: 'info',
  });

  waitForEdges.forEach((wfe) => {
    walkthroughSteps.push({
      message: `Wait-For: ${wfe.from} → ${wfe.to} (waiting for resource ${wfe.resourceId})`,
      phase: 'info',
    });
  });

  // Adjacency list on process nodes only
  const adjacency: Record<string, string[]> = {};
  processIds.forEach((pid) => (adjacency[pid] = []));
  waitForEdges.forEach((wfe) => {
    if (adjacency[wfe.from]) adjacency[wfe.from].push(wfe.to);
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycleNodes = new Set<string>();

  function dfs(node: string, path: string[]) {
    visited.add(node);
    inStack.add(node);
    traversalOrder.push(node);
    path.push(node);

    walkthroughSteps.push({
      nodeId: node,
      message: `Visiting process ${node} in WFG.`,
      phase: 'visit',
      highlightNodes: [node],
    });

    const neighbors = adjacency[node] ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (inStack.has(neighbor)) {
        // Cycle found
        const cycleStart = path.indexOf(neighbor);
        const cyclePath = path.slice(cycleStart);
        cyclePath.forEach((n) => cycleNodes.add(n));
        walkthroughSteps.push({
          nodeId: neighbor,
          message: `⚠️ Cycle detected! ${cyclePath.join(' → ')} → ${neighbor}`,
          phase: 'cycle',
          highlightNodes: [...cyclePath],
        });
      }
    }

    inStack.delete(node);
    path.pop();
    walkthroughSteps.push({
      nodeId: node,
      message: `Backtracking from ${node}.`,
      phase: 'backtrack',
    });
  }

  processIds.forEach((pid) => {
    if (!visited.has(pid)) dfs(pid, []);
  });

  if (cycleNodes.size > 0) {
    walkthroughSteps.push({
      message: `❌ DEADLOCK DETECTED: Processes ${[...cycleNodes].join(', ')} are deadlocked.`,
      phase: 'unsafe',
      highlightNodes: [...cycleNodes],
    });
  } else {
    walkthroughSteps.push({
      message: '✅ No cycle in Wait-For Graph. System is deadlock-free.',
      phase: 'safe',
    });
  }

  return {
    deadlockedProcessIds: [...cycleNodes],
    waitForEdges: waitForEdges.map(({ from, to }) => ({ from, to })),
    walkthroughSteps,
    traversalOrder,
  };
}
