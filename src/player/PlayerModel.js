import * as THREE from 'three';

/**
 * Placeholder low-poly character model.
 * Designed as a clean drop-in swap point for animated GLB models in Phase 7.
 * Origin is aligned at the character's feet (y = 0).
 */
export class PlayerModel {
  constructor() {
    // Root group representing character world transform
    this.group = new THREE.Group();
    this.group.name = 'player_model';

    // Internal sub-group for procedural animation offsets (bobbing, tilt)
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    this._state = 'idle';
    this._animTime = 0;
    this._disposables = [];

    this._buildMesh();
  }

  _buildMesh() {
    // Capsule dimensions: radius 0.35m, cylinder length 1.0m (total height = 1.7m)
    const capsuleGeo = new THREE.CapsuleGeometry(0.35, 1.0, 8, 16);
    const capsuleMat = new THREE.MeshLambertMaterial({
      color: 0x2b6cb0,
      flatShading: true,
    });
    const capsuleMesh = new THREE.Mesh(capsuleGeo, capsuleMat);

    // Position center at y = 0.85 so capsule base sits exactly at y = 0 (feet)
    capsuleMesh.position.y = 0.85;
    capsuleMesh.castShadow = true;
    this.bodyGroup.add(capsuleMesh);
    this._disposables.push(capsuleGeo, capsuleMat);

    // Front directional visor on local +Z face indicating facing angle
    const visorGeo = new THREE.BoxGeometry(0.32, 0.16, 0.2);
    const visorMat = new THREE.MeshLambertMaterial({
      color: 0xffd166,
      flatShading: true,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 1.35, 0.3);
    visorMesh.castShadow = true;
    this.bodyGroup.add(visorMesh);
    this._disposables.push(visorGeo, visorMat);
  }

  /**
   * Updates character animation state ('idle' | 'walk' | 'run' | 'jump').
   * @param {string} state
   */
  setState(state) {
    if (this._state !== state) {
      this._state = state;
    }
  }

  /**
   * Applies subtle procedural bob and tilt so movement feels responsive.
   * @param {number} delta - Frame delta in seconds
   */
  update(delta) {
    this._animTime += delta;

    if (this._state === 'walk') {
      const bob = Math.sin(this._animTime * 11) * 0.035;
      this.bodyGroup.position.y = bob;
      this.bodyGroup.rotation.x = 0.04;
      this.bodyGroup.rotation.z = Math.sin(this._animTime * 5.5) * 0.025;
    } else if (this._state === 'run') {
      const bob = Math.sin(this._animTime * 17) * 0.055;
      this.bodyGroup.position.y = bob;
      this.bodyGroup.rotation.x = 0.1;
      this.bodyGroup.rotation.z = Math.sin(this._animTime * 8.5) * 0.04;
    } else if (this._state === 'jump') {
      this.bodyGroup.position.y = 0.04;
      this.bodyGroup.rotation.x = -0.05;
      this.bodyGroup.rotation.z = 0;
    } else {
      // Idle breathing
      const breathe = Math.sin(this._animTime * 2.2) * 0.008;
      this.bodyGroup.position.y = breathe;
      this.bodyGroup.rotation.x = 0;
      this.bodyGroup.rotation.z = 0;
    }
  }

  /**
   * Frees geometries and materials.
   */
  dispose() {
    for (const item of this._disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    this._disposables.length = 0;
  }
}

export default PlayerModel;
