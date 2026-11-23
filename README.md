# 3D Interactive Developer Portfolio

An interactive, stylized low-poly 3D developer portfolio website built with Three.js, vanilla JavaScript (ES modules), and Vite. Visitors explore a low-poly island with a third-person character, interact with buildings, and view project showcase panels.

## Current Status: Phase 4 — Third-Person Camera Rig
- **Smooth Spherical Camera Rig**: Controls camera with yaw, pitch, and zoom tracking the player.
- **Pointer Drag Orbit**: Left-click or right-click drag rotates camera around the character with Pointer Capture and grab/grabbing cursors. Context menu suppressed.
- **Wheel Zoom**: Smoothly zooms distance between 4m and 12m with default page scroll prevention.
- **Camera-Relative Movement**: WASD and Arrow keys move relative to the current camera heading.
- **Ground & Water Safety**: Camera height is clamped above ground and water level, preventing clipping under the island or ocean.
- **Building Obstruction Handling**: Raycasts from player look-at to camera against buildings; pulls camera in smoothly to prevent wall clipping.
- **Strict Update Sequencing**: Camera rig updates immediately following player controller to eliminate visual jitter.
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
- **Orbit Camera**: <kbd>Left Click + Drag</kbd> or <kbd>Right Click + Drag</kbd>
- **Zoom Camera**: <kbd>Mouse Wheel</kbd>
- **Stats Overlay**: <kbd>F3</kbd> (toggle FPS, draw calls, triangles)

## Tunable Camera Constants
All camera parameters are exported in `src/player/CameraRig.js` in `CAMERA_CONFIG`:
- `DEFAULT_DISTANCE`: 7.0 m
- `MIN_DISTANCE`: 4.0 m
- `MAX_DISTANCE`: 12.0 m
- `DEFAULT_PITCH`: 0.35 rad (~20°)
- `MIN_PITCH`: -0.087 rad (~ -5°)
- `MAX_PITCH`: 1.22 rad (~ 70°)
- `MOUSE_SENSITIVITY`: 0.003 rad/px
- `ZOOM_SPEED`: 0.003
- `SMOOTH_TARGET`: 14.0 (look-at target damping)
- `SMOOTH_ROTATION`: 18.0 (orbit angles damping)
- `SMOOTH_DISTANCE`: 12.0 (zoom damping)
- `SMOOTH_CAMERA`: 20.0 (final position damping)
- `LOOK_AT_HEIGHT`: 1.4 m
- `MIN_GROUND_CLEARANCE`: 0.5 m
- `OBSTRUCTION_MARGIN`: 0.35 m

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
│   ├── input/         # InputManager, keyboard/pointer state
│   ├── interaction/   # Proximity detection and interactive prompts (E key)
│   ├── player/        # PlayerModel, PlayerController, CameraRig
│   ├── styles/        # CSS stylesheets
│   ├── ui/            # 2D HUD, modals, project dialogs
│   ├── utils/         # Helper math and loader utilities
│   ├── world/         # Island terrain, lighting, buildings, scenery, worldLayout
│   └── main.js        # Application entry point
├── index.html
├── package.json
└── vite.config.js
```
