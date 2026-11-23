import * as THREE from 'three';

/**
 * Dev-only collider outline visualizer toggled with F4 key.
 * Merges all collider footprints into single LineSegments geometries to keep draw calls minimal (~2 calls).
 */
export class ColliderDebug {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../world/CollisionSystem.js').CollisionSystem} collisionSystem
   * @param {import('../player/PlayerController.js').PlayerController} playerController
   */
  constructor(scene, collisionSystem, playerController) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.playerController = playerController;

    this.group = new THREE.Group();
    this.group.name = 'collider_debug';
    this.group.visible = false;
    this.scene.add(this.group);

    this.visible = false;
    this._disposables = [];

    if (import.meta.env.DEV) {
      this._buildStaticColliderLines();
      this._buildPlayerCircle();
      this._bindKey();
    }
  }

  _buildStaticColliderLines() {
    const colliders = this.collisionSystem.getColliders();
    const vertices = [];
    const elevationY = 0.08; // Raised slightly above ground to prevent z-fighting

    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];

      if (col.type === 'box') {
        const hw = col.halfW;
        const hd = col.halfD;
        const cos = col.cos;
        const sin = col.sin;

        // 4 local corners
        const corners = [
          { x: -hw, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ];

        // Transform corners to world space
        const worldCorners = corners.map((c) => ({
          x: col.x + c.x * cos + c.z * sin,
          z: col.z - c.x * sin + c.z * cos,
        }));

        // 4 line segments forming the perimeter rectangle
        for (let j = 0; j < 4; j++) {
          const next = (j + 1) % 4;
          vertices.push(
            worldCorners[j].x,
            elevationY,
            worldCorners[j].z,
            worldCorners[next].x,
            elevationY,
            worldCorners[next].z
          );
        }
      } else if (col.type === 'circle') {
        const segments = 16;
        for (let j = 0; j < segments; j++) {
          const a1 = (j / segments) * Math.PI * 2;
          const a2 = ((j + 1) / segments) * Math.PI * 2;
          vertices.push(
            col.x + Math.cos(a1) * col.radius,
            elevationY,
            col.z + Math.sin(a1) * col.radius,
            col.x + Math.cos(a2) * col.radius,
            elevationY,
            col.z + Math.sin(a2) * col.radius
          );
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0x00f0ff, // Cyan for static environment obstacles
      depthTest: false,
      transparent: true,
      opacity: 0.85,
      fog: false,
    });

    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 998;
    this.group.add(lines);
    this._disposables.push(geo, mat);
  }

  _buildPlayerCircle() {
    const segments = 16;
    const vertices = [];
    const radius = 0.4; // Matches PLAYER_CONFIG.RADIUS
    const elevationY = 0.12;

    for (let j = 0; j < segments; j++) {
      const a1 = (j / segments) * Math.PI * 2;
      const a2 = ((j + 1) / segments) * Math.PI * 2;
      vertices.push(
        Math.cos(a1) * radius,
        elevationY,
        Math.sin(a1) * radius,
        Math.cos(a2) * radius,
        elevationY,
        Math.sin(a2) * radius
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0xff007f, // Bright magenta for player collision cylinder
      depthTest: false,
      transparent: true,
      opacity: 0.9,
      fog: false,
    });

    this.playerRing = new THREE.LineSegments(geo, mat);
    this.playerRing.renderOrder = 999;
    this.group.add(this.playerRing);
    this._disposables.push(geo, mat);
  }

  _bindKey() {
    this._onKeyDown = (event) => {
      if (event.code === 'F4') {
        event.preventDefault();
        this.visible = !this.visible;
        this.group.visible = this.visible;
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Syncs dynamic player debug ring position with player character.
   */
  update() {
    if (!this.visible || !this.playerRing || !this.playerController) return;
    const pos = this.playerController.getPosition();
    if (pos) {
      this.playerRing.position.set(pos.x, 0, pos.z);
    }
  }

  /**
   * Frees debug geometries, materials, and key listener.
   */
  dispose() {
    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
    }
    this.scene.remove(this.group);
    for (const item of this._disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    this._disposables.length = 0;
  }
}

export default ColliderDebug;
