import * as THREE from 'three';

/**
 * Tunable physical and navigation parameters.
 * Modify these constants to adjust player movement feel.
 */
export const PLAYER_CONFIG = {
  WALK_SPEED: 3.5, // Walk speed in m/s
  RUN_SPEED: 7.0, // Run speed (Shift held) in m/s
  ACCELERATION: 22.0, // Horizontal acceleration rate in m/s^2
  DECELERATION: 26.0, // Horizontal braking rate in m/s^2
  AIR_CONTROL: 0.35, // Responsiveness multiplier while airborne
  JUMP_HEIGHT: 1.1, // Peak jump height in meters
  GRAVITY: -25.0, // Downward gravitational acceleration in m/s^2
  TURN_SPEED: 12.0, // Shortest-arc yaw rotation speed in rad/s
  MAX_DELTA: 0.05, // Delta clamp limit in seconds to prevent teleportation
  ISLAND_MARGIN: 1.5, // Edge clearance from island radius
};

// Reusable scratch vectors to avoid per-frame garbage collection allocations
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Controls character kinematics, camera-relative navigation, jumping,
 * and island boundary constraints.
 */
export class PlayerController {
  /**
   * @param {import('./PlayerModel.js').PlayerModel} model
   * @param {import('../input/InputManager.js').InputManager} input
   * @param {import('../world/World.js').World} world
   * @param {THREE.Camera|Function} cameraOrYawGetter - Camera instance or function returning yaw
   */
  constructor(model, input, world, cameraOrYawGetter) {
    this.model = model;
    this.input = input;
    this.world = world;
    this.cameraOrYawGetter = cameraOrYawGetter;

    this.enabled = true;

    // Kinematic state
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.isGrounded = true;

    // Initial jump impulse computed from target jump height and gravity
    this._jumpVelocity = Math.sqrt(
      2 * Math.abs(PLAYER_CONFIG.GRAVITY) * PLAYER_CONFIG.JUMP_HEIGHT
    );
  }

  /**
   * Sets player position in world space.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.model.group.position.copy(this.position);
  }

  /**
   * Returns current world position vector reference.
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.position;
  }

  /**
   * Returns current facing yaw angle in radians.
   * @returns {number}
   */
  getYaw() {
    return this.yaw;
  }

  /**
   * Enables or disables character control.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.velocity.set(0, 0, 0);
    }
  }

  /**
   * Respawns character at the central plaza spawn point.
   */
  respawn() {
    const spawn = this.world.getSpawnPoint();
    const groundY = this.world.getGroundHeight(spawn.x, spawn.z);
    this.position.set(spawn.x, groundY, spawn.z);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.isGrounded = true;
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.yaw;
  }

  /**
   * Main kinematic update loop step.
   * @param {number} delta - Seconds since last frame
   */
  update(delta) {
    // Clamp delta to protect against physics anomalies during lag spikes
    const dt = Math.min(delta, PLAYER_CONFIG.MAX_DELTA);

    // Check respawn request (R key)
    if (this.input.isRespawnJustPressed()) {
      this.respawn();
      return;
    }

    if (!this.enabled) {
      this.model.setState('idle');
      this.model.update(dt);
      return;
    }

    this._updateMovement(dt);
    this._updateJumpAndGravity(dt);
    this._clampToIslandBoundary();
    this._updateRotation(dt);

    // Sync visual model position
    this.model.group.position.copy(this.position);

    // Determine animation state
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!this.isGrounded) {
      this.model.setState('jump');
    } else if (horizontalSpeed > 4.0) {
      this.model.setState('run');
    } else if (horizontalSpeed > 0.2) {
      this.model.setState('walk');
    } else {
      this.model.setState('idle');
    }

