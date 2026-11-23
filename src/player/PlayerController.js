import * as THREE from 'three';

/**
 * Tunable physical and navigation parameters.
 * Modify these constants to adjust player movement feel.
 */
export const PLAYER_CONFIG = {
  RADIUS: 0.4, // Collision cylinder radius in meters
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
 * obstacle collision resolution, and island boundary constraints.
 */
export class PlayerController {
  /**
   * @param {import('./PlayerModel.js').PlayerModel} model
   * @param {import('../input/InputManager.js').InputManager} input
   * @param {import('../world/World.js').World} world
   * @param {THREE.Camera|Function} cameraOrYawGetter - Camera instance or function returning yaw
   * @param {import('../world/CollisionSystem.js').CollisionSystem} [collisionSystem]
   */
  constructor(model, input, world, cameraOrYawGetter, collisionSystem = null) {
    this.model = model;
    this.input = input;
    this.world = world;
    this.cameraOrYawGetter = cameraOrYawGetter;
    this.collisionSystem = collisionSystem;

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
   * Sets or updates the collision system.
   * @param {import('../world/CollisionSystem.js').CollisionSystem} collisionSystem
   */
  setCollisionSystem(collisionSystem) {
    this.collisionSystem = collisionSystem;
    if (this.collisionSystem) {
      this.collisionSystem.resolveCircle(
        this.position,
        PLAYER_CONFIG.RADIUS,
        this.velocity
      );
      this.model.group.position.copy(this.position);
    }
  }

  /**
   * Sets player position in world space.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    if (this.collisionSystem) {
      this.collisionSystem.resolveCircle(
        this.position,
        PLAYER_CONFIG.RADIUS,
        this.velocity
      );
    }
    this.model.group.position.copy(this.position);
  }

  /**
   * Teleports player to coordinates (x, z) at ground height, resets velocities,
   * sets facing yaw if provided, and resets jump/ground state.
   * @param {number} x
   * @param {number} z
   * @param {number|null} [faceYaw]
   */
  teleportTo(x, z, faceYaw = null) {
    const groundY = this.world ? this.world.getGroundHeight(x, z) : 0;
    this.position.set(x, groundY, z);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;

    if (faceYaw !== null && faceYaw !== undefined) {
      this.yaw = faceYaw;
      this.model.group.rotation.y = faceYaw;
    }

    if (this.collisionSystem) {
      this.collisionSystem.resolveCircle(
        this.position,
        PLAYER_CONFIG.RADIUS,
        this.velocity
      );
    }

    this.model.group.position.copy(this.position);
    this.model.setState('idle');
  }

  /**
   * Returns current world position vector reference.
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.position;
  }

  /**
   * Returns current velocity vector reference.
   * @returns {THREE.Vector3}
   */
  getVelocity() {
    return this.velocity;
  }

  /**
   * Returns current horizontal movement speed in m/s.
   * @returns {number}
   */
  getSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /**
   * Returns true if character is currently moving horizontally.
   * @returns {boolean}
   */
  isMoving() {
    return this.getSpeed() > 0.2;
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

    // Guarantee player never respawns inside an obstacle
    if (this.collisionSystem) {
      this.collisionSystem.resolveCircle(
        this.position,
        PLAYER_CONFIG.RADIUS,
        this.velocity
      );
    }

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

    const prevX = this.position.x;
    const prevZ = this.position.z;

    // 1. Horizontal movement with sub-stepped collision resolution
    this._updateMovement(dt);

    // 2. Vertical jump and gravity
    this._updateJumpAndGravity(dt);

    // 3. Keep within island perimeter
    this._clampToIslandBoundary();

    // 4. Measure actual displacement moved this frame
    const actualDisplacement = Math.hypot(
      this.position.x - prevX,
      this.position.z - prevZ
    );
    const actualSpeed = actualDisplacement / dt;

    // 5. Shortest-arc facing rotation (faces along movement direction)
    this._updateRotation(dt, actualSpeed);

    // Sync visual model position
    this.model.group.position.copy(this.position);

    // Visual state reflects ACTUAL movement: if blocked by a wall, switch to idle
    if (!this.isGrounded) {
      this.model.setState('jump');
    } else if (actualSpeed > 4.0) {
      this.model.setState('run');
    } else if (actualSpeed > 0.2) {
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

    // Collision resolution is strictly horizontal on the XZ plane.
    // Buildings and trees act as infinite vertical obstacles (pillars/walls);
    // jumping does not allow climbing onto building roofs or tree trunks.
    const dispX = this.velocity.x * dt;
    const dispZ = this.velocity.z * dt;
    const dispDist = Math.hypot(dispX, dispZ);

    // Sub-step movement if single-frame displacement exceeds fraction of player radius
    const maxSubstepDist = PLAYER_CONFIG.RADIUS * 0.45;
    const steps = Math.max(1, Math.ceil(dispDist / maxSubstepDist));
    const stepDx = dispX / steps;
    const stepDz = dispZ / steps;

    for (let s = 0; s < steps; s++) {
      this.position.x += stepDx;
      this.position.z += stepDz;

      if (this.collisionSystem) {
        this.collisionSystem.resolveCircle(
          this.position,
          PLAYER_CONFIG.RADIUS,
          this.velocity
        );
      }
    }
  }

  /**
   * Sets or updates the camera or camera yaw getter function.
   * @param {THREE.Camera|Function} cameraOrYawGetter
   */
  setCameraOrYawGetter(cameraOrYawGetter) {
    this.cameraOrYawGetter = cameraOrYawGetter;
  }

  /**
   * Computes camera-relative movement direction projected onto the XZ horizontal plane.
   */
  _computeCameraRelativeDirection(inputX, inputY, outVector) {
    if (typeof this.cameraOrYawGetter === 'function') {
      const yaw = this.cameraOrYawGetter();
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      // Forward heading is (sin(yaw), 0, cos(yaw)); right is (-cos(yaw), 0, sin(yaw))
      _camForward.set(sin, 0, cos);
      _camRight.set(-cos, 0, sin);

      outVector
        .copy(_camForward)
        .multiplyScalar(inputY)
        .addScaledVector(_camRight, inputX)
        .normalize();
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
  _updateRotation(dt, actualSpeed) {
    if (actualSpeed > 0.15) {
      // Model forward is local +Z; face along actual velocity/movement direction
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
