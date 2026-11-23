/**
 * Pure 2D collision system resolving player circle kinematics against
 * rotated box (OBB) buildings and circle obstacles (trees/rocks).
 * Zero per-frame allocations with uniform spatial grid broadphase.
 */

export const COLLISION_CONFIG = {
  GRID_CELL_SIZE: 8.0, // Uniform spatial partitioning grid cell size in meters
  MAX_ITERATIONS: 3, // Iterations per query to cleanly resolve convex corners
  SUBSTEP_DISTANCE: 0.18, // Max displacement per sub-step (~0.45 * player radius)
};

/**
 * Spatial hash collision system.
 */
export class CollisionSystem {
  /**
   * @param {Array<object>} colliderData - Raw collider definitions from World.getColliderData()
   */
  constructor(colliderData = []) {
    this.colliders = [];
    this.grid = new Map();
    this.cellSize = COLLISION_CONFIG.GRID_CELL_SIZE;
    this._queryStamp = 0;
    this._nearbyColliders = [];

    this._initColliders(colliderData);
  }

  _initColliders(colliderData) {
    for (let i = 0; i < colliderData.length; i++) {
      const src = colliderData[i];
      let col = null;

      if (src.type === 'box') {
        const halfW = src.w / 2;
        const halfD = src.d / 2;
        const cos = Math.cos(src.rotationY);
        const sin = Math.sin(src.rotationY);

        // Bounding radius for broadphase AABB
        const boundingRadius = Math.hypot(halfW, halfD);

        col = {
          type: 'box',
          id: src.id,
          x: src.x,
          z: src.z,
          w: src.w,
          d: src.d,
          halfW,
          halfD,
          rotationY: src.rotationY,
          cos,
          sin,
          boundingRadius,
          minX: src.x - boundingRadius,
          maxX: src.x + boundingRadius,
          minZ: src.z - boundingRadius,
          maxZ: src.z + boundingRadius,
          _queryStamp: 0,
        };
      } else if (src.type === 'circle') {
        col = {
          type: 'circle',
          id: src.id,
          x: src.x,
          z: src.z,
          radius: src.radius,
          minX: src.x - src.radius,
          maxX: src.x + src.radius,
          minZ: src.z - src.radius,
          maxZ: src.z + src.radius,
          _queryStamp: 0,
        };
      }

      if (col) {
        this.colliders.push(col);
        this._insertIntoGrid(col);
      }
    }
  }

  _getCellKey(cx, cz) {
    // Unique integer key for cell coordinates in [-1000, 1000]
    return (cx + 1000) * 2000 + (cz + 1000);
  }