    this.model.update(dt);
  }

  /**
   * Computes camera-relative horizontal movement vectors and applies acceleration/braking.
   */
  _updateMovement(dt) {
    const axis = this.input.getMovementAxis();
    const isMoving = axis.x !== 0 || axis.y !== 0;
    const targetSpeed = this.input.isRunHeld()
      ? PLAYER_CONFIG.RUN_SPEED
      : PLAYER_CONFIG.WALK_SPEED;

    if (isMoving) {
      this._computeCameraRelativeDirection(axis.x, axis.y, _moveDir);
      const targetVx = _moveDir.x * targetSpeed;
      const targetVz = _moveDir.z * targetSpeed;

      const accel = this.isGrounded
        ? PLAYER_CONFIG.ACCELERATION
        : PLAYER_CONFIG.ACCELERATION * PLAYER_CONFIG.AIR_CONTROL;

      this.velocity.x = THREE.MathUtils.damp(
        this.velocity.x,
        targetVx,
        accel,
        dt
      );
      this.velocity.z = THREE.MathUtils.damp(
        this.velocity.z,
        targetVz,
        accel,
        dt
      );
    } else {
      const decel = this.isGrounded
        ? PLAYER_CONFIG.DECELERATION
        : PLAYER_CONFIG.DECELERATION * PLAYER_CONFIG.AIR_CONTROL;

      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, decel, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, decel, dt);

      // Snap to zero at low velocities to prevent infinite micro-sliding
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    // Integrate horizontal position
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
  }

  /**
   * Computes camera-relative movement direction projected onto the XZ horizontal plane.
   */
  _computeCameraRelativeDirection(inputX, inputY, outVector) {
    if (typeof this.cameraOrYawGetter === 'function') {
      const yaw = this.cameraOrYawGetter();
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      outVector.set(inputX * cos + inputY * sin, 0, -inputX * sin + inputY * cos);
      outVector.normalize();
      return;
    }

    // Camera object projection
    this.cameraOrYawGetter.getWorldDirection(_camForward);
    _camForward.y = 0;
    _camForward.normalize();

    _camRight.crossVectors(_camForward, _up).normalize();

    outVector
      .copy(_camForward)
      .multiplyScalar(inputY)
      .addScaledVector(_camRight, inputX)
      .normalize();
  }

  /**
   * Applies vertical gravity, jump trigger, and ground surface collision.
   */
  _updateJumpAndGravity(dt) {
    // Jump trigger (only allowed when touching ground)
    if (this.isGrounded && this.input.isJumpJustPressed()) {
      this.velocity.y = this._jumpVelocity;
      this.isGrounded = false;
    }

    // Gravity acceleration
    this.velocity.y += PLAYER_CONFIG.GRAVITY * dt;
    this.position.y += this.velocity.y * dt;

    // Ground elevation constraint
    const groundY = this.world.getGroundHeight(
      this.position.x,
      this.position.z
    );
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  /**
   * Prevents the player from walking into the water by sliding along the island boundary.
   */
  _clampToIslandBoundary() {
    const maxRadius = this.world.getIslandRadius() - PLAYER_CONFIG.ISLAND_MARGIN;
    const currentR = Math.hypot(this.position.x, this.position.z);

    if (currentR > maxRadius && maxRadius > 0) {
      const invR = 1 / currentR;
      const nx = this.position.x * invR;
      const nz = this.position.z * invR;

      this.position.x = nx * maxRadius;
      this.position.z = nz * maxRadius;

      // Project out outward normal velocity so the character slides smoothly
      const vDotN = this.velocity.x * nx + this.velocity.z * nz;
      if (vDotN > 0) {
        this.velocity.x -= vDotN * nx;
        this.velocity.z -= vDotN * nz;
      }
    }
  }

  /**
   * Interpolates character facing yaw along the shortest angular arc toward movement direction.
   */
  _updateRotation(dt) {
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.15) {
      // Model forward is local +Z
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);

      // Shortest angle wrap to [-PI, PI] to prevent 360-degree flip spins
      let diff = targetYaw - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));

      this.yaw += diff * Math.min(1, PLAYER_CONFIG.TURN_SPEED * dt);
      this.model.group.rotation.y = this.yaw;
    }
  }

  /**
   * Cleans up model resources.
   */
  dispose() {
    if (this.model && typeof this.model.dispose === 'function') {
      this.model.dispose();
    }
  }
}

export default PlayerController;
