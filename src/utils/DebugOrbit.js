/**
 * TEMPORARY - removed in Phase 4 when the third-person camera replaces it.
 *
 * Wraps Three.js OrbitControls for scene inspection during early development.
 * Enabled only in development environments (import.meta.env.DEV).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Reusable scratch vector for camera target interpolation
const _targetPos = new THREE.Vector3();

export class DebugOrbit {
  /**
   * @param {import('../core/Engine.js').Engine} engine
   * @param {object|Function} [targetProvider] - Entity or getter returning player position Vector3
   */
  constructor(engine, targetProvider = null) {
    this.engine = engine;
    this.targetProvider = targetProvider;
    this.controls = null;
    this._updateHandler = null;

    if (import.meta.env.DEV) {
      this._initControls();
    }
  }

  _initControls() {
    this.controls = new OrbitControls(
      this.engine.camera,
      this.engine.renderer.domElement
    );

    // Initial focus on spawn area
    this.controls.target.set(0, 1.2, 2);

    // Smooth inertia
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Zoom boundaries
    this.controls.minDistance = 3;
    this.controls.maxDistance = 60;

    // Limit polar angle so camera eye remains strictly above the water level (water is at y = -2.1)
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;

    // Register per-frame update with the engine loop
    this._updateHandler = () => {
      if (this.targetProvider) {
        const pos =
          typeof this.targetProvider === 'function'
            ? this.targetProvider()
            : this.targetProvider.getPosition
              ? this.targetProvider.getPosition()
              : this.targetProvider;

        if (pos) {
          // Smoothly track character torso height
          _targetPos.set(pos.x, pos.y + 1.1, pos.z);
          this.controls.target.lerp(_targetPos, 0.1);
        }
      }
      this.controls.update();
    };
    this.engine.addUpdatable(this._updateHandler);
  }

  setTargetProvider(provider) {
    this.targetProvider = provider;
  }

  dispose() {
    if (this.controls) {
      if (this._updateHandler) {
        this.engine.removeUpdatable(this._updateHandler);
      }
      this.controls.dispose();
      this.controls = null;
    }
  }
}

export default DebugOrbit;
