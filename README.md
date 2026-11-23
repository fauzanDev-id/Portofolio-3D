# 3D Interactive Developer Portfolio

An interactive, stylized low-poly 3D developer portfolio website built with Three.js, vanilla JavaScript (ES modules), and Vite. Visitors explore a low-poly island with a third-person character, interact with buildings, and view project showcase panels.

## Current Status: Phase 6.1 — Game-Like "Follow" Camera Mode
- **Follow Camera Mode (Default)**: Dynamic chase camera that smoothly swings behind the player as they navigate (like modern adventure games), keeping movement intuitive.
- **Backward Walk Protection**: Moving toward the camera (<kbd>S</kbd>) suppresses auto-spin, allowing natural backward walking without disorienting 180° camera flips.
- **Manual Drag Override**: Seamlessly blends manual mouse orbit drag with auto-follow, featuring a 1.5s delay and 0.6s smooth fade-in before resuming follow.
- **Camera Mode Toggle (<kbd>C</kbd>)**: Press <kbd>C</kbd> to toggle between "Follow" and "Free" orbit modes, accompanied by a sleek glassy neon toast notification.
- **Single Source of Truth (`src/data/portfolio.js`)**: All portfolio content (bio, skills, projects, experience, education, links) is defined purely as data. Adding or editing items requires touching only this file.
- **Proximity Interaction System**: Automatically detects when the player approaches any building entrance, smoothly displaying the prompt (<kbd>E</kbd> Interact).
- **Dark Glassy Neon Modal Panels**: Translucent dark navy panels with cyan and purple neon glow accents, tailored for the nighttime fantasy hub aesthetic.
- **Accessible & Secure**: Built strictly with DOM APIs (`textContent`, `createElement`) to eliminate XSS. Features ARIA dialog roles, focus management, Tab trapping, and Escape key dismissal.
- **Glowing Ground Rings**: Neon rings at building entrances that pulse gently and intensify as the character approaches.
- **Controls & Cam Freeze**: Movement and camera rotation are cleanly suspended while viewing panels, restoring smoothly upon closing.
- **Responsive**: Fully responsive down to 360px mobile viewport widths.

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
- **Respawn**: <kbd>R</kbd> (resets to central plaza spawn)
- **Interact**: <kbd>E</kbd> (opens portfolio info panel when near a building entrance)
- **Close Dialog**: <kbd>Escape</kbd> or click the <kbd>×</kbd> button / backdrop
- **Toggle Camera Mode**: <kbd>C</kbd> (switches between "Follow" chase camera and "Free" manual orbit camera)
- **Orbit Camera**: <kbd>Left Click + Drag</kbd> or <kbd>Right Click + Drag</kbd>
- **Zoom Camera**: <kbd>Mouse Wheel</kbd>
- **Stats Overlay**: <kbd>F3</kbd> (toggle FPS, draw calls, triangles)
- **Collider Debug**: <kbd>F4</kbd> (toggle wireframe collider outlines in dev mode)

## How to Edit Portfolio Content
Open `src/data/portfolio.js`. This is the ONLY file you need to edit:
- **Profile header**: Edit `profile` object (name, title, tagline, avatar, location).
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
