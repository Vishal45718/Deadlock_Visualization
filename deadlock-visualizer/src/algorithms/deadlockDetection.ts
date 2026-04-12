import type { GraphNode, GraphEdge, WalkthroughStep } from '../types';

export interface DeadlockDetectionResult {
  deadlockedProcessIds: string[];
  traversalOrder: string[];
  walkthroughSteps: WalkthroughStep[];
}

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

  function dfs(current: string, edgeFromParent?: string) {
    visited.add(current);
    stack.add(current);
    traversalOrder.push(current);
    path.push(current);
    
    walkthroughSteps.push({
      nodeId: current,
      edgeId: edgeFromParent,
      message: `Visiting ${current}.`
    });

    const neighbors = adjacency[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.to)) {
        walkthroughSteps.push({
          message: `Traversing edge ${current} → ${neighbor.to}.`,
          edgeId: neighbor.edgeId
        });
        dfs(neighbor.to, neighbor.edgeId);
      } else if (stack.has(neighbor.to)) {
        walkthroughSteps.push({
          message: `Cycle detected! ${neighbor.to} is a back-edge.`,
          edgeId: neighbor.edgeId,
          nodeId: neighbor.to
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
          message: `Node ${neighbor.to} already visited.`,
          edgeId: neighbor.edgeId
        });
      }
    }

    stack.delete(current);
    path.pop();
    walkthroughSteps.push({
      message: `Backtracking from ${current}.`,
      nodeId: current
    });
  }

  // Convention: start dfs from processes
  nodes.forEach((node) => {
    if (node.type === 'process' && !visited.has(node.id)) {
      dfs(node.id);
    }
  });

  // Then resources if any disconnected ones
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  return {
    deadlockedProcessIds: [...cycleNodes],
    traversalOrder,
    walkthroughSteps
  };
}
