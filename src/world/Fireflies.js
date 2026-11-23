/**
 * Ambient Island Fireflies Particle Field.
 * Renders drifting bioluminescent fireflies spread across the island plateau.
 * All motion and flickering are computed entirely in the vertex shader on the GPU
 * for zero per-frame CPU performance overhead.
 * Exactly 1 draw call.
 */

import * as THREE from 'three';

export class Fireflies {
  /**
   * @param {THREE.Scene} scene
   * @param {object} [qualityConfig]
   */
  constructor(scene, qualityConfig = {}) {
    this.scene = scene;
    this.qualityConfig = qualityConfig;

    this.time = 0;
    this.points = null;

    this._build();
  }

  _build() {
    const count = this.qualityConfig.firefliesCount || 160;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4); // [phaseX, phaseY, phaseZ, colorBias]

    const minR = 4;
    const maxR = 40;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 0.4 + Math.random() * 2.8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      seeds[i * 4] = Math.random() * 10.0;
      seeds[i * 4 + 1] = Math.random() * 10.0;
      seeds[i * 4 + 2] = Math.random() * 10.0;
      seeds[i * 4 + 3] = Math.random(); // 0 = warm amber-green, 1 = neon cyan
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        attribute vec4 aSeed;
        varying float vColorBias;
        varying float vPulse;

        void main() {
          vColorBias = aSeed.w;

          // GPU-evaluated organic wandering motion using harmonized sine waves
          vec3 pos = position;
          pos.x += sin(uTime * 0.75 + aSeed.x * 6.28) * 0.75;
          pos.y += sin(uTime * 1.15 + aSeed.y * 6.28) * 0.45;
          pos.z += cos(uTime * 0.65 + aSeed.z * 6.28) * 0.75;

          // Gentle flicker pulse
          float pulse = sin(uTime * 2.4 + aSeed.x * 12.0) * 0.4 + 0.6;
          vPulse = pulse;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          // Size attenuation for depth perception - scaled down for crisp motes
          gl_PointSize = (26.0 * pulse) / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vColorBias;
        varying float vPulse;

        void main() {
          // Soft circular glow point (no external texture needed)
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float intensity = pow(1.0 - dist * 2.0, 1.8);

          // Blend between warm yellow-green firefly glow and neon cyan
          vec3 warmGreen = vec3(0.9, 0.98, 0.35);
          vec3 neonCyan = vec3(0.1, 0.95, 1.0);
          vec3 color = mix(warmGreen, neonCyan, vColorBias);

          // Capped output intensity so fireflies remain delicate points without blooming into large halos
          gl_FragColor = vec4(color * intensity, intensity * 0.75 * vPulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.name = 'fireflies_points';
    this.scene.add(this.points);
  }

  /**
   * Updates time uniform for GPU motion.
   * @param {number} delta
   */
  update(delta) {
    this.time += delta;
    if (this.material) {
      this.material.uniforms.uTime.value = this.time;
    }
  }

  /**
   * Reconfigures particle count based on quality tier.
   * @param {object} qualityConfig
   */
  applyQuality(qualityConfig) {
    this.qualityConfig = qualityConfig || {};
    this.dispose();
    this._build();
  }

  /**
   * Cleans up geometries and shaders.
   */
  dispose() {
    if (this.points) {
      if (this.points.geometry) this.points.geometry.dispose();
      if (this.points.material) this.points.material.dispose();
      if (this.points.parent) this.points.parent.remove(this.points);
      this.points = null;
    }
  }
}

export default Fireflies;
