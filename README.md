# Deadlock Visualizer – Interactive OS Simulator

A modern React + Vite + TypeScript web app that visualizes deadlocks using a Resource Allocation Graph (RAG) and simulates Banker's Algorithm step-by-step.

## Overview

This project helps users explore how processes and resources interact in operating system deadlock scenarios. The interface includes:

- SVG graph canvas with processes and resources
- Drag-and-drop node positioning
- Click-to-connect request and allocation edges
- Real-time cycle detection for deadlock highlighting
- Banker's Algorithm simulation with Allocation, Max, Need, and Available views
- Scenario presets for deadlock and safe states
- Graph export/import as JSON
- Process recovery flow and dark mode

## Features

- Visualize processes as circles and resources as squares
- Create request edges (Process → Resource) and allocation edges (Resource → Process)
- Detect deadlocks using DFS cycle detection
- Compute safe/unsafe state with Banker's Algorithm
- Animate algorithm execution and show step logs
- Manage matrix values for allocation and availability
- Reset, import, and export graph configurations

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Zustand for state management
- SVG for rendering the resource allocation graph

## Run Locally

```bash
cd deadlock-visualizer
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Production Build

```bash
npm run build
```
