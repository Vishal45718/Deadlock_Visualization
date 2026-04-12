import type { GraphNode, GraphEdge } from '../types';

export function getProcessIds(nodes: GraphNode[]) {
  return nodes.filter((node) => node.type === 'process').map((node) => node.id);
}

export function getResourceIds(nodes: GraphNode[]) {
  return nodes.filter((node) => node.type === 'resource').map((node) => node.id);
}

export function getAllocationMatrix(processIds: string[], resourceIds: string[], edges: GraphEdge[]) {
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

export function getRequestMatrix(processIds: string[], resourceIds: string[], edges: GraphEdge[]) {
  const requests: Record<string, Record<string, number>> = {};
  processIds.forEach((pid) => {
    requests[pid] = {};
    resourceIds.forEach((rid) => {
      requests[pid][rid] = 0;
    });
  });

  edges.forEach((edge) => {
    if (edge.type === 'request' && processIds.includes(edge.from) && resourceIds.includes(edge.to)) {
      requests[edge.from][edge.to] += 1;
    }
  });

  return requests;
}
