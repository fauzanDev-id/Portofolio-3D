import * as THREE from 'three';

/**
 * Builds the 3D low-poly island world from declarative layout data.
 * Keeps draw calls minimal through geometry reuse and InstancedMesh.
 */
export class World {
  /**
   * @param {THREE.Scene} scene - Active Three.js scene
   * @param {object} layout - worldLayout configuration object
   */
  constructor(scene, layout) {
    this.scene = scene;
    this.layout = layout;

    // Parent group containing all world objects
    this.group = new THREE.Group();
    this.group.name = 'world_root';
    this.scene.add(this.group);

    // Track generated collider primitives for Phase 5
    this.colliders = [];

    // Track meshes and materials for clean disposal
    this._disposables = [];

    this._buildTerrain();
    this._buildPlaza();
    this._buildPaths();
    this._buildBuildings();
    this._buildTrees();
    this._buildRocks();
  }

  /**
   * Creates the island ground cylinder, sand beach ring, and outer ocean plane.
   */
  _buildTerrain() {
    const { radius, groundColor, sandColor, waterColor } = this.layout.island;

    // Main grassy island plateau (28 radial segments for stylized low-poly look)
    const groundGeo = new THREE.CylinderGeometry(radius - 3, radius, 3, 28);
    const groundMat = new THREE.MeshLambertMaterial({
      color: groundColor,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -1.5;
    ground.receiveShadow = true;
    this.group.add(ground);
    this._disposables.push(groundGeo, groundMat);

    // Lower sand beach rim
    const sandGeo = new THREE.CylinderGeometry(radius + 1, radius + 3, 1.4, 28);
    const sandMat = new THREE.MeshLambertMaterial({
      color: sandColor,
      flatShading: true,
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.position.y = -2.0;
    sand.receiveShadow = true;
    this.group.add(sand);
    this._disposables.push(sandGeo, sandMat);

    // Surrounding ocean water plane
    const waterGeo = new THREE.PlaneGeometry(320, 320);
    const waterMat = new THREE.MeshLambertMaterial({
      color: waterColor,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.1;
    this.group.add(water);
    this._disposables.push(waterGeo, waterMat);
  }

  /**
   * Creates the central cobblestone plaza disc.
   */
  _buildPlaza() {
    const { radius, color } = this.layout.plaza;

    const plazaGeo = new THREE.CircleGeometry(radius, 28);
    const plazaMat = new THREE.MeshLambertMaterial({
      color: color,
      flatShading: true,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02; // Elevated slightly to prevent z-fighting with ground
    plaza.receiveShadow = true;
    this.group.add(plaza);
    this._disposables.push(plazaGeo, plazaMat);
  }

  /**
   * Creates connecting path boxes between the plaza and each building entrance.
   */
  _buildPaths() {
    const pathsMat = new THREE.MeshLambertMaterial({
      color: this.layout.pathsColor,
      flatShading: true,
    });
    this._disposables.push(pathsMat);

    for (const p of this.layout.paths) {
      const dx = p.end.x - p.start.x;
      const dz = p.end.z - p.start.z;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      const pathGeo = new THREE.BoxGeometry(p.width, 0.04, length);
      const pathMesh = new THREE.Mesh(pathGeo, pathsMat);

      // Midpoint placement
      pathMesh.position.set(
        (p.start.x + p.end.x) / 2,
        0.02,
        (p.start.z + p.end.z) / 2
      );
      pathMesh.rotation.y = angle;
      pathMesh.receiveShadow = true;

      this.group.add(pathMesh);
      this._disposables.push(pathGeo);
    }
  }

  /**
   * Builds distinct stylized buildings from layout data.
   * Each building is a Group with box body, 4-sided roof, and door box on the entrance side.
   */
  _buildBuildings() {
    const doorMat = new THREE.MeshLambertMaterial({
      color: 0x3d2614,
      flatShading: true,
    });
    this._disposables.push(doorMat);

    for (const b of this.layout.buildings) {
      const buildingGroup = new THREE.Group();
      buildingGroup.name = `building_${b.id}`;

      // Building main body
      const bodyGeo = new THREE.BoxGeometry(b.size.w, b.size.h, b.size.d);
      const bodyMat = new THREE.MeshLambertMaterial({
        color: b.color,
        flatShading: true,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = b.size.h / 2;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      buildingGroup.add(bodyMesh);
      this._disposables.push(bodyGeo, bodyMat);

      // 4-sided pyramid roof slightly overhangs the walls
      const roofHeight = b.size.h * 0.45;
      const roofRadius = Math.hypot(b.size.w, b.size.d) * 0.54;
      const roofGeo = new THREE.ConeGeometry(roofRadius, roofHeight, 4);
      const roofMat = new THREE.MeshLambertMaterial({
        color: b.roofColor,
        flatShading: true,
      });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      // Align 4 cone vertices with box faces
      roofMesh.rotation.y = Math.PI / 4;
      roofMesh.position.y = b.size.h + roofHeight / 2;
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      buildingGroup.add(roofMesh);
      this._disposables.push(roofGeo, roofMat);

      // Door box on the local front (+Z) face facing the plaza
      const doorW = 1.6;
      const doorH = 2.4;
      const doorD = 0.2;
      const doorGeo = new THREE.BoxGeometry(doorW, doorH, doorD);
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.position.set(0, doorH / 2, b.size.d / 2 + doorD / 2);
      doorMesh.castShadow = true;
      doorMesh.receiveShadow = true;
      buildingGroup.add(doorMesh);
      this._disposables.push(doorGeo);

      // Place and rotate entire building group
      buildingGroup.position.set(b.position.x, 0, b.position.z);
      buildingGroup.rotation.y = b.rotationY;
      this.group.add(buildingGroup);

      // Record 2D box collider footprint
      this.colliders.push({
        type: 'box',
        id: b.id,
        x: b.position.x,
        z: b.position.z,
        w: b.size.w,
        d: b.size.d,
        rotationY: b.rotationY,
      });
    }
  }

  /**
   * Procedurally generates trees using two InstancedMeshes (one for trunks, one for foliage).
   */
  _buildTrees() {
    const { trees: treeParams } = this.layout;
    const rng = this._createRNG(treeParams.seed);
    const validTrees = [];
    const maxAttempts = 3500;
    let attempts = 0;

    while (validTrees.length < treeParams.count && attempts < maxAttempts) {
      attempts++;
      const angle = rng() * Math.PI * 2;
      const r =
        treeParams.minDistanceFromPlaza +
        rng() * (treeParams.maxDistanceFromCenter - treeParams.minDistanceFromPlaza);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      if (Math.hypot(x, z) < treeParams.minDistanceFromPlaza) continue;
      if (Math.hypot(x, z) > treeParams.maxDistanceFromCenter) continue;

      // Ensure clearance from buildings
      let tooClose = false;
      for (const b of this.layout.buildings) {
        const maxRadius = Math.max(b.size.w, b.size.d) / 2;
        if (Math.hypot(x - b.position.x, z - b.position.z) < maxRadius + treeParams.minDistanceFromBuildings) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Ensure clearance from paths
      for (const p of this.layout.paths) {
        const dist = this._distanceToSegment(x, z, p.start.x, p.start.z, p.end.x, p.end.z);
        if (dist < p.width / 2 + treeParams.minDistanceFromPaths) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Ensure clearance from neighboring trees
      for (const t of validTrees) {
        if (Math.hypot(x - t.x, z - t.z) < 3.2) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const scale = 0.85 + rng() * 0.35;
      const rotY = rng() * Math.PI * 2;
      validTrees.push({ x, z, scale, rotY });
    }

    if (validTrees.length === 0) return;

    // Trunk geometry: base aligned at y = 0
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.2, 5);
    trunkGeo.translate(0, 1.1, 0);
    const trunkMat = new THREE.MeshLambertMaterial({
      color: 0x6f4e37,
      flatShading: true,
    });
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, validTrees.length);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;

    // Foliage geometry: base starts at y = 2.0 slightly overlapping trunk
    const foliageGeo = new THREE.ConeGeometry(1.6, 3.2, 5);
    foliageGeo.translate(0, 3.6, 0);
    const foliageMat = new THREE.MeshLambertMaterial({
      color: 0x2d6a4f,
      flatShading: true,
    });
    const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, validTrees.length);
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < validTrees.length; i++) {
      const t = validTrees[i];
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, t.rotY, 0);
      dummy.scale.set(t.scale, t.scale, t.scale);
      dummy.updateMatrix();

      trunkMesh.setMatrixAt(i, dummy.matrix);
      foliageMesh.setMatrixAt(i, dummy.matrix);

      // Record circular collider footprint for trunk
      this.colliders.push({
        type: 'circle',
        x: t.x,
        z: t.z,
        radius: 0.45 * t.scale,
      });
    }

    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;

    this.group.add(trunkMesh);
    this.group.add(foliageMesh);
    this._disposables.push(trunkGeo, trunkMat, foliageGeo, foliageMat);
  }

  /**
   * Procedurally generates small decorative rocks via InstancedMesh (1 draw call).
   */
  _buildRocks() {
    const { rocks: rockParams } = this.layout;
    if (!rockParams) return;

    const rng = this._createRNG(rockParams.seed);
    const validRocks = [];
    const maxAttempts = 2000;
    let attempts = 0;

    while (validRocks.length < rockParams.count && attempts < maxAttempts) {
      attempts++;
      const angle = rng() * Math.PI * 2;
      const r =
        rockParams.minDistanceFromPlaza +
        rng() * (rockParams.maxDistanceFromCenter - rockParams.minDistanceFromPlaza);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      if (Math.hypot(x, z) < rockParams.minDistanceFromPlaza) continue;
      if (Math.hypot(x, z) > rockParams.maxDistanceFromCenter) continue;

      let tooClose = false;
      for (const b of this.layout.buildings) {
        const maxRadius = Math.max(b.size.w, b.size.d) / 2;
        if (Math.hypot(x - b.position.x, z - b.position.z) < maxRadius + rockParams.minDistanceFromBuildings) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      for (const p of this.layout.paths) {
        if (this._distanceToSegment(x, z, p.start.x, p.start.z, p.end.x, p.end.z) < p.width / 2 + rockParams.minDistanceFromPaths) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      for (const rk of validRocks) {
        if (Math.hypot(x - rk.x, z - rk.z) < 2.0) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const scale = 0.5 + rng() * 0.6;
      const rotY = rng() * Math.PI * 2;
      validRocks.push({ x, z, scale, rotY });
    }

    if (validRocks.length === 0) return;

    const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
    rockGeo.translate(0, 0.35, 0);
    const rockMat = new THREE.MeshLambertMaterial({
      color: 0x8d99ae,
      flatShading: true,
    });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, validRocks.length);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < validRocks.length; i++) {
      const rk = validRocks[i];
      dummy.position.set(rk.x, 0, rk.z);
      dummy.rotation.set(0, rk.rotY, 0);
      dummy.scale.set(rk.scale, rk.scale * 0.7, rk.scale);
      dummy.updateMatrix();

      rockMesh.setMatrixAt(i, dummy.matrix);

      this.colliders.push({
        type: 'circle',
        x: rk.x,
        z: rk.z,
        radius: 0.5 * rk.scale,
      });
    }

    rockMesh.instanceMatrix.needsUpdate = true;
    this.group.add(rockMesh);
    this._disposables.push(rockGeo, rockMat);
  }

  /**
   * Deterministic Mulberry32 PRNG generator.
   */
  _createRNG(seed) {
    let s = seed;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t >>> 0) / 4294967296);
    };
  }

  /**
   * Distance from 2D point (px, pz) to line segment (x1, z1)-(x2, z2).
   */
  _distanceToSegment(px, pz, x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l2));
    const projX = x1 + t * dx;
    const projZ = z1 + t * dz;
    return Math.hypot(px - projX, pz - projZ);
  }

  /**
   * Returns spawn point coordinates at the central plaza.
   * @returns {{ x: number, z: number }}
   */
  getSpawnPoint() {
    return { ...this.layout.spawn };
  }

  /**
   * Returns the walkable ground elevation at world coordinate (x, z).
   * Single source of truth for ground height — update here when procedural terrain or hills are added.
   * @param {number} x
   * @param {number} z
   * @returns {number}
   */
  getGroundHeight(x, z) {
    return 0; // Flat island plateau for now
  }

  /**
   * Returns the island boundary radius from layout configuration.
   * @returns {number}
   */
  getIslandRadius() {
    return this.layout.island.radius;
  }

  /**
   * Returns metadata and entrance coordinates for all interactive points of interest.
   * @returns {Array<{ id: string, label: string, position: {x:number, z:number}, entrance: {x:number, z:number}, interactionRadius: number }>}
   */
  getPOIs() {
    return this.layout.buildings.map((b) => ({
      id: b.id,
      label: b.label,
      position: { x: b.position.x, z: b.position.z },
      entrance: {
        x: b.position.x + b.entrance.x,
        z: b.position.z + b.entrance.z,
      },
      interactionRadius: b.interactionRadius,
    }));
  }

  /**
   * Returns 2D footprints for buildings and tree obstacles for future collision checks.
   * @returns {Array<object>}
   */
  getColliderData() {
    return [...this.colliders];
  }

  /**
   * Releases all geometries, materials, and instanced meshes.
   */
  dispose() {
    this.scene.remove(this.group);

    for (const item of this._disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    this._disposables.length = 0;
    this.colliders.length = 0;
  }
}

export default World;
