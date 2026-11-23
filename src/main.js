import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { World } from './world/World.js';
import { worldLayout } from './world/worldLayout.js';
import { InputManager } from './input/InputManager.js';
import { PlayerModel } from './player/PlayerModel.js';
import { PlayerController } from './player/PlayerController.js';
import { CameraRig } from './player/CameraRig.js';
import { CollisionSystem } from './world/CollisionSystem.js';
import { ColliderDebug } from './utils/ColliderDebug.js';
import { sections, validatePortfolio } from './data/portfolio.js';
import { InteractionPrompt } from './ui/InteractionPrompt.js';
import { InfoPanel } from './ui/InfoPanel.js';
import { InteractionSystem } from './interaction/InteractionSystem.js';
import { PoiMarkers } from './world/PoiMarkers.js';

/**
 * Initializes the 3D application, creates the island world, player, collision,
 * interaction triggers, UI overlays, and third-person camera.
 */
function init() {
  const engine = new Engine('#canvas-container');

  // Stylized atmosphere: sky-blue background and matching horizon fog
  const skyColor = new THREE.Color(0x8ecae6);
  engine.scene.background = skyColor;
  engine.scene.fog = new THREE.Fog(skyColor, 50, 145);

  // Soft ambient fill light
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445544, 0.75);
  hemiLight.position.set(0, 50, 0);
  engine.scene.add(hemiLight);

  // Key directional sun light with shadow frustum spanning the entire island (~52m)
  const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.4);
  sunLight.position.set(40, 60, 30);
  sunLight.castShadow = true;

  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;

  const shadowDist = 52;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 140;
  sunLight.shadow.camera.left = -shadowDist;
  sunLight.shadow.camera.right = shadowDist;
  sunLight.shadow.camera.top = shadowDist;
  sunLight.shadow.camera.bottom = -shadowDist;
  sunLight.shadow.bias = -0.0003;
  sunLight.shadow.normalBias = 0.05; // Prevents shadow acne on low-poly geometry

  engine.scene.add(sunLight);

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
  // 6. Debug wireframe sync
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
