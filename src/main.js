import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Quality } from './core/Quality.js';
import { PostProcessing } from './core/PostProcessing.js';
import { World } from './world/World.js';
import { worldLayout } from './world/worldLayout.js';
import { Atmosphere } from './world/Atmosphere.js';
import { Sky } from './world/Sky.js';
import { Fireflies } from './world/Fireflies.js';
import { FloatingIslands } from './world/FloatingIslands.js';
import { InputManager } from './input/InputManager.js';
import { PlayerModel } from './player/PlayerModel.js';
import { AnimatedPlayerModel } from './player/AnimatedPlayerModel.js';
import { ANIMATION_CONFIG } from './player/animationConfig.js';
import { assetLoader } from './core/AssetLoader.js';
import { PlayerController } from './player/PlayerController.js';
import { CameraRig } from './player/CameraRig.js';
import { CollisionSystem } from './world/CollisionSystem.js';
import { ColliderDebug } from './utils/ColliderDebug.js';
import {
  profile,
  sections,
  navItems,
  validatePortfolio,
} from './data/portfolio.js';
import { InteractionPrompt } from './ui/InteractionPrompt.js';
import { InfoPanel } from './ui/InfoPanel.js';
import { InteractionSystem } from './interaction/InteractionSystem.js';
import { PoiMarkers } from './world/PoiMarkers.js';
import { Progress } from './systems/Progress.js';
import { Hud } from './ui/Hud.js';

/**
 * Initializes the 3D application, creates the island world, player, collision,
 * interaction triggers, UI overlays, and third-person camera.
 */
