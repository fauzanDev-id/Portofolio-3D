# 3D Interactive Developer Portfolio

An interactive, stylized low-poly 3D developer portfolio website built with Three.js, vanilla JavaScript (ES modules), and Vite. Visitors explore a low-poly island with a third-person character, interact with buildings, and view project showcase panels.

## Current Status: Phase 2 — Greybox Island World
- **Data-Driven World Layout**: Configured in `src/world/worldLayout.js`.
- **Island Environment**: Low-poly grassy plateau, sand shoreline, and outer ocean water plane.
- **6 Themed Buildings**: Arranged in an inward-facing ring around a central plaza, color-coded with distinct roofs and front entrance doors.
- **Paths & Placenames**: Direct connecting pathways between plaza and entrances.
- **Procedural Scenery**: Deterministic seeded tree and rock placement via `InstancedMesh` for minimal draw calls.
- **Debug Orbit Controls**: Enabled in dev mode for camera inspection (`Left Click` rotate, `Right Click` pan, `Scroll` zoom).
- **Extended F3 Overlay**: Displays real-time FPS, draw calls, and rendered triangle counts.

## Tech Stack
- **Three.js**: Lightweight 3D rendering, scene graph, and instanced meshes
- **Vanilla JavaScript**: ES modules, modular component architecture
- **Vite**: Rapid development server and optimized production bundler

## How to Run

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Build for Production
```bash
npm run build
```
The optimized production bundle will be output to the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## Shortcuts
- **F3**: Toggle stats overlay (FPS, draw calls, triangles).
- **Dev Orbit Controls**:
  - `Left Click + Drag`: Orbit / rotate camera
  - `Right Click + Drag`: Pan camera
  - `Mouse Wheel`: Zoom in / out (constrained above water level)

## Planned Folder Structure
```text
Portofolio3D/
├── public/
│   ├── audio/         # Sound effects and ambient audio
│   ├── models/        # 3D low-poly models (GLTF/GLB)
│   └── textures/      # Textures and environment maps
├── src/
│   ├── core/          # Engine, lifecycle, renderer, loop
│   ├── data/          # Portfolio projects and content data
│   ├── input/         # Keyboard, mouse, pointer lock handlers
│   ├── interaction/   # Proximity detection and interactive prompts (E key)
│   ├── player/        # Character controller, physics/movement, camera follow
│   ├── styles/        # CSS stylesheets
│   ├── ui/            # 2D HUD, modals, project dialogs
│   ├── utils/         # Helper math, DebugOrbit, and loader utilities
│   ├── world/         # Island terrain, lighting, buildings, scenery, worldLayout
│   └── main.js        # Application entry point
├── index.html
├── package.json
└── vite.config.js
```
