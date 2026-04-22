import type { GraphNode, GraphEdge, WalkthroughStep } from '../types';

export interface DeadlockDetectionResult {
  deadlockedProcessIds: string[];
  traversalOrder: string[];
  walkthroughSteps: WalkthroughStep[];
}

/**
 * DFS-based Cycle Detection on the Resource Allocation Graph (RAG).
 *
 * Complexity: O(V + E) time, O(V) space
 *
 * Detects cycles by tracking the DFS stack. A back-edge to a node in the
 * current stack indicates a cycle, and all processes in that cycle are
 * considered deadlocked.
 */
export function detectDeadlock(nodes: GraphNode[], edges: GraphEdge[]): DeadlockDetectionResult {
  const adjacency: Record<string, { to: string; edgeId: string }[]> = {};
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  nodes.forEach((node) => {
    adjacency[node.id] = [];
  });

  edges.forEach((edge) => {
    adjacency[edge.from].push({ to: edge.to, edgeId: edge.id });
  });

  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];
  const cycleNodes = new Set<string>();
  const traversalOrder: string[] = [];
  const walkthroughSteps: WalkthroughStep[] = [];

  walkthroughSteps.push({
    message: '🔍 Starting DFS-based cycle detection on the RAG...',
    phase: 'info',
  });

  function dfs(current: string, edgeFromParent?: string) {
    visited.add(current);
    stack.add(current);
    traversalOrder.push(current);
    path.push(current);

    walkthroughSteps.push({
      nodeId: current,
      edgeId: edgeFromParent,
      message: `Visiting ${current}. Stack: [${[...stack].join(' → ')}]`,
      phase: 'visit',
      highlightNodes: [current],
    });

    const neighbors = adjacency[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.to)) {
        walkthroughSteps.push({
          message: `Traversing edge ${current} → ${neighbor.to}.`,
          edgeId: neighbor.edgeId,
          phase: 'info',
        });
        dfs(neighbor.to, neighbor.edgeId);
      } else if (stack.has(neighbor.to)) {
        walkthroughSteps.push({
          message: `⚠️ Back-edge found! ${current} → ${neighbor.to} creates a cycle.`,
          edgeId: neighbor.edgeId,
          nodeId: neighbor.to,
          phase: 'cycle',
          highlightNodes: path.slice(path.indexOf(neighbor.to)),
        });

        const cycleStart = path.indexOf(neighbor.to);
        if (cycleStart !== -1) {
          for (let i = cycleStart; i < path.length; i += 1) {
            const nodeId = path[i];
            if (nodeMap[nodeId]?.type === 'process') {
              cycleNodes.add(nodeId);
            }
          }
        }
      } else {
        walkthroughSteps.push({
          message: `Node ${neighbor.to} already fully visited (safe).`,
          edgeId: neighbor.edgeId,
          phase: 'info',
        });
      }
    }

    stack.delete(current);
    path.pop();
    walkthroughSteps.push({
      message: `Backtracking from ${current}.`,
      nodeId: current,
      phase: 'backtrack',
    });
  }

  // Start DFS from processes first (convention for RAG)
  nodes.forEach((node) => {
    if (node.type === 'process' && !visited.has(node.id)) {
      dfs(node.id);
    }
  });

  // Then from any unvisited resources
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  if (cycleNodes.size > 0) {
    walkthroughSteps.push({
      message: `❌ DEADLOCK: Processes ${[...cycleNodes].join(', ')} are in a cycle.`,
      phase: 'unsafe',
      highlightNodes: [...cycleNodes],
    });
  } else {
    walkthroughSteps.push({
      message: '✅ No cycles detected. System is deadlock-free.',
      phase: 'safe',
    });
  }

  return {
    deadlockedProcessIds: [...cycleNodes],
    traversalOrder,
    walkthroughSteps,
  };
}