  _insertIntoGrid(col) {
    const minCX = Math.floor(col.minX / this.cellSize);
    const maxCX = Math.floor(col.maxX / this.cellSize);
    const minCZ = Math.floor(col.minZ / this.cellSize);
    const maxCZ = Math.floor(col.maxZ / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const key = this._getCellKey(cx, cz);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(col);
      }
    }
  }

  /**
   * Populates this._nearbyColliders with unique colliders intersecting the query AABB.
   */
  _queryNearby(minX, maxX, minZ, maxZ) {
    this._queryStamp++;
    this._nearbyColliders.length = 0;

    const minCX = Math.floor(minX / this.cellSize);
    const maxCX = Math.floor(maxX / this.cellSize);
    const minCZ = Math.floor(minZ / this.cellSize);
    const maxCZ = Math.floor(maxZ / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const key = this._getCellKey(cx, cz);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const col = cell[i];
            if (col._queryStamp !== this._queryStamp) {
              col._queryStamp = this._queryStamp;
              this._nearbyColliders.push(col);
            }
          }
        }
      }
    }
  }

  /**
   * Resolves circle collision against nearby obstacles in place, adjusting position and velocity.
   * @param {{ x: number, y: number, z: number }} position - Mutated in place
   * @param {number} radius - Player collision radius
   * @param {{ x: number, y: number, z: number }} velocity - Mutated in place for wall sliding
   * @returns {boolean} true if any collision occurred
   */
  resolveCircle(position, radius, velocity) {
    this._queryNearby(
      position.x - radius,
      position.x + radius,
      position.z - radius,
      position.z + radius
    );

    if (this._nearbyColliders.length === 0) return false;

    let anyCollided = false;

    // Multi-pass relaxation to resolve convex corners where two colliders intersect
    for (let iter = 0; iter < COLLISION_CONFIG.MAX_ITERATIONS; iter++) {
      let iterCollided = false;

      for (let i = 0; i < this._nearbyColliders.length; i++) {
        const col = this._nearbyColliders[i];

        if (col.type === 'box') {
          if (this._resolveBox(position, radius, velocity, col)) {
            iterCollided = true;
            anyCollided = true;
          }
        } else if (col.type === 'circle') {
          if (this._resolveCircleVsCircle(position, radius, velocity, col)) {
            iterCollided = true;
            anyCollided = true;
          }
        }
      }

      if (!iterCollided) break;
    }

    return anyCollided;
  }

  /**
   * Resolves moving circle against an oriented bounding box (OBB).
   */
  _resolveBox(pos, radius, vel, box) {
    const dx = pos.x - box.x;
    const dz = pos.z - box.z;

    // Transform circle center into box's local coordinate system (rotate by -rotationY)
    const localX = dx * box.cos - dz * box.sin;
    const localZ = dx * box.sin + dz * box.cos;

    // Nearest point on AABB in local coordinates
    const clampedX = Math.max(-box.halfW, Math.min(box.halfW, localX));
    const clampedZ = Math.max(-box.halfD, Math.min(box.halfD, localZ));

    const diffX = localX - clampedX;
    const diffZ = localZ - clampedZ;
    const distSq = diffX * diffX + diffZ * diffZ;

    let normalX = 0;
    let normalZ = 0;
    let penetration = 0;

    if (distSq > 0.000001) {
      // Circle center is outside the box
      if (distSq >= radius * radius) {
        return false; // No penetration
      }
      const dist = Math.sqrt(distSq);
      normalX = diffX / dist;
      normalZ = diffZ / dist;
      penetration = radius - dist;
    } else {
      // Circle center is strictly inside the box: push out through nearest face
      const distToRight = box.halfW - localX;
      const distToLeft = box.halfW + localX;
      const distToFront = box.halfD - localZ;
      const distToBack = box.halfD + localZ;

      const minDist = Math.min(distToRight, distToLeft, distToFront, distToBack);

      if (minDist === distToRight) {
        normalX = 1;
        normalZ = 0;
        penetration = distToRight + radius;
      } else if (minDist === distToLeft) {
        normalX = -1;
        normalZ = 0;
        penetration = distToLeft + radius;
      } else if (minDist === distToFront) {
        normalX = 0;
        normalZ = 1;
        penetration = distToFront + radius;
      } else {
        normalX = 0;
        normalZ = -1;
        penetration = distToBack + radius;
      }
    }

    // Transform outward normal back into world coordinates
    const worldNormalX = normalX * box.cos + normalZ * box.sin;
    const worldNormalZ = -normalX * box.sin + normalZ * box.cos;

    // Push player position out along world normal
    pos.x += worldNormalX * penetration;
    pos.z += worldNormalZ * penetration;

    // Slide: eliminate velocity component directed into the obstacle
    const vDotN = vel.x * worldNormalX + vel.z * worldNormalZ;
    if (vDotN < 0) {
      vel.x -= vDotN * worldNormalX;
      vel.z -= vDotN * worldNormalZ;
    }

    return true;
  }

  /**
   * Resolves moving circle against a static circular obstacle (tree trunk or rock).
   */
  _resolveCircleVsCircle(pos, radius, vel, obs) {
    const dx = pos.x - obs.x;
    const dz = pos.z - obs.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radius + obs.radius;

    if (distSq >= minDist * minDist) {
      return false; // No collision
    }

    let normalX = 1;
    let normalZ = 0;
    let penetration = minDist;

    if (distSq > 0.000001) {
      const dist = Math.sqrt(distSq);
      normalX = dx / dist;
      normalZ = dz / dist;
      penetration = minDist - dist;
    }

    // Push position out
    pos.x += normalX * penetration;
    pos.z += normalZ * penetration;

    // Slide: eliminate inward velocity component
    const vDotN = vel.x * normalX + vel.z * normalZ;
    if (vDotN < 0) {
      vel.x -= vDotN * normalX;
      vel.z -= vDotN * normalZ;
    }

    return true;
  }

  /**
   * Returns list of all colliders for debug visualization.
   * @returns {Array<object>}
   */
  getColliders() {
    return this.colliders;
  }

  /**
   * Cleans up grid references.
   */
  dispose() {
    this.grid.clear();
    this.colliders.length = 0;
    this._nearbyColliders.length = 0;
  }
}

export default CollisionSystem;
