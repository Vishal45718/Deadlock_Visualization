import create from 'zustand';
import type { GraphNode, GraphEdge, GraphState, BankersResult, BankersConfig, WalkthroughStep } from './types';
import { detectDeadlock } from './algorithms/deadlockDetection';
import { runBankersAlgorithm, getProcessIds, getResourceIds } from './algorithms/bankersAlgorithm';
import { getAllocationMatrix } from './utils/graphUtils';
import { getDefaultMaxMatrix, getDefaultAvailable } from './utils/matrixUtils';
import { terminateProcess } from './algorithms/recovery';

const deadlockNodes: GraphNode[] = [
  { id: 'P1', label: 'P1', type: 'process', x: 160, y: 120 },
  { id: 'P2', label: 'P2', type: 'process', x: 160, y: 320 },
  { id: 'R1', label: 'R1', type: 'resource', x: 420, y: 100, count: 1 },
  { id: 'R2', label: 'R2', type: 'resource', x: 420, y: 320, count: 1 }
];

const deadlockEdges: GraphEdge[] = [
  { id: 'e1', from: 'P1', to: 'R1', type: 'request' },
  { id: 'e2', from: 'R1', to: 'P2', type: 'allocation' },
  { id: 'e3', from: 'P2', to: 'R2', type: 'request' },
  { id: 'e4', from: 'R2', to: 'P1', type: 'allocation' }
];

const safeNodes: GraphNode[] = [
  { id: 'P1', label: 'P1', type: 'process', x: 140, y: 120 },
  { id: 'P2', label: 'P2', type: 'process', x: 140, y: 320 },
  { id: 'R1', label: 'R1', type: 'resource', x: 420, y: 220, count: 2 },
  { id: 'R2', label: 'R2', type: 'resource', x: 520, y: 120, count: 1 }
];

const safeEdges: GraphEdge[] = [
  { id: 's1', from: 'R1', to: 'P1', type: 'allocation' },
  { id: 's2', from: 'P2', to: 'R1', type: 'request' },
  { id: 's3', from: 'P1', to: 'R2', type: 'request' }
];

const buildBankersConfig = (nodes: GraphNode[], edges: GraphEdge[]): BankersConfig => {
  const processIds = getProcessIds(nodes);
  const resourceIds = getResourceIds(nodes);
  const maxMatrix = getDefaultMaxMatrix(processIds, resourceIds, nodes);
  const available = getDefaultAvailable(resourceIds, nodes);
  return {
    max: maxMatrix,
    available
  };
};

const initialBankersConfig = buildBankersConfig(deadlockNodes, deadlockEdges);

