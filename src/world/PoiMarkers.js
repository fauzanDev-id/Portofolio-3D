import * as THREE from 'three';

/**
 * Renders subtle glowing ground rings at each building entrance.
 * Emissive neon aesthetic matching the night fantasy theme, pulsing slowly
 * and intensifying when the player approaches.
 */
export class PoiMarkers {
  /**
   * @param {THREE.Scene} scene
   * @param {Array<object>} pois - POIs from World.getPOIs()
   */
  constructor(scene, pois = []) {
    this.scene = scene;
    this.pois = pois;

    this.group = new THREE.Group();
    this.group.name = 'poi_markers';
    this.scene.add(this.group);

    this.markers = [];
    this._time = 0;
    this._disposables = [];

    this._buildMarkers();
  }

  _buildMarkers() {
    // Shared ring geometry (innerRadius 1.1m, outerRadius 1.45m)
    const ringGeo = new THREE.RingGeometry(1.1, 1.45, 32);
    ringGeo.rotateX(-Math.PI / 2); // Lay flat on ground
    this._disposables.push(ringGeo);

    for (let i = 0; i < this.pois.length; i++) {
      const poi = this.pois[i];

      // Dedicated material per marker to permit independent intensity pulsing
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false, // Prevents z-fighting and rendering artifacts
        toneMapped: false,
      });
      this._disposables.push(mat);

      const mesh = new THREE.Mesh(ringGeo, mat);
      // Elevation slightly above ground (0.04m) to avoid z-fighting with paths
      mesh.position.set(poi.entrance.x, 0.04, poi.entrance.z);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      this.group.add(mesh);

      this.markers.push({
        poiId: poi.id,
        mesh,
        material: mat,
        baseColor: new THREE.Color(0x00f0ff),
        activeColor: new THREE.Color(0x9d4edd),
      });
    }
  }

  /**
   * Updates ground ring pulse animations.
   * @param {number} delta - Frame delta in seconds
   * @param {object|null} nearestPoi - Currently active nearest POI within interaction range
   */
  update(delta, nearestPoi) {
    this._time += delta;

    const basePulse = 0.42 + Math.sin(this._time * 2.8) * 0.14;
    const activePulse = 0.75 + Math.sin(this._time * 4.5) * 0.2;

    for (let i = 0; i < this.markers.length; i++) {
      const marker = this.markers[i];
      const isNearest = nearestPoi && nearestPoi.id === marker.poiId;

      if (isNearest) {
        marker.material.opacity = activePulse;
        marker.material.color.copy(marker.activeColor);

        // Subtle scale pulse when active
        const scale = 1.0 + Math.sin(this._time * 4.5) * 0.05;
        marker.mesh.scale.set(scale, 1, scale);
      } else {
        marker.material.opacity = basePulse;
        marker.material.color.copy(marker.baseColor);
        marker.mesh.scale.set(1, 1, 1);
      }
    }
  }

  /**
   * Cleans up marker meshes, geometries, and materials.
   */
  dispose() {
    this.scene.remove(this.group);
    for (const item of this._disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    this._disposables.length = 0;
    this.markers.length = 0;
  }
}

export default PoiMarkers;
