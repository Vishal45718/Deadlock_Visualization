import type { GraphNode, GraphEdge } from '../types';

export function initializeMatrix<T>(processIds: string[], resourceIds: string[], defaultValue: T) {
  return processIds.reduce<Record<string, Record<string, T>>>((acc, pid) => {
    acc[pid] = {} as Record<string, T>;
    resourceIds.forEach((rid) => {
      acc[pid][rid] = defaultValue;
    });
    return acc;
  }, {} as Record<string, Record<string, T>>);
}

export function getDefaultMaxMatrix(processIds: string[], resourceIds: string[], resources: GraphNode[]) {
  return processIds.reduce<Record<string, Record<string, number>>>((acc, pid) => {
    acc[pid] = {};
    resourceIds.forEach((rid) => {
      const resource = resources.find((node) => node.id === rid);
      acc[pid][rid] = resource?.count ?? 1;
    });
    return acc;
  }, {} as Record<string, Record<string, number>>);
}

export function getDefaultAvailable(resourceIds: string[], resources: GraphNode[]) {
  return resourceIds.reduce<Record<string, number>>((acc, rid) => {
    const resource = resources.find((node) => node.id === rid);
    acc[rid] = resource?.count ?? 1;
    return acc;
  }, {} as Record<string, number>);
}
