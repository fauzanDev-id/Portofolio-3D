import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { World } from './world/World.js';
import { worldLayout } from './world/worldLayout.js';
import { InputManager } from './input/InputManager.js';
import { PlayerModel } from './player/PlayerModel.js';
import { PlayerController } from './player/PlayerController.js';
import { CameraRig } from './player/CameraRig.js';

/**
 * Initializes the 3D application, creates the island world, player, and third-person camera.
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

  // Input manager tracking keyboard controls
  const inputManager = new InputManager();

  // Character model and kinematic controller
  const playerModel = new PlayerModel();
  engine.scene.add(playerModel.group);

  // Create third-person camera rig before player controller so yaw can be linked
  let cameraRig = null;

  const playerController = new PlayerController(
    playerModel,
    inputManager,
    world,
    () => (cameraRig ? cameraRig.getYaw() : 0)
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

  // Register game loop updates in strict sequence: player physics first, then camera rig
  engine.addUpdatable((delta) => {
    playerController.update(delta);
    cameraRig.update(delta);
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
