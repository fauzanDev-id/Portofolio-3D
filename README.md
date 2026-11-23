# 3D Interactive Developer Portfolio

An interactive, stylized low-poly 3D developer portfolio website built with Three.js, vanilla JavaScript (ES modules), and Vite. Visitors explore a low-poly island with a third-person character, interact with buildings, and view project showcase panels.

## Current Status: Phase 8 — Animated Character & Asset Pipeline
- **Real Skinned & Animated Character ([src/player/AnimatedPlayerModel.js](file:///d:/PROJECT/Portofolio3D/src/player/AnimatedPlayerModel.js))**:
  - Quaternius Universal Animation Library Standard CC0 humanoid character (`public/models/player.glb`).
  - Seamless asynchronous hot-swap from placeholder capsule to animated character without interrupting gameplay.
  - Skinned mesh cast shadows, normalized 1.7m physical height, and feet aligned to ground level ($y = 0$).
  - AnimationMixer coordinating `Idle_Loop`, `Walk_Loop`, `Sprint_Loop`, and `Jump_Start` with smooth crossfade blending.
  - Foot speed matched to kinematics (walk 3.5 m/s, sprint 7.0 m/s) to eliminate visual sliding.
  - Graceful fallback: placeholder capsule remains active if GLB is missing or fails to load.
- **Asset Loading Architecture ([src/core/AssetLoader.js](file:///d:/PROJECT/Portofolio3D/src/core/AssetLoader.js))**:
  - Promise-cached GLTF loader with optional progress callbacks for future loading screens and clean error handling.
- **Night Fantasy Visual Atmosphere & Quality System**:
  - Midnight navy/purple sky dome, twinkling starfield, billboard moon, and exponential night fog.
  - Selective UnrealBloomPass with ACESFilmic tone mapping and per-tier bloom parameters.
  - Scalable quality tiers (`low`, `medium`, `high`) toggleable with <kbd>F2</kbd> (dev tuning via URL query parameters).
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
