import { create } from 'zustand';
import type {
  GraphNode,
  GraphEdge,
  GraphState,
  BankersResult,
  BankersConfig,
  WalkthroughStep,
  AlgorithmType,
  SimulationSpeed,
} from './types';
import { detectDeadlock } from './algorithms/deadlockDetection';
import { detectDeadlockWFG } from './algorithms/waitForGraph';
import {
  runBankersAlgorithm,
  runBankersAlgorithmWithSteps,
  getProcessIds,
  getResourceIds,
} from './algorithms/bankersAlgorithm';
import { getAllocationMatrix } from './utils/graphUtils';
import { getDefaultMaxMatrix, getDefaultAvailable } from './utils/matrixUtils';
import { terminateProcess } from './algorithms/recovery';

// ─── Preset Scenarios ──────────────────────────────────────────────────────────

const deadlockNodes: GraphNode[] = [
  { id: 'P1', label: 'P1', type: 'process', x: 160, y: 120 },
  { id: 'P2', label: 'P2', type: 'process', x: 160, y: 320 },
  { id: 'R1', label: 'R1', type: 'resource', x: 420, y: 100, count: 1 },
  { id: 'R2', label: 'R2', type: 'resource', x: 420, y: 320, count: 1 },
];

const deadlockEdges: GraphEdge[] = [
  { id: 'e1', from: 'P1', to: 'R1', type: 'request' },
  { id: 'e2', from: 'R1', to: 'P2', type: 'allocation' },
  { id: 'e3', from: 'P2', to: 'R2', type: 'request' },
  { id: 'e4', from: 'R2', to: 'P1', type: 'allocation' },
];

const safeNodes: GraphNode[] = [
  { id: 'P1', label: 'P1', type: 'process', x: 140, y: 120 },
  { id: 'P2', label: 'P2', type: 'process', x: 140, y: 320 },
  { id: 'R1', label: 'R1', type: 'resource', x: 420, y: 220, count: 2 },
  { id: 'R2', label: 'R2', type: 'resource', x: 520, y: 120, count: 1 },
];

const safeEdges: GraphEdge[] = [
  { id: 's1', from: 'R1', to: 'P1', type: 'allocation' },
  { id: 's2', from: 'P2', to: 'R1', type: 'request' },
  { id: 's3', from: 'P1', to: 'R2', type: 'request' },
];

// Complex 3-process circular deadlock
const complexNodes: GraphNode[] = [
  { id: 'P1', label: 'P1', type: 'process', x: 200, y: 80 },
  { id: 'P2', label: 'P2', type: 'process', x: 400, y: 80 },
  { id: 'P3', label: 'P3', type: 'process', x: 300, y: 280 },
  { id: 'R1', label: 'R1', type: 'resource', x: 300, y: 80, count: 1 },
  { id: 'R2', label: 'R2', type: 'resource', x: 480, y: 200, count: 1 },
  { id: 'R3', label: 'R3', type: 'resource', x: 120, y: 200, count: 1 },
];

