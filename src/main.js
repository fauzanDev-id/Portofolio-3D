import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { World } from './world/World.js';
import { worldLayout } from './world/worldLayout.js';
import { DebugOrbit } from './utils/DebugOrbit.js';
import { InputManager } from './input/InputManager.js';
import { PlayerModel } from './player/PlayerModel.js';
import { PlayerController } from './player/PlayerController.js';

/**
 * Initializes the 3D application, creates the island world, player, and controls.
 */
function init() {
  const engine = new Engine('#canvas-container');

  // Initial camera placement positioned ~8-10m away and slightly above the character
  engine.camera.position.set(0, 5, 11);
  engine.camera.lookAt(0, 1.2, 2);

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

  const playerController = new PlayerController(
    playerModel,
    inputManager,
    world,
    engine.camera
  );

  const spawn = world.getSpawnPoint();
  playerController.setPosition(
    spawn.x,
    world.getGroundHeight(spawn.x, spawn.z),
    spawn.z
  );

  // Register character kinematic update in engine loop
  engine.addUpdatable((delta) => {
    playerController.update(delta);
  });

  // Dev-only orbit controls smoothly tracking the character
  // (TEMPORARY: replaced by third-person camera rig in Phase 4)
  new DebugOrbit(engine, playerController);

  // Start animation loop
  engine.start();
}

// Bootstrap application once DOM content is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
