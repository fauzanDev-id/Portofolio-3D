/**
 * TEMPORARY - removed in Phase 4 when the third-person camera replaces it.
 *
 * Wraps Three.js OrbitControls for scene inspection during early development.
 * Enabled only in development environments (import.meta.env.DEV).
 */
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class DebugOrbit {
  /**
   * @param {import('../core/Engine.js').Engine} engine
   */
  constructor(engine) {
    this.engine = engine;
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

    // Focus target at the central plaza
    this.controls.target.set(0, 1.5, 0);

    // Smooth inertia
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Zoom boundaries
    this.controls.minDistance = 6;
    this.controls.maxDistance = 110;

    // Limit polar angle so camera eye remains strictly above the water level (water is at y = -2.1)
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;

    // Register per-frame damping update with the engine loop
    this._updateHandler = () => {
      this.controls.update();
    };
    this.engine.addUpdatable(this._updateHandler);
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
