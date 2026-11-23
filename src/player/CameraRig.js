import * as THREE from 'three';

/**
 * Tunable camera rig configuration parameters.
 * Modify these constants to tune the feel of camera tracking, orbit, and zoom.
 */
export const CAMERA_CONFIG = {
  DEFAULT_DISTANCE: 7.0, // Starting camera distance from character in meters
  MIN_DISTANCE: 4.0, // Minimum zoom distance in meters
  MAX_DISTANCE: 12.0, // Maximum zoom distance in meters
  DEFAULT_PITCH: 0.35, // Initial pitch angle above horizontal (~20 deg in radians)
  MIN_PITCH: -0.087, // Lowest pitch limit (~ -5 deg in radians, above ground horizon)
  MAX_PITCH: 1.22, // Highest pitch limit (~ 70 deg in radians, top-down view)
  MOUSE_SENSITIVITY: 0.003, // Orbit angular sensitivity per mouse drag pixel in rad/px
  ZOOM_SPEED: 0.003, // Distance adjustment per mouse wheel notch
  SMOOTH_TARGET: 14.0, // Frame-rate independent exponential damping for look-at target
  SMOOTH_ROTATION: 18.0, // Damping rate for yaw and pitch orbit interpolation
  SMOOTH_DISTANCE: 12.0, // Damping rate for smooth distance/zoom transitions
  SMOOTH_CAMERA: 20.0, // Damping rate for final camera position smoothing
  LOOK_AT_HEIGHT: 1.4, // Vertical focal offset above character feet in meters
  MIN_GROUND_CLEARANCE: 0.5, // Minimum clearance above ground/water surface in meters
  OBSTRUCTION_MARGIN: 0.35, // Pull-in safety buffer before wall hit point in meters
};

// Reusable scratch vectors to eliminate per-frame garbage collection allocations
const _desiredLookAt = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

/**
 * Third-person spherical camera rig tracking the player.
 * Features smoothed target following, pointer-drag orbit, scroll zoom,
 * ground/water safety limits, and building obstruction prevention.
 */
export class CameraRig {
  /**
   * @param {THREE.Camera|object} cameraOrOptions
   * @param {HTMLElement} [domElement]
   * @param {object} [player] - Object providing getPosition()
   * @param {object} [world] - Object providing getGroundHeight() and getIslandRadius()
   * @param {Array<THREE.Mesh>} [occluders] - Optional mesh list for occlusion raycasting
   */
  constructor(cameraOrOptions, domElement, player, world, occluders) {
    if (cameraOrOptions && cameraOrOptions.camera) {
      this.camera = cameraOrOptions.camera;
      this.domElement = cameraOrOptions.domElement;
      this.player = cameraOrOptions.player;
      this.world = cameraOrOptions.world;
      this.occluders = cameraOrOptions.occluders || [];
    } else {
      this.camera = cameraOrOptions;
      this.domElement = domElement;
      this.player = player;
      this.world = world;
      this.occluders = occluders || [];
    }

    if (!this.domElement) {
      throw new Error('CameraRig requires a valid DOM element.');
    }

    this.enabled = true;

    // Spherical orbit state
    this._targetYaw = 0; // 0 radians = camera sits behind character (+Z looking North)
    this._currentYaw = 0;
    this._targetPitch = CAMERA_CONFIG.DEFAULT_PITCH;
    this._currentPitch = CAMERA_CONFIG.DEFAULT_PITCH;
    this._targetDistance = CAMERA_CONFIG.DEFAULT_DISTANCE;
    this._currentDistance = CAMERA_CONFIG.DEFAULT_DISTANCE;

    // Smoothed target look-at vector
    this._currentLookAt = new THREE.Vector3();

    // Pointer tracking
    this._isDragging = false;
    this._activePointerId = null;
    this._lastPointerX = 0;
    this._lastPointerY = 0;

    // Raycaster for building obstruction tests
    this._raycaster = new THREE.Raycaster();

    // Auto-discover building occluders from world group if not explicitly provided
    if (this.occluders.length === 0 && this.world && this.world.group) {
      this.world.group.traverse((obj) => {
        if (
          obj.isMesh &&
          obj.parent &&
          obj.parent.name &&
          obj.parent.name.startsWith('building_')
        ) {
          this.occluders.push(obj);
        }
      });
    }

    this._initInitialPosition();
    this._bindEvents();
  }

