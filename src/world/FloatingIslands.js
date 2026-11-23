/**
 * Distant Floating Islands.
 * Low-poly floating rock islets hovering in the twilight horizon.
 * Each islet features a craggy inverted stone cone, a grassy plateau top,
 * and glowing neon purple crystal shards or miniature trees.
 * Animates gentle bobbing and yaw rotation.
 * Max ~6 draw calls using shared materials.
 */

import * as THREE from 'three';
import { NIGHT_PALETTE } from './Atmosphere.js';

export class FloatingIslands {
  /**
   * @param {THREE.Scene} scene
   * @param {Array<object>} islandsData - Layout data for floating islets
   * @param {object} [qualityConfig]
   */
  constructor(scene, islandsData = [], qualityConfig = {}) {
    this.scene = scene;
    this.islandsData = islandsData;
    this.qualityConfig = qualityConfig;

    this.group = new THREE.Group();
    this.group.name = 'floating_islands_root';

    this.time = 0;
    this._islands = [];
    this._disposables = [];

    this._initSharedMaterials();
    this._buildIslands();

    this.scene.add(this.group);
  }

  _initSharedMaterials() {
    // 1. Craggy dark rock material
    this.rockMat = new THREE.MeshLambertMaterial({
      color: 0x222030,
      flatShading: true,
    });
    this._disposables.push(this.rockMat);

    // 2. Bioluminescent grass top
    this.grassMat = new THREE.MeshLambertMaterial({
      color: 0x2d4a3e,
      flatShading: true,
    });
    this._disposables.push(this.grassMat);

    // 3. Glowing neon purple crystal material
    this.crystalMat = new THREE.MeshLambertMaterial({
      color: 0x9b45b2,
      emissive: NIGHT_PALETTE.crystalPurple,
      emissiveIntensity: 1.8,
      flatShading: true,
    });
    this._disposables.push(this.crystalMat);

    // 4. Stylized foliage
    this.foliageMat = new THREE.MeshLambertMaterial({
      color: 0x1d3830,
      flatShading: true,
    });
    this._disposables.push(this.foliageMat);
  }

  _buildIslands() {
    const maxCount = this.qualityConfig.floatingIslandsCount || 4;
    const targets = this.islandsData.slice(0, maxCount);

    targets.forEach((data, index) => {
      const islet = new THREE.Group();
      islet.position.set(data.x, data.y, data.z);

      const radius = data.radius || 6.5;
      const height = data.height || 10.0;

      // 1. Inverted rock cone base (upside-down craggy 7-sided cone)
      const rockGeo = new THREE.ConeGeometry(radius, height, 7);
      const rockMesh = new THREE.Mesh(rockGeo, this.rockMat);
      rockMesh.rotation.x = Math.PI; // Invert cone
      rockMesh.position.y = -height / 2;
      islet.add(rockMesh);
      this._disposables.push(rockGeo);

      // 2. Grassy plateau top disc
      const topGeo = new THREE.CylinderGeometry(radius * 0.95, radius, 1.2, 7);
      const topMesh = new THREE.Mesh(topGeo, this.grassMat);
      topMesh.position.y = 0.6;
      islet.add(topMesh);
      this._disposables.push(topGeo);

      // 3. Either glowing crystal shards or miniature low-poly tree
      if (index % 2 === 0) {
        // Glowing purple crystal spire
        const crystalGeo = new THREE.ConeGeometry(radius * 0.28, radius * 1.2, 5);
        const crystalMesh = new THREE.Mesh(crystalGeo, this.crystalMat);
        crystalMesh.position.y = 1.2 + (radius * 1.2) / 2;
        crystalMesh.rotation.z = (Math.random() - 0.5) * 0.3;
        islet.add(crystalMesh);
        this._disposables.push(crystalGeo);
      } else {
        // Miniature stylized tree
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.2, 5);
        const trunkMesh = new THREE.Mesh(trunkGeo, this.rockMat);
        trunkMesh.position.y = 1.2 + 1.1;
        islet.add(trunkMesh);
        this._disposables.push(trunkGeo);

        const foliageGeo = new THREE.ConeGeometry(radius * 0.45, 3.8, 5);
        const foliageMesh = new THREE.Mesh(foliageGeo, this.foliageMat);
        foliageMesh.position.y = 1.2 + 2.2 + 1.9;
        islet.add(foliageMesh);
        this._disposables.push(foliageGeo);
      }

      this.group.add(islet);
      this._islands.push({
        group: islet,
        baseY: data.y,
        bobSpeed: 0.7 + (index % 3) * 0.25,
        bobAmp: 0.6 + (index % 2) * 0.4,
        rotSpeed: 0.05 + (index % 4) * 0.03,
        phase: index * 1.6,
      });
    });
  }

  /**
   * Slowly bobs and rotates each floating island.
   * @param {number} delta
   */
  update(delta) {
    this.time += delta;

    for (const item of this._islands) {
      // Harmonic gentle bobbing
      item.group.position.y =
        item.baseY + Math.sin(this.time * item.bobSpeed + item.phase) * item.bobAmp;
      // Continuous slow yaw spin
      item.group.rotation.y += delta * item.rotSpeed;
    }
  }

  /**
   * Rebuilds islands to match active quality tier count.
   * @param {object} qualityConfig
   */
  applyQuality(qualityConfig) {
    this.qualityConfig = qualityConfig || {};
    // Remove existing meshes from group
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this._islands = [];
    this._buildIslands();
  }

  /**
   * Disposes of geometries, shared materials, and meshes.
   */
  dispose() {
    for (const item of this._disposables) {
      if (typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this._islands = [];
  }
}

export default FloatingIslands;
