# 3D Interactive Developer Portfolio

An interactive, stylized low-poly 3D developer portfolio website built with Three.js, vanilla JavaScript (ES modules), and Vite. Visitors explore a low-poly island with a third-person character, interact with buildings, and view project showcase panels.

## Current Status: Phase 3 — Placeholder Character & Movement
- **Camera-Relative Movement**: WASD / Arrow keys move character horizontally relative to camera orientation.
- **Sprinting & Jumping**: Hold `Shift` to sprint (7 m/s vs 3.5 m/s walk); press `Space` to jump with snappy gravity.
- **Respawn**: Press `R` to respawn at the central plaza.
- **Smooth Kinematics**: Acceleration, deceleration, shortest-angle rotation, and zero-allocation frame updates.
- **Island Boundary Containment**: Prevents falling into water by smoothly sliding along the island perimeter.
- **Procedural Character**: Capsule body (1.7m) with facing visor and procedural walk/run bobbing.
- **Dynamic Camera Tracking**: Dev Orbit controls smoothly track character movement.
- **Data-Driven World Layout**: Configured in `src/world/worldLayout.js`.
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

## Controls
- **Movement**: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>Arrow Keys</kbd> (camera-relative)
- **Sprint**: Hold <kbd>Shift</kbd>
- **Jump**: <kbd>Space</kbd>
- **Respawn**: <kbd>R</kbd>
- **Stats Overlay**: <kbd>F3</kbd> (toggle FPS, draw calls, triangles)
- **Dev Orbit Controls**:
  - `Left Click + Drag`: Orbit around player
  - `Right Click + Drag`: Pan camera
  - `Mouse Wheel`: Zoom in / out

## Tunable Movement Constants
All kinematic tuning values are exported in `src/player/PlayerController.js`:
- `WALK_SPEED`: 3.5 m/s
- `RUN_SPEED`: 7.0 m/s
- `ACCELERATION`: 22.0 m/s²
- `DECELERATION`: 26.0 m/s²
- `AIR_CONTROL`: 0.35
- `JUMP_HEIGHT`: 1.1 m
- `GRAVITY`: -25.0 m/s²
- `TURN_SPEED`: 12.0 rad/s
- `MAX_DELTA`: 0.05 s
- `ISLAND_MARGIN`: 1.5 m

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
│   ├── input/         # InputManager, keyboard/mouse state
│   ├── interaction/   # Proximity detection and interactive prompts (E key)
│   ├── player/        # PlayerModel, PlayerController, movement
│   ├── styles/        # CSS stylesheets
│   ├── ui/            # 2D HUD, modals, project dialogs
│   ├── utils/         # Helper math, DebugOrbit
│   ├── world/         # Island terrain, lighting, buildings, scenery, worldLayout
│   └── main.js        # Application entry point
├── index.html
├── package.json
└── vite.config.js
```
