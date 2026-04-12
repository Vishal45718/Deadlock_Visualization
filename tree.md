deadlock-visualizer/
├── src/
│   ├── components/
│   │   ├── Canvas.jsx          # Main SVG drag-drop area
│   │   ├── ProcessNode.jsx     # Circular process node (P1, P2...)
│   │   ├── ResourceNode.jsx    # Square resource node with instances
│   │   ├── Edge.jsx            # Allocation / request edges
│   │   ├── ControlPanel.jsx    # Add nodes, run algorithms
│   │   ├── MatrixView.jsx      # Allocation/Need/Available tables
│   │   └── StepLog.jsx         # Step-by-step algorithm narration
│   ├── algorithms/
│   │   ├── deadlockDetection.js   # RAG cycle detection (DFS)
│   │   ├── bankersAlgorithm.js    # Safety algorithm + resource request
│   │   └── recovery.js            # Process termination / preemption
│   ├── models/
│   │   ├── Process.js          # Process data shape
│   │   ├── Resource.js         # Resource data shape
│   │   └── GraphState.js       # Full graph state definition
│   ├── hooks/
│   │   ├── useGraph.js         # Graph state + mutations
│   │   ├── useDragDrop.js      # Drag logic for canvas nodes
│   │   └── useAlgorithm.js     # Step-through algorithm runner
│   └── utils/
│       ├── graphUtils.js       # Adjacency list helpers
│       └── matrixUtils.js      # Matrix math helpers