  _initInitialPosition() {
    if (!this.player) return;
    const initialPos = this.player.getPosition();
    if (!initialPos) return;

    this._currentLookAt.set(
      initialPos.x,
      initialPos.y + CAMERA_CONFIG.LOOK_AT_HEIGHT,
      initialPos.z
    );

    const rHoriz = this._currentDistance * Math.cos(this._currentPitch);
    const offsetY = this._currentDistance * Math.sin(this._currentPitch);

    this.camera.position.set(
      this._currentLookAt.x + rHoriz * Math.sin(this._currentYaw),
      this._currentLookAt.y + offsetY,
      this._currentLookAt.z + rHoriz * Math.cos(this._currentYaw)
    );
    this.camera.lookAt(this._currentLookAt);
  }

  _bindEvents() {
    this.domElement.style.cursor = 'grab';

    this._onPointerDown = (event) => {
      if (!this.enabled) return;
      // Allow drag on left (0) or right (2) mouse button
      if (event.button === 0 || event.button === 2) {
        this._isDragging = true;
        this._activePointerId = event.pointerId;
        this._lastPointerX = event.clientX;
        this._lastPointerY = event.clientY;
        try {
          this.domElement.setPointerCapture(event.pointerId);
        } catch {
          // Fallback if pointer capture is not supported
        }
        this.domElement.style.cursor = 'grabbing';
      }
    };

    this._onPointerMove = (event) => {
      if (!this._isDragging || event.pointerId !== this._activePointerId) return;

      const dx = event.clientX - this._lastPointerX;
      const dy = event.clientY - this._lastPointerY;

      // Invert horizontal drag so dragging right rotates view clockwise
      this._targetYaw -= dx * CAMERA_CONFIG.MOUSE_SENSITIVITY;
      this._targetPitch += dy * CAMERA_CONFIG.MOUSE_SENSITIVITY;

      // Clamp vertical elevation angle
      this._targetPitch = Math.max(
        CAMERA_CONFIG.MIN_PITCH,
        Math.min(CAMERA_CONFIG.MAX_PITCH, this._targetPitch)
      );

      this._lastPointerX = event.clientX;
      this._lastPointerY = event.clientY;
    };

    this._onPointerUp = (event) => {
      if (event.pointerId === this._activePointerId) {
        this._stopDragging();
      }
    };

    this._onPointerCancel = (event) => {
      if (event.pointerId === this._activePointerId) {
        this._stopDragging();
      }
    };

    this._onWheel = (event) => {
      event.preventDefault(); // Prevent page scroll
      if (!this.enabled) return;

      this._targetDistance += event.deltaY * CAMERA_CONFIG.ZOOM_SPEED;
      this._targetDistance = Math.max(
        CAMERA_CONFIG.MIN_DISTANCE,
        Math.min(CAMERA_CONFIG.MAX_DISTANCE, this._targetDistance)
      );
    };

    this._onContextMenu = (event) => {
      event.preventDefault(); // Suppress context menu on right-click drag
    };

    this._onBlur = () => {
      this._stopDragging();
    };

    this._onVisibilityChange = () => {
      if (document.hidden) {
        this._stopDragging();
      }
    };

    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerup', this._onPointerUp);
    this.domElement.addEventListener('pointercancel', this._onPointerCancel);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this._onContextMenu);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  _stopDragging() {
    if (this._isDragging && this._activePointerId !== null) {
      try {
        if (this.domElement.hasPointerCapture(this._activePointerId)) {
          this.domElement.releasePointerCapture(this._activePointerId);
        }
      } catch {
        // Pointer capture may have already been released
      }
    }
    this._isDragging = false;
    this._activePointerId = null;
    this.domElement.style.cursor = 'grab';
  }

  /**
   * Returns the horizontal heading angle in radians that the camera looks toward.
   * Used by PlayerController for camera-relative movement.
   * @returns {number}
   */
  getYaw() {
    const dx = this._currentLookAt.x - this.camera.position.x;
    const dz = this._currentLookAt.z - this.camera.position.z;
    return Math.atan2(dx, dz);
  }