function init() {
  // 1. Graphics Quality manager (determines tier from URL or localStorage, default: 'medium')
  const quality = new Quality();

  // 2. Core 3D engine
  const engine = new Engine('#canvas-container');
  engine.setQuality(quality);

  // 3. Stylized night atmosphere: fog, tone mapping, moonlight, hemi fill, plaza accent
  const atmosphere = new Atmosphere(
    engine.scene,
    engine.renderer,
    quality.getConfig()
  );

  // 4. Stylized fantasy sky dome with gradient, twinkling stars, and moon billboard
  const sky = new Sky(engine.scene, quality.getConfig());

  // 5. Ambient island fireflies particle field
  const fireflies = new Fireflies(engine.scene, quality.getConfig());

  // 6. Distant floating rock islets
  const floatingIslands = new FloatingIslands(
    engine.scene,
    worldLayout.floatingIslands,
    quality.getConfig()
  );

  // 7. Post-processing pipeline (Selective bloom + ACESFilmic tone mapping OutputPass)
  const postProcessing = new PostProcessing(
    engine.renderer,
    engine.scene,
    engine.camera,
    quality.getConfig()
  );
  engine.setPostProcessing(postProcessing);

  // Wire quality tier transitions across all environmental modules
  quality.onChange((config) => {
    atmosphere.applyQuality(config);
    sky.applyQuality(config);
    fireflies.applyQuality(config);
    floatingIslands.applyQuality(config);
  });

  // Build the greybox island world from data layout
  const world = new World(engine.scene, worldLayout);
  const pois = world.getPOIs();

  // Validate portfolio data mapping against active world POIs (dev only)
  validatePortfolio(pois);

  // Spatial collision system managing 2D building OBBs and tree circles
  const collisionSystem = new CollisionSystem(world.getColliderData());

  // Input manager tracking keyboard controls
  const inputManager = new InputManager();

  // Character model and kinematic controller
  const playerModel = new PlayerModel();
  engine.scene.add(playerModel.group);

  let cameraRig = null;

  const playerController = new PlayerController(
    playerModel,
    inputManager,
    world,
    () => (cameraRig ? cameraRig.getYaw() : 0),
    collisionSystem
  );

  const spawn = world.getSpawnPoint();
  playerController.setPosition(
    spawn.x,
    world.getGroundHeight(spawn.x, spawn.z),
    spawn.z
  );

  // Asynchronously load real animated character model; fall back cleanly to capsule on failure
  assetLoader
    .loadGLTF('/models/player.glb')
    .then((gltf) => {
      const animatedModel = new AnimatedPlayerModel(gltf, ANIMATION_CONFIG);

      // Seamlessly sync position, rotation, and current kinematic state
      animatedModel.group.position.copy(playerController.position);
      animatedModel.group.rotation.y = playerController.getYaw();
      animatedModel.setState(
        playerModel.getState ? playerModel.getState() : 'idle'
      );

      // Replace visual node in 3D scene
      engine.scene.remove(playerModel.group);
      engine.scene.add(animatedModel.group);

      // Hot-swap model reference in controller and dispose placeholder
      playerController.model = animatedModel;
      playerModel.dispose();
    })
    .catch((err) => {
      // Keep capsule active and print one informative notice in development
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.info(`[Player] Using fallback capsule model: ${err.message}`);
      }
    });

  // Third-person spherical camera rig tracking the player
  cameraRig = new CameraRig({
    camera: engine.camera,
    domElement: engine.renderer.domElement,
    player: playerController,
    world: world,
  });

  // Glowing ground rings at each building entrance
  const poiMarkers = new PoiMarkers(engine.scene, pois);

  // DOM UI overlays: prompt and modal info dialog
  const uiRoot = document.getElementById('ui-root') || document.body;
  const interactionPrompt = new InteractionPrompt(uiRoot);
  const infoPanel = new InfoPanel(uiRoot);

  // Proximity interaction manager
  const interactionSystem = new InteractionSystem({
    pois,
    player: playerController,
    cameraRig,
    inputManager,
    infoPanel,
    interactionPrompt,
    sections,
  });

  // Progression & XP system (tracks discovery, calculates level/xp, persists in localStorage)
  const progress = new Progress({
    config: profile.level,
    interactionSystem,
  });

  // Game HUD overlay (profile/XP card, fast-travel nav, compass, quick access, toasts)
  const hud = new Hud({
    parent: uiRoot,
    profile,
    navItems,
    pois,
    spawnPoint: spawn,
    player: playerController,
    cameraRig,
    inputManager,
    interactionSystem,
    progress,
  });

  // Dev-only visual collider debug overlay (toggled with F4 key)
  const colliderDebug = new ColliderDebug(
    engine.scene,
    collisionSystem,
    playerController
  );

  // Camera mode toast notification
  let toastElement = null;
  let toastTimeout = null;

  function showCameraToast(mode) {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }

    if (!toastElement) {
      toastElement = document.createElement('div');
      toastElement.className = 'camera-toast';
      uiRoot.appendChild(toastElement);
    }

    toastElement.classList.remove('fade-out');
    toastElement.textContent = 'Camera: ';
    const span = document.createElement('span');
    span.className = 'toast-accent';
    span.textContent = mode === 'follow' ? 'Follow' : 'Free';
    toastElement.appendChild(span);

    toastTimeout = setTimeout(() => {
      if (toastElement) {
        toastElement.classList.add('fade-out');
        toastTimeout = setTimeout(() => {
          if (toastElement && toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
            toastElement = null;
          }
        }, 300);
      }
    }, 1500);
  }

  // Register game loop updates in strict sequence:
  // 1. Camera mode toggle (C key)
  // 2. Player kinematics & collision
  // 3. Camera rig tracking
  // 4. Proximity interaction check
  // 5. Ground marker pulse animation
  // 6. World ocean shimmer and dynamic updates
  // 7. Sky dome positioning & star scintillation
  // 8. Fireflies GPU animation
  // 9. Floating islands bobbing & yaw drift
  // 10. HUD updates (compass orientation & blips)
  // 11. Debug wireframe sync
  engine.addUpdatable((delta) => {
    // Camera mode toggle: only allowed when portfolio modal is closed
    if (
      !interactionSystem.isPanelOpen() &&
      inputManager.isModeToggleJustPressed()
    ) {
      const newMode = cameraRig.toggleMode();
      showCameraToast(newMode);
    }

    playerController.update(delta);
    cameraRig.update(delta);
    interactionSystem.update(delta);
    poiMarkers.update(delta, interactionSystem.getNearest());
    world.update(delta);
    sky.update(delta, engine.camera.position);
    fireflies.update(delta);
    floatingIslands.update(delta);
    hud.update();
    colliderDebug.update();
  });

  // Start animation loop
  engine.start();
}

// Bootstrap application once DOM content is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