export interface AppStore extends Omit<GraphState, 'bankerConfig'> {
  bankerConfig: BankersConfig;
  selectedSourceId?: string;
  setSelectedSourceId: (id?: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  connectNodes: (fromId: string, toId: string) => void;
  addProcess: () => void;
  addResource: () => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  updateResourceCount: (id: string, delta: number) => void;
  loadScenario: (scenario: 'deadlock' | 'safe') => void;
  setMaxValue: (processId: string, resourceId: string, value: number) => void;
  setAvailableValue: (resourceId: string, value: number) => void;
  recoverProcess: () => void;
  exportGraph: () => string;
  importGraph: (payload: string) => void;
  resetGraph: () => void;
  toggleDarkMode: () => void;
  appendLog: (message: string) => void;
  refreshAnalysis: () => void;

  startVisualization: (steps: WalkthroughStep[]) => void;
  stepVisualization: () => void;
  endVisualization: () => void;
}

const createInitialState = (): Partial<AppStore> => {
  const initialResult: BankersResult = { safe: false, sequence: [], logs: [] };
  return {
    nodes: deadlockNodes,
    edges: deadlockEdges,
    selectedSourceId: undefined,
    deadlockedProcessIds: [],
    traversalOrder: [],
    bankersResult: initialResult,
    bankerConfig: initialBankersConfig,
    logs: ['Loaded deadlock example.'],
    darkMode: true,
    activeScenario: 'deadlock',
    walkthroughSteps: [],
    activeWalkthroughStepIndex: -1,
    highlightedNodeIds: [],
    highlightedEdgeIds: []
  };
};

const useStore = create<AppStore>((set, get) => {
  const refreshAnalysis = () => {
    const state = get();
    // Reconfigure dynamically if nodes were added/removed
    const processIds = getProcessIds(state.nodes);
    const resourceIds = getResourceIds(state.nodes);
    const allocation = getAllocationMatrix(processIds, resourceIds, state.edges);
    const bankersResult = runBankersAlgorithm(processIds, resourceIds, state.bankerConfig.max, allocation, state.bankerConfig.available);
    const deadlock = detectDeadlock(state.nodes, state.edges);

    set({
      deadlockedProcessIds: deadlock.deadlockedProcessIds,
      traversalOrder: deadlock.traversalOrder,
      bankersResult,
    });
  };

  const loadScenario = (scenario: 'deadlock' | 'safe') => {
    const nodes = scenario === 'deadlock' ? deadlockNodes : safeNodes;
    const edges = scenario === 'deadlock' ? deadlockEdges : safeEdges;
    const bankerConfig = buildBankersConfig(nodes, edges);
    const processIds = getProcessIds(nodes);
    const resourceIds = getResourceIds(nodes);
    const allocation = getAllocationMatrix(processIds, resourceIds, edges);
    const bankersResult = runBankersAlgorithm(processIds, resourceIds, bankerConfig.max, allocation, bankerConfig.available);

    set({
      nodes,
      edges,
      bankerConfig,
      bankersResult,
      selectedSourceId: undefined,
      activeScenario: scenario,
      deadlockedProcessIds: detectDeadlock(nodes, edges).deadlockedProcessIds,
      traversalOrder: [],
      logs: [`Loaded ${scenario === 'deadlock' ? 'deadlock' : 'safe'} scenario.`, ...bankersResult.logs],
      walkthroughSteps: [],
      activeWalkthroughStepIndex: -1,
      highlightedNodeIds: [],
      highlightedEdgeIds: []
    });
  };

  return {
    ...(createInitialState() as AppStore),

    updateNodePosition: (id, x, y) => {
      set((state) => ({
        nodes: state.nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
      }));
    },

    setSelectedSourceId: (id) => {
      set({ selectedSourceId: id });
    },

    addProcess: () => {
      const state = get();
      const pCount = state.nodes.filter(n => n.type === 'process').length;
      const id = `P${pCount + 1}`;
      const newNode: GraphNode = { id, label: id, type: 'process', x: 200, y: 200 };
      
      const newConfig = { ...state.bankerConfig, max: { ...state.bankerConfig.max, [id]: {} as Record<string, number> } };
      getResourceIds(state.nodes).forEach(rid => { newConfig.max[id][rid] = 0; });

      set({
        nodes: [...state.nodes, newNode],
        bankerConfig: newConfig,
        logs: [...state.logs, `Added new process ${id}`],
        activeScenario: 'idle'
      });
      get().refreshAnalysis();
    },

    addResource: () => {
      const state = get();
      const rCount = state.nodes.filter(n => n.type === 'resource').length;
      const id = `R${rCount + 1}`;
      const newNode: GraphNode = { id, label: id, type: 'resource', x: 400, y: 200, count: 1 };

      const newConfig = { ...state.bankerConfig, available: { ...state.bankerConfig.available, [id]: 1 } };
      getProcessIds(state.nodes).forEach(pid => {
        if (!newConfig.max[pid]) newConfig.max[pid] = {} as Record<string, number>;
        newConfig.max[pid][id] = 0;
      });

      set({
        nodes: [...state.nodes, newNode],
        bankerConfig: newConfig,
        logs: [...state.logs, `Added new resource ${id}`],
        activeScenario: 'idle'
      });
      get().refreshAnalysis();
    },

    removeNode: (id) => {
      const state = get();
      const newNodes = state.nodes.filter(n => n.id !== id);
      const newEdges = state.edges.filter(e => e.from !== id && e.to !== id);
      set({
        nodes: newNodes,
        edges: newEdges,
        logs: [...state.logs, `Removed node ${id}`],
        selectedSourceId: state.selectedSourceId === id ? undefined : state.selectedSourceId,
        activeScenario: 'idle'
      });
      get().refreshAnalysis();
    },

    removeEdge: (id) => {
      const state = get();
      set({
        edges: state.edges.filter(e => e.id !== id),
        logs: [...state.logs, `Removed edge`],
        activeScenario: 'idle'
      });
      get().refreshAnalysis();
    },

    updateResourceCount: (id, delta) => {
      const state = get();
      const nodes = state.nodes.map(n => {
        if (n.id === id && n.type === 'resource') {
          const newCount = Math.max(1, (n.count ?? 1) + delta);
          return { ...n, count: newCount };
        }
        return n;
      });
      
      const node = nodes.find(n => n.id === id);
      const newConfig = { ...state.bankerConfig };
      if (node) {
         newConfig.available[id] = node.count ?? 1;
      }
      
      set({ nodes, bankerConfig: newConfig, activeScenario: 'idle' });
      get().refreshAnalysis();
    },

    connectNodes: (fromId, toId) => {
      const state = get();
      const fromNode = state.nodes.find((node) => node.id === fromId);
      const toNode = state.nodes.find((node) => node.id === toId);
      if (!fromNode || !toNode || fromId === toId) {
        set({ selectedSourceId: undefined });
        return;
      }

      let edgeType: 'request' | 'allocation' | null = null;
      if (fromNode.type === 'process' && toNode.type === 'resource') edgeType = 'request';
      if (fromNode.type === 'resource' && toNode.type === 'process') edgeType = 'allocation';
      if (!edgeType) {
        set({ selectedSourceId: undefined });
        return;
      }

      const existingEdge = state.edges.find((edge) => edge.from === fromId && edge.to === toId);
      if (existingEdge) {
        set({ selectedSourceId: undefined });
        return;
      }

      const nextEdge = { id: `e-${Date.now()}`, from: fromId, to: toId, type: edgeType };
      const nextEdges = [...state.edges, nextEdge];
      set({ edges: nextEdges, selectedSourceId: undefined, logs: [...state.logs, `Added ${edgeType} edge ${fromId} → ${toId}`], activeScenario: 'idle' });
      get().refreshAnalysis();
    },

    loadScenario,

    setMaxValue: (processId, resourceId, value) => {
      set((state) => ({
        bankerConfig: {
          ...state.bankerConfig,
          max: {
            ...state.bankerConfig.max,
            [processId]: {
              ...state.bankerConfig.max[processId],
              [resourceId]: Math.max(0, value)
            }
          }
        }
      }));
      get().refreshAnalysis();
    },

    setAvailableValue: (resourceId, value) => {
      set((state) => ({
        bankerConfig: {
          ...state.bankerConfig,
          available: {
            ...state.bankerConfig.available,
            [resourceId]: Math.max(0, value)
          }
        }
      }));
      get().refreshAnalysis();
    },

    recoverProcess: () => {
      const state = get();
      if (state.deadlockedProcessIds.length === 0) {
        set({ logs: [...state.logs, 'No deadlocked processes to recover.'] });
        return;
      }

      const victim = state.deadlockedProcessIds[0];
      const result = terminateProcess(victim, state.nodes, state.edges);
      set({
        nodes: result.nodes,
        edges: result.edges,
        selectedSourceId: undefined,
        logs: [...state.logs, `Terminated ${victim} to recover from deadlock.`],
        activeScenario: 'idle'
      });
      get().refreshAnalysis();
    },

    exportGraph: () => {
      const state = get();
      const payload = JSON.stringify({ nodes: state.nodes, edges: state.edges, bankerConfig: state.bankerConfig }, null, 2);
      return payload;
    },

    importGraph: (payload) => {
      try {
        const parsed = JSON.parse(payload) as { nodes: GraphNode[]; edges: GraphEdge[]; bankerConfig?: BankersConfig };
        const newConfig = parsed.bankerConfig ?? buildBankersConfig(parsed.nodes, parsed.edges);
        set({
          nodes: parsed.nodes,
          edges: parsed.edges,
          bankerConfig: newConfig,
          selectedSourceId: undefined,
          activeScenario: 'idle',
          logs: [...get().logs, 'Imported graph configuration.']
        });
        get().refreshAnalysis();
      } catch (error) {
        set({ logs: [...get().logs, 'Failed to import graph JSON.'] });
      }
    },

    resetGraph: () => {
      set({
        nodes: deadlockNodes,
        edges: deadlockEdges,
        bankerConfig: initialBankersConfig,
        selectedSourceId: undefined,
        activeScenario: 'deadlock',
        logs: ['Reset to the default deadlock scenario.'],
        walkthroughSteps: [],
        activeWalkthroughStepIndex: -1,
        highlightedNodeIds: [],
        highlightedEdgeIds: []
      });
      get().refreshAnalysis();
    },

    toggleDarkMode: () => {
      set((state) => ({ darkMode: !state.darkMode }));
    },

    appendLog: (message) => {
      set((state) => ({ logs: [...state.logs, message] }));
    },

    startVisualization: (steps) => {
      set({ 
        walkthroughSteps: steps, 
        activeWalkthroughStepIndex: -1, 
        highlightedNodeIds: [], 
        highlightedEdgeIds: [],
        logs: [...get().logs, `Starting visualization with ${steps.length} steps...`]
      });
    },

    stepVisualization: () => {
      set((state) => {
        const nextIdx = state.activeWalkthroughStepIndex + 1;
        if (nextIdx >= state.walkthroughSteps.length) {
          return { activeWalkthroughStepIndex: state.walkthroughSteps.length };
        }
        
        const step = state.walkthroughSteps[nextIdx];
        const highlightedNodes = [...state.highlightedNodeIds];
        const highlightedEdges = [...state.highlightedEdgeIds];
        
        if (step.nodeId && !highlightedNodes.includes(step.nodeId)) highlightedNodes.push(step.nodeId);
        if (step.edgeId && !highlightedEdges.includes(step.edgeId)) highlightedEdges.push(step.edgeId);
        
        return {
          activeWalkthroughStepIndex: nextIdx,
          highlightedNodeIds: highlightedNodes,
          highlightedEdgeIds: highlightedEdges,
          logs: [...state.logs, step.message]
        };
      });
    },

    endVisualization: () => {
      set({
        walkthroughSteps: [],
        activeWalkthroughStepIndex: -1,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        logs: [...get().logs, 'Visualization complete.']
      });
    },

    refreshAnalysis
  };
});

export default useStore;
