import * as THREE from 'three';
import { Engine } from './core/Engine.js';

/**
 * Initializes the 3D scene and binds interface overlays.
 */
function init() {
  const engine = new Engine('#canvas-container');

  // Camera placement
  engine.camera.position.set(0, 5, 9);
  engine.camera.lookAt(0, 1.5, 0);

  // Sky-blue background and subtle depth fog
  const skyColor = new THREE.Color(0x8ecae6);
  engine.scene.background = skyColor;
  engine.scene.fog = new THREE.Fog(skyColor, 18, 55);

  // Soft ambient fill light
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.85);
  hemiLight.position.set(0, 20, 0);
  engine.scene.add(hemiLight);

  // Key directional light with tight shadow frustum
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight.position.set(10, 16, 8);
  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;

  const shadowFrustumSize = 10;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 35;
  dirLight.shadow.camera.left = -shadowFrustumSize;
  dirLight.shadow.camera.right = shadowFrustumSize;
  dirLight.shadow.camera.top = shadowFrustumSize;
  dirLight.shadow.camera.bottom = -shadowFrustumSize;
  dirLight.shadow.bias = -0.0005;

  engine.scene.add(dirLight);

  // Ground plane receiving shadows
  const groundGeo = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x588157 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  engine.scene.add(ground);

  // Rotating colorful cube casting shadows
  const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
  const cubeMat = new THREE.MeshLambertMaterial({ color: 0xf77f00 });
  const cube = new THREE.Mesh(cubeGeo, cubeMat);
  cube.position.set(0, 1.8, 0);
  cube.castShadow = true;
  engine.scene.add(cube);

  // Register cube rotation update hook
  engine.addUpdatable((delta) => {
    cube.rotation.x += 0.5 * delta;
    cube.rotation.y += 0.8 * delta;
  });

  // Setup DOM FPS stats overlay toggled with F3
  setupFpsOverlay(engine);

  // Start animation loop
  engine.start();
}

/**
 * Sets up a lightweight DOM FPS counter toggled with the F3 key.
 * @param {Engine} engine
 */
function setupFpsOverlay(engine) {
  const fpsElement = document.getElementById('fps-counter');
  if (!fpsElement) return;

  // Toggle visibility with F3 key without opening browser find dialog
  window.addEventListener('keydown', (event) => {
    if (event.code === 'F3') {
      event.preventDefault();
      fpsElement.classList.toggle('hidden');
    }
  });

  let frameCount = 0;
  let lastSampleTime = performance.now();

  engine.addUpdatable(() => {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastSampleTime;

    if (elapsed >= 500) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      fpsElement.textContent = `FPS: ${fps}`;
      frameCount = 0;
      lastSampleTime = now;
    }
  });
}

// Bootstrap application once DOM content is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