const complexEdges: GraphEdge[] = [
  { id: 'c1', from: 'P1', to: 'R1', type: 'request' },
  { id: 'c2', from: 'R1', to: 'P2', type: 'allocation' },
  { id: 'c3', from: 'P2', to: 'R2', type: 'request' },
  { id: 'c4', from: 'R2', to: 'P3', type: 'allocation' },
  { id: 'c5', from: 'P3', to: 'R3', type: 'request' },
  { id: 'c6', from: 'R3', to: 'P1', type: 'allocation' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const buildBankersConfig = (nodes: GraphNode[], edges: GraphEdge[]): BankersConfig => {
  const processIds = getProcessIds(nodes);
  const resourceIds = getResourceIds(nodes);
  const maxMatrix = getDefaultMaxMatrix(processIds, resourceIds, nodes);
  const available = getDefaultAvailable(resourceIds, nodes);
  return { max: maxMatrix, available };
};

const SPEED_MS: Record<SimulationSpeed, number> = {
  slow: 1400,
  normal: 800,
  fast: 300,
};

// ─── Store Interface ────────────────────────────────────────────────────────────

export interface AppStore extends Omit<GraphState, 'bankerConfig'> {
  bankerConfig: BankersConfig;
  selectedSourceId?: string;

  // Graph mutations
  setSelectedSourceId: (id?: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  connectNodes: (fromId: string, toId: string) => void;
  addProcess: () => void;
  addResource: () => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  updateResourceCount: (id: string, delta: number) => void;

  // Scenarios
  loadScenario: (scenario: 'deadlock' | 'safe' | 'complex') => void;
  generateRandom: () => void;
  resetGraph: () => void;

  // Banker's config
  setMaxValue: (processId: string, resourceId: string, value: number) => void;
  setAvailableValue: (resourceId: string, value: number) => void;

  // Recovery
  recoverProcess: () => void;

  // Import/Export
  exportGraph: () => string;
  importGraph: (payload: string) => void;
  exportSVG: () => void;

  // Settings
  toggleDarkMode: () => void;
  setActiveAlgorithm: (alg: AlgorithmType) => void;
  setSimulationSpeed: (speed: SimulationSpeed) => void;

  // Logging
  appendLog: (message: string) => void;
  clearLogs: () => void;

  // Analysis
  refreshAnalysis: () => void;

  // Step visualization
  startVisualization: (steps: WalkthroughStep[]) => void;
  stepVisualization: () => void;
  endVisualization: () => void;
  toggleAutoPlay: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

const initialBankersConfig = buildBankersConfig(deadlockNodes, deadlockEdges);

const useStore = create<AppStore>((set, get) => {
  let _autoPlayInterval: ReturnType<typeof setTimeout> | null = null;

  const refreshAnalysis = () => {
    const state = get();
    const processIds = getProcessIds(state.nodes);
    const resourceIds = getResourceIds(state.nodes);
    const allocation = getAllocationMatrix(processIds, resourceIds, state.edges);
    const bankersResult = runBankersAlgorithm(
      processIds,
      resourceIds,
      state.bankerConfig.max,
      allocation,
      state.bankerConfig.available
    );
    const deadlock = detectDeadlock(state.nodes, state.edges);

    set({
      deadlockedProcessIds: deadlock.deadlockedProcessIds,
      traversalOrder: deadlock.traversalOrder,
      bankersResult,
    });
  };

  const loadScenario = (scenario: 'deadlock' | 'safe' | 'complex') => {
    const nodeMap = { deadlock: deadlockNodes, safe: safeNodes, complex: complexNodes };
    const edgeMap = { deadlock: deadlockEdges, safe: safeEdges, complex: complexEdges };
    const nodes = nodeMap[scenario];
    const edges = edgeMap[scenario];
    const bankerConfig = buildBankersConfig(nodes, edges);
    const processIds = getProcessIds(nodes);
    const resourceIds = getResourceIds(nodes);
    const allocation = getAllocationMatrix(processIds, resourceIds, edges);
    const bankersResult = runBankersAlgorithm(
      processIds,
      resourceIds,
      bankerConfig.max,
      allocation,
      bankerConfig.available
    );

    set({
      nodes,
      edges,
      bankerConfig,
      bankersResult,
      selectedSourceId: undefined,
      activeScenario: scenario,
      deadlockedProcessIds: detectDeadlock(nodes, edges).deadlockedProcessIds,
      traversalOrder: [],
      logs: [`Loaded ${scenario} scenario.`, ...bankersResult.logs.slice(0, 3)],
      walkthroughSteps: [],
      activeWalkthroughStepIndex: -1,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
    });
  };

  return {
    // Initial state
    nodes: deadlockNodes,
    edges: deadlockEdges,
    selectedSourceId: undefined,
    deadlockedProcessIds: [],
    traversalOrder: [],
    bankersResult: { safe: false, sequence: [], logs: [] },
    bankerConfig: initialBankersConfig,
    logs: ['Loaded deadlock example.'],
    darkMode: true,
    activeScenario: 'deadlock',
    walkthroughSteps: [],
    activeWalkthroughStepIndex: -1,
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
    activeAlgorithm: 'dfs',
    simulationSpeed: 'normal',
    isAutoPlaying: false,
    _autoPlayInterval: null,

    // ─── Graph mutations ─────────────────────────────────────────────────────

    updateNodePosition: (id, x, y) => {
      set((state) => ({
        nodes: state.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)),
      }));
    },

    setSelectedSourceId: (id) => set({ selectedSourceId: id }),

    addProcess: () => {
      const state = get();
      const existing = state.nodes.filter((n) => n.type === 'process').map((n) => n.id);
      // Find the next available Pn label
      let num = existing.length + 1;
      while (existing.includes(`P${num}`)) num++;
      const id = `P${num}`;
      const angle = (existing.length * 2.3) % (2 * Math.PI);
      const newNode: GraphNode = {
        id,
        label: id,
        type: 'process',
        x: 280 + Math.cos(angle) * 160,
        y: 240 + Math.sin(angle) * 140,
      };
      const newConfig = {
        ...state.bankerConfig,
        max: { ...state.bankerConfig.max, [id]: {} as Record<string, number> },
      };
      getResourceIds(state.nodes).forEach((rid) => {
        newConfig.max[id][rid] = 0;
      });

      set({
        nodes: [...state.nodes, newNode],
        bankerConfig: newConfig,
        logs: [...state.logs, `Added process ${id}`],
        activeScenario: 'idle',
      });
      get().refreshAnalysis();
    },

    addResource: () => {
      const state = get();
      const existing = state.nodes.filter((n) => n.type === 'resource').map((n) => n.id);
      let num = existing.length + 1;
      while (existing.includes(`R${num}`)) num++;
      const id = `R${num}`;
      const angle = (existing.length * 2.1 + 0.5) % (2 * Math.PI);
      const newNode: GraphNode = {
        id,
        label: id,
        type: 'resource',
        x: 420 + Math.cos(angle) * 120,
        y: 200 + Math.sin(angle) * 100,
        count: 1,
      };
      const newConfig = {
        ...state.bankerConfig,
        available: { ...state.bankerConfig.available, [id]: 1 },
      };
      getProcessIds(state.nodes).forEach((pid) => {
        if (!newConfig.max[pid]) newConfig.max[pid] = {} as Record<string, number>;
        newConfig.max[pid][id] = 0;
      });

      set({
        nodes: [...state.nodes, newNode],
        bankerConfig: newConfig,
        logs: [...state.logs, `Added resource ${id}`],
        activeScenario: 'idle',
      });
      get().refreshAnalysis();
    },

    removeNode: (id) => {
      const state = get();
      const newNodes = state.nodes.filter((n) => n.id !== id);
      const newEdges = state.edges.filter((e) => e.from !== id && e.to !== id);
      set({
        nodes: newNodes,
        edges: newEdges,
        logs: [...state.logs, `Removed node ${id}`],
        selectedSourceId: state.selectedSourceId === id ? undefined : state.selectedSourceId,
        activeScenario: 'idle',
      });
      get().refreshAnalysis();
    },

    removeEdge: (id) => {
      const state = get();
      set({
        edges: state.edges.filter((e) => e.id !== id),
        logs: [...state.logs, 'Removed edge'],
        activeScenario: 'idle',
      });
      get().refreshAnalysis();
    },

    updateResourceCount: (id, delta) => {
      const state = get();
      const nodes = state.nodes.map((n) => {
        if (n.id === id && n.type === 'resource') {
          const newCount = Math.max(1, (n.count ?? 1) + delta);
          return { ...n, count: newCount };
        }
        return n;
      });
      const node = nodes.find((n) => n.id === id);
      const newConfig = { ...state.bankerConfig };
      if (node) newConfig.available[id] = node.count ?? 1;
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

      const nextEdge: GraphEdge = { id: `e-${Date.now()}`, from: fromId, to: toId, type: edgeType };
      set({
        edges: [...state.edges, nextEdge],
        selectedSourceId: undefined,
        logs: [...state.logs, `Added ${edgeType} edge: ${fromId} → ${toId}`],
        activeScenario: 'idle',
      });
      get().refreshAnalysis();
    },

    loadScenario,

    generateRandom: () => {
      const pCount = Math.floor(Math.random() * 3) + 2; // 2-4 processes
      const rCount = Math.floor(Math.random() * 2) + 2; // 2-3 resources
      const W = 580, H = 480;
      const nodes: GraphNode[] = [];

      // Arrange processes in a column on the left
      for (let i = 0; i < pCount; i++) {
        nodes.push({
          id: `P${i + 1}`,
          label: `P${i + 1}`,
          type: 'process',
          x: 80 + Math.random() * 80,
          y: 60 + (i * (H - 100)) / Math.max(pCount - 1, 1) + (Math.random() - 0.5) * 40,
        });
      }

      // Arrange resources in a column on the right
      for (let i = 0; i < rCount; i++) {
        nodes.push({
          id: `R${i + 1}`,
          label: `R${i + 1}`,
          type: 'resource',
          x: W - 160 + Math.random() * 60,
          y: 80 + (i * (H - 120)) / Math.max(rCount - 1, 1) + (Math.random() - 0.5) * 40,
          count: Math.floor(Math.random() * 2) + 1,
        });
      }

      const edges: GraphEdge[] = [];
      const pIds = nodes.filter((n) => n.type === 'process').map((n) => n.id);
      const rIds = nodes.filter((n) => n.type === 'resource').map((n) => n.id);

      // Randomly allocate some resources to processes
      rIds.forEach((rid) => {
        if (Math.random() > 0.3) {
          const pid = pIds[Math.floor(Math.random() * pIds.length)];
          edges.push({ id: `e-${rid}-${pid}`, from: rid, to: pid, type: 'allocation' });
        }
      });

      // Randomly create request edges (ensuring no duplicate)
      pIds.forEach((pid) => {
        if (Math.random() > 0.4) {
          const rid = rIds[Math.floor(Math.random() * rIds.length)];
          const alreadyExists = edges.some((e) => e.from === pid && e.to === rid);
          if (!alreadyExists) {
            edges.push({ id: `e-${pid}-${rid}`, from: pid, to: rid, type: 'request' });
          }
        }
      });

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
        activeScenario: 'random',
        deadlockedProcessIds: detectDeadlock(nodes, edges).deadlockedProcessIds,
        traversalOrder: [],
        logs: ['Generated random scenario.', ...bankersResult.logs.slice(0, 2)],
        walkthroughSteps: [],
        activeWalkthroughStepIndex: -1,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
      });
    },

    resetGraph: () => {
      set({
        nodes: deadlockNodes,
        edges: deadlockEdges,
        bankerConfig: initialBankersConfig,
        selectedSourceId: undefined,
        activeScenario: 'deadlock',
        logs: ['Reset to default deadlock scenario.'],
        walkthroughSteps: [],
        activeWalkthroughStepIndex: -1,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
      });
      get().refreshAnalysis();
    },

    setMaxValue: (processId, resourceId, value) => {
      set((state) => ({
        bankerConfig: {
          ...state.bankerConfig,
          max: {
            ...state.bankerConfig.max,
            [processId]: {
              ...state.bankerConfig.max[processId],
              [resourceId]: Math.max(0, value),
            },
          },
        },
      }));
      get().refreshAnalysis();
    },

    setAvailableValue: (resourceId, value) => {
      set((state) => ({
        bankerConfig: {
          ...state.bankerConfig,
          available: {
            ...state.bankerConfig.available,
            [resourceId]: Math.max(0, value),
          },
        },
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
        activeScenario: 'idle',
      });
      get().refreshAnalysis();
    },

    exportGraph: () => {
      const state = get();
      return JSON.stringify({ nodes: state.nodes, edges: state.edges, bankerConfig: state.bankerConfig }, null, 2);
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
          logs: [...get().logs, 'Imported graph configuration.'],
        });
        get().refreshAnalysis();
      } catch {
        set({ logs: [...get().logs, 'Failed to import: invalid JSON.'] });
      }
    },

    exportSVG: () => {
      const svgElement = document.querySelector('#deadlock-canvas-svg') as SVGSVGElement | null;
      if (!svgElement) return;
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgElement);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'deadlock-graph.svg';
      link.click();
      URL.revokeObjectURL(url);
    },

    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

    setActiveAlgorithm: (alg) => set({ activeAlgorithm: alg }),

    setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

    appendLog: (message) => set((state) => ({ logs: [...state.logs, message] })),

    clearLogs: () => set({ logs: [] }),

    refreshAnalysis,

    startVisualization: (steps) => {
      set({
        walkthroughSteps: steps,
        activeWalkthroughStepIndex: -1,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        logs: [...get().logs, `Starting step-by-step visualization (${steps.length} steps)...`],
      });
    },

    stepVisualization: () => {
      set((state) => {
        const nextIdx = state.activeWalkthroughStepIndex + 1;
        if (nextIdx >= state.walkthroughSteps.length) {
          return { activeWalkthroughStepIndex: state.walkthroughSteps.length };
        }
        const step = state.walkthroughSteps[nextIdx];
        const highlightedNodes = step.highlightNodes ?? (step.nodeId ? [step.nodeId] : []);
        const highlightedEdges = step.edgeId ? [step.edgeId] : [];

        return {
          activeWalkthroughStepIndex: nextIdx,
          highlightedNodeIds: highlightedNodes,
          highlightedEdgeIds: highlightedEdges,
          logs: [...state.logs, step.message],
        };
      });
    },

    endVisualization: () => {
      if (_autoPlayInterval) {
        clearInterval(_autoPlayInterval);
        _autoPlayInterval = null;
      }
      set({
        walkthroughSteps: [],
        activeWalkthroughStepIndex: -1,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        isAutoPlaying: false,
        logs: [...get().logs, 'Visualization ended.'],
      });
    },

    toggleAutoPlay: () => {
      const state = get();
      if (state.isAutoPlaying) {
        // Pause
        if (_autoPlayInterval) {
          clearInterval(_autoPlayInterval);
          _autoPlayInterval = null;
        }
        set({ isAutoPlaying: false });
      } else {
        // Start/resume auto-play
        set({ isAutoPlaying: true });
        const tick = () => {
          const s = get();
          if (
            s.walkthroughSteps.length === 0 ||
            s.activeWalkthroughStepIndex >= s.walkthroughSteps.length - 1
          ) {
            if (_autoPlayInterval) {
              clearInterval(_autoPlayInterval);
              _autoPlayInterval = null;
            }
            set({ isAutoPlaying: false });
            return;
          }
          get().stepVisualization();
        };
        _autoPlayInterval = setInterval(tick, SPEED_MS[state.simulationSpeed]);
      }
    },
  };
});

export default useStore;
