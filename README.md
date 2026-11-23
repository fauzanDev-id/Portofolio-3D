# 3D Interactive Developer Portfolio

An interactive, stylized low-poly 3D developer portfolio website built with Three.js, vanilla JavaScript (ES modules), and Vite. Visitors explore a low-poly island with a third-person character, interact with buildings, and view project showcase panels.

## Tech Stack
- **Three.js**: Lightweight 3D rendering and scene graph
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
- **F3**: Toggle FPS overlay display (hidden by default).

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
│   ├── utils/         # Helper math and loader utilities
│   ├── world/         # Island terrain, lighting, buildings, scenery
│   └── main.js        # Application entry point
├── index.html
├── package.json
└── vite.config.js
```