  /**
   * Enables or blocks camera rotation and zoom input.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this._stopDragging();
    }
  }

  /**
   * Main camera update routine. Should be called after player controller update.
   * @param {number} delta - Frame delta in seconds
   */
  update(delta) {
    const dt = Math.min(delta, 0.05);

    const playerPos = this.player ? this.player.getPosition() : null;
    if (!playerPos) return;

    // 1. Follow look-at target smoothly (frame-rate independent exponential damping)
    _desiredLookAt.set(
      playerPos.x,
      playerPos.y + CAMERA_CONFIG.LOOK_AT_HEIGHT,
      playerPos.z
    );
    const targetAlpha = 1 - Math.exp(-CAMERA_CONFIG.SMOOTH_TARGET * dt);
    this._currentLookAt.lerp(_desiredLookAt, targetAlpha);

    // 2. Smooth spherical angles and distance
    this._currentYaw = THREE.MathUtils.damp(
      this._currentYaw,
      this._targetYaw,
      CAMERA_CONFIG.SMOOTH_ROTATION,
      dt
    );
    this._currentPitch = THREE.MathUtils.damp(
      this._currentPitch,
      this._targetPitch,
      CAMERA_CONFIG.SMOOTH_ROTATION,
      dt
    );
    this._currentDistance = THREE.MathUtils.damp(
      this._currentDistance,
      this._targetDistance,
      CAMERA_CONFIG.SMOOTH_DISTANCE,
      dt
    );

    // 3. Compute ideal camera position in spherical coordinates relative to smoothed look-at
    const rHoriz = this._currentDistance * Math.cos(this._currentPitch);
    const offsetY = this._currentDistance * Math.sin(this._currentPitch);

    _desiredCamPos.set(
      this._currentLookAt.x + rHoriz * Math.sin(this._currentYaw),
      this._currentLookAt.y + offsetY,
      this._currentLookAt.z + rHoriz * Math.cos(this._currentYaw)
    );

    // 4. Building obstruction test: cast ray from target to desired camera position
    if (this.occluders.length > 0) {
      _rayDir.subVectors(_desiredCamPos, this._currentLookAt);
      const fullDist = _rayDir.length();

      if (fullDist > 0.2) {
        _rayDir.normalize();
        this._raycaster.set(this._currentLookAt, _rayDir);
        this._raycaster.near = 0.2;
        this._raycaster.far = fullDist;

        const hits = this._raycaster.intersectObjects(this.occluders, false);
        if (hits.length > 0) {
          const hitDist = hits[0].distance;
          const safeDist = Math.max(
            CAMERA_CONFIG.MIN_DISTANCE * 0.6,
            hitDist - CAMERA_CONFIG.OBSTRUCTION_MARGIN
          );

          if (safeDist < this._currentDistance) {
            const rSafe = safeDist * Math.cos(this._currentPitch);
            const ySafe = safeDist * Math.sin(this._currentPitch);
            _desiredCamPos.set(
              this._currentLookAt.x + rSafe * Math.sin(this._currentYaw),
              this._currentLookAt.y + ySafe,
              this._currentLookAt.z + rSafe * Math.cos(this._currentYaw)
            );
          }
        }
      }
    }

    // 5. Ground and water safety clamp
    if (this.world) {
      const groundY = this.world.getGroundHeight(
        _desiredCamPos.x,
        _desiredCamPos.z
      );
      const minY = Math.max(groundY, -2.1) + CAMERA_CONFIG.MIN_GROUND_CLEARANCE;
      if (_desiredCamPos.y < minY) {
        _desiredCamPos.y = minY;
      }

      // Restrain camera within island radius + clearance
      const maxR = this.world.getIslandRadius() + 15;
      const camR = Math.hypot(_desiredCamPos.x, _desiredCamPos.z);
      if (camR > maxR && maxR > 0) {
        const invR = 1 / camR;
        _desiredCamPos.x = _desiredCamPos.x * invR * maxR;
        _desiredCamPos.z = _desiredCamPos.z * invR * maxR;
      }
    }

    // 6. Smoothly position camera and aim at look-at target
    const camAlpha = 1 - Math.exp(-CAMERA_CONFIG.SMOOTH_CAMERA * dt);
    this.camera.position.lerp(_desiredCamPos, camAlpha);
    this.camera.lookAt(this._currentLookAt);
  }

  /**
   * Releases all listeners and pointer captures.
   */
  dispose() {
    this._stopDragging();

    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('pointercancel', this._onPointerCancel);
    this.domElement.removeEventListener('wheel', this._onWheel);
    this.domElement.removeEventListener('contextmenu', this._onContextMenu);

    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }
}

export default CameraRig;
