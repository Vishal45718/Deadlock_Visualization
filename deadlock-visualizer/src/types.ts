export type NodeType = 'process' | 'resource';
export type EdgeType = 'request' | 'allocation';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  count?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
}

export interface BankersConfig {
  max: Record<string, Record<string, number>>;
  available: Record<string, number>;
}

export interface WalkthroughStep {
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedSourceId?: string;
  deadlockedProcessIds: string[];
  traversalOrder: string[];
  bankersResult: BankersResult;
  bankerConfig: BankersConfig;
  logs: string[];
  darkMode: boolean;
  activeScenario: 'idle' | 'deadlock' | 'safe';
  walkthroughSteps: WalkthroughStep[];
  activeWalkthroughStepIndex: number;
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
}

export interface BankersResult {
  safe: boolean;
  sequence: string[];
  logs: string[];
}
