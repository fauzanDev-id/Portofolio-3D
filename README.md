# 3D Interactive Developer Portfolio

An interactive, stylized low-poly 3D developer portfolio website built with Three.js, vanilla JavaScript (ES modules), and Vite. Visitors explore a low-poly island with a third-person character, interact with buildings, and view project showcase panels.

## Current Status: Phase 7 — Stylized Fantasy Night Atmosphere & Quality System
- **Night Fantasy Visual Atmosphere**: Midnight navy and twilight purple sky dome, twinkling starfield, glowing billboard moon, and matched exponential fog (`THREE.FogExp2`).
- **Selective HDR Bloom & Post-Processing (`src/core/PostProcessing.js`)**: UnrealBloomPass with ACESFilmic tone mapping and HalfFloatType render target. Emissive elements (amber windows, cyan neon doors, path lanterns, purple crystals) glow vividly.
- **Unified Night Palette (`src/world/Atmosphere.js`)**: Single source of truth (`NIGHT_PALETTE`) configuring moonlight, indigo ambient fill, exponential fog, ocean colors, and the single central plaza point light.
- **Ocean Water Shimmer**: Stylized dark oceanic water with procedural multi-sine wave highlights and specular glimmering.
- **GPU-Animated Fireflies (`src/world/Fireflies.js`)**: Bioluminescent particles with GPU vertex-shader wandering motion and organic pulsation (1 draw call, zero CPU loop overhead).
- **Floating Rock Islets (`src/world/FloatingIslands.js`)**: Low-poly inverted rock cones with glowing purple crystal spires gently bobbing in the distance.
- **Scalable Graphics Quality (`src/core/Quality.js`)**:
  - Three distinct tiers: `low`, `medium` (default), and `high`.
  - Persisted in `localStorage` and supports URL parameter override (`?quality=low`).
  - Low tier completely bypasses the post-processing composer for zero GPU overhead on low-end hardware.
  - Real-time tier cycling with <kbd>F2</kbd> keyboard shortcut, featuring a sleek floating toast notification.
  - **Dev-Only Live Visual Tuning**: During development (`npm run dev`), bloom and exposure parameters can be interactively tuned via URL query parameters without rebuilding:
    - `?bloom=0.35` (bloom strength, clamped `[0.0, 2.0]`)
    - `?bloomRadius=0.32` (bloom blur radius, clamped `[0.0, 2.0]`)
    - `?bloomThreshold=0.95` (luminance threshold, clamped `[0.0, 1.5]`)
    - `?exposure=1.0` (ACESFilmic tone mapping exposure, clamped `[0.2, 3.0]`)
    - Example: `http://localhost:5173/?quality=high&bloom=0.35&bloomRadius=0.32&bloomThreshold=0.95&exposure=1.0`
- **Game HUD & Progression System**:
  - Profile & XP Progression HUD (top-left) with animated XP bar and celebratory discovery toasts.
  - Fast-Travel Navigation Menu (top-right) with fade-to-black transitions (<kbd>1</kbd> - <kbd>7</kbd>).
  - Navigational Compass (bottom-right) with landmark blips and real-time yaw synchronization.
  - Quick Access Social Links (bottom-left) and auto-hide while viewing modals.
- **Third-Person Follow Camera**: Dynamic chase camera with backward walk protection and manual drag blend (<kbd>C</kbd> toggles Follow/Free).
- **Lightweight Performance Budget**: Total scene runs $\le 75$ draw calls at High quality and sustains 60+ FPS at Medium.

## Tech Stack
- **Three.js**: Lightweight 3D rendering, scene graph, instanced meshes, and post-processing passes
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
- **Respawn**: <kbd>R</kbd> (resets to central plaza spawn)
- **Interact**: <kbd>E</kbd> (opens portfolio info panel when near a building entrance)
- **Fast Travel**: <kbd>1</kbd> - <kbd>7</kbd> or click the top-right nav bar items
- **Close Dialog**: <kbd>Escape</kbd> or click the <kbd>×</kbd> button / backdrop
- **Toggle Camera Mode**: <kbd>C</kbd> (switches between "Follow" chase camera and "Free" manual orbit camera)
- **Cycle Graphics Quality**: <kbd>F2</kbd> (cycles Low -> Medium -> High with real-time toast)
- **Stats Overlay**: <kbd>F3</kbd> (toggle FPS, draw calls, triangles, active quality tier)
- **Collider Debug**: <kbd>F4</kbd> (toggle wireframe collider outlines in dev mode)
- **Orbit Camera**: <kbd>Left Click + Drag</kbd> or <kbd>Right Click + Drag</kbd>
- **Zoom Camera**: <kbd>Mouse Wheel</kbd>

## How to Edit Portfolio Content
Open `src/data/portfolio.js`. This is the ONLY file you need to edit:
- **Profile header**: Edit `profile` object (name, title, tagline, avatar, location).
- **Progression & XP Config**: Edit `profile.level` (`xpPerArea` e.g. 150, `xpPerLevel` e.g. 300).
- **Quick Access Links**: Edit `profile.quickLinks` (`label`, `url`, `icon`).
- **Fast Travel Nav Items**: Edit `navItems` array (`label`, `icon`, `target`).
- **About Me**: Edit `sections['developer-house']` (`bio` paragraphs, `facts`).
- **Skills**: Add or modify skill groups and items in `sections['skills']` (name and `level` 0-100).
- **Projects**: Add project entries in `sections['projects']` (title, description, tech tags, URLs).
- **Experience**: Add roles in `sections['experience']` (title, organization, period, description).
- **Education**: Add degrees or certificates in `sections['education']`.
- **Contact & Links**: Add social links or email channels in `sections['contact']`.

## Planned Folder Structure
```text
Portofolio3D/
├── public/
│   ├── audio/         # Sound effects and ambient audio
│   ├── models/        # 3D low-poly models (GLTF/GLB)
│   └── textures/      # Textures and environment maps
├── src/
│   ├── core/          # Engine, lifecycle, renderer, loop
│   ├── data/          # Portfolio projects and content data (portfolio.js)
│   ├── input/         # InputManager, keyboard/pointer state
│   ├── interaction/   # Proximity detection and interaction manager
│   ├── player/        # PlayerModel, PlayerController, CameraRig
│   ├── styles/        # CSS stylesheets (main.css, ui.css)
│   ├── ui/            # InteractionPrompt, InfoPanel modal
│   ├── utils/         # ColliderDebug, helper math utilities
│   ├── world/         # Island terrain, buildings, PoiMarkers, CollisionSystem, worldLayout
│   └── main.js        # Application entry point
├── index.html
├── package.json
└── vite.config.js
```
