import type { GraphNode, GraphEdge } from '../types';

export function terminateProcess(
  processId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const filteredNodes = nodes.filter((node) => node.id !== processId);
  const filteredEdges = edges.filter((edge) => edge.from !== processId && edge.to !== processId);
  return { nodes: filteredNodes, edges: filteredEdges };
}
