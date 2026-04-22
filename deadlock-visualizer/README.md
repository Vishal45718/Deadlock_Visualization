# 🔴 Deadlock Visualizer

> **Interactive, portfolio-level deadlock detection and avoidance simulator built with React, TypeScript, Zustand, and SVG.**

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Zustand](https://img.shields.io/badge/Zustand-4.5-ff6b35?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)

---

## 📸 Screenshots

| Hero + Canvas | Step-by-Step DFS | Matrix Panel |
|---|---|---|
| _Deadlock graph with animated glow_ | _Cycle highlight + step indicator_ | _Allocation / Need / Max tables_ |

---

## ✨ Features

### 🎓 Educational Content
- **Tabbed learning panel** explaining what deadlocks are, Coffman's 4 conditions, a traffic gridlock analogy, and real-world OS/DB/distributed systems use cases
- Collapsible to keep the workspace clean

### 🖼 Interactive Graph Canvas
- **Drag-and-drop** nodes on an SVG canvas with dot grid background
- **Click two nodes** to create edges (auto-determines request vs. allocation type)
- **Right-click** to delete a node/edge or adjust resource instance count
- Real-time **deadlock cycle highlighting** (red glow + animated pulsing badge on deadlocked processes)
- SVG gradients, glows, and smooth transitions throughout

### 🔬 Three Algorithm Modes
| Algorithm | Complexity | Description |
|---|---|---|
| **DFS Cycle Detection** | T: O(V+E), S: O(V) | Back-edge detection on the Resource Allocation Graph |
| **Wait-For Graph (WFG)** | T: O(V+E), S: O(V²) | Reduces RAG to process-only graph then runs DFS |
| **Banker's Algorithm** | T: O(n²×m), S: O(n×m) | Safe-state proactive avoidance with safe sequence |

### ⏯ Step-by-Step Simulation
- **Manual stepping** with "Next Step →" button and progress bar
- **Auto-play** with pause/resume (▶/⏸) at three speeds (Slow / Normal / Fast)
- Color-coded step status bar: blue (visit), red (cycle), green (safe), gray (info)
- Step counter: "Step N of M"

### 🎲 Preset Scenarios
- 🔴 **Deadlock** — Classic 2-process circular deadlock
- ✅ **Safe State** — 2-process non-deadlocked resource sharing
- 🔺 **Complex (3P)** — Three-process circular deadlock
- 🎲 **Random** — Auto-generated graph with random processes/resources/edges

### 📊 Banker's Algorithm Matrix Panel
- Live **Allocation**, **Need**, and **Max** matrices
- **Editable Max matrix** — change values and see instant recalculation
- Safe sequence and status badge (SAFE / UNSAFE)

### 🔧 Recovery Simulation
- "Recover (Terminate Process)" — removes the first deadlocked process and its edges to break the cycle

### 📤 Import / Export
- **Export JSON** — save the full graph state to disk
- **Import JSON** — load a previously saved graph
- **Export SVG** — download the canvas as a vector image

### 📱 Responsive Design
- Fluid layout: two-column on desktop, single-column on mobile
- Sticky control panel for always-accessible controls
- Custom thin scrollbars, glassmorphism panels, ambient light blobs

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| State | Zustand 4 |
| Styling | Tailwind CSS 3 + custom CSS animations |
| Rendering | Native SVG with radial gradients & SVG filters |
| Bundler | Vite 5 |
| Fonts | Inter + JetBrains Mono (Google Fonts) |

---

## 🔧 How Algorithms Work

### DFS Cycle Detection (on RAG)
1. Build an adjacency list from all graph edges
2. Run DFS, tracking a **recursion stack**
3. If a neighbor is already in the stack → **back-edge = cycle**
4. All processes in the cycle path are marked **deadlocked**

### Wait-For Graph
1. For each resource R: if R is allocated to P2 and requested by P1 → add edge `P1 → P2`
2. This creates a process-only **Wait-For Graph**
3. Run DFS on WFG — any cycle means deadlock

### Banker's Algorithm
1. Compute `Need = Max - Allocation` matrix
2. Iterate: find a process whose `Need ≤ Work` (available resources)
3. "Finish" that process: add its allocation back to Work
4. Repeat until all processes finish (SAFE) or no progress (UNSAFE)

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Deadlock_Visualizer.git
cd Deadlock_Visualizer/deadlock-visualizer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📁 Project Structure

```
src/
├── algorithms/
│   ├── bankersAlgorithm.ts    # Banker's + step walkthrough generation
│   ├── deadlockDetection.ts   # DFS cycle detection with phase annotations
│   ├── waitForGraph.ts        # WFG construction + cycle detection
│   └── recovery.ts            # Process termination for recovery
├── components/
│   ├── Canvas.tsx             # SVG graph canvas with drag/drop, highlighting
│   ├── ControlPanel.tsx       # Algorithm selection, simulation controls, I/O
│   ├── HeroSection.tsx        # Educational tabbed explainer
│   ├── MatrixPanel.tsx        # Banker's matrix display + editable MAX
│   └── StepLog.tsx            # (legacy step log)
├── utils/
│   ├── graphUtils.ts          # Allocation/request matrix builders
│   └── matrixUtils.ts         # Default matrix initializers
├── store.ts                   # Zustand global store (all state + actions)
├── types.ts                   # TypeScript type definitions
├── App.tsx                    # Root layout component
└── index.css                  # Global styles + Google Fonts
```

---

## 🏆 What Makes This Portfolio-Grade

- **Algorithm Transparency**: Complexity badges + description for each algorithm; step-by-step with phase labels
- **Visual Excellence**: SVG gradients, glows, animated pulse on deadlocked nodes, grid canvas background
- **Interactive First**: Every element is interactive — drag, click, right-click, edit matrices in-place
- **Educational Value**: Hero section with Coffman conditions, traffic analogy, real-world domains
- **Performance**: Pure SVG rendering, no heavy visualization library overhead
- **Code Quality**: Modular architecture, typed throughout, clean separation of concerns

---

## 📄 License

MIT — feel free to use, fork, and extend.