/**
 * Stylized Fantasy Night Sky.
 * Features an inverted sky dome with vertical indigo-to-purple gradient,
 * a twinkling starry particle field computed on the GPU, and a glowing moon
 * aligned with the primary directional moonlight.
 * Exactly 3 draw calls.
 */

import * as THREE from 'three';
import { NIGHT_PALETTE } from './Atmosphere.js';

export class Sky {
  /**
   * @param {THREE.Scene} scene
   * @param {object} [qualityConfig]
   */
  constructor(scene, qualityConfig = {}) {
    this.scene = scene;
    this.qualityConfig = qualityConfig;

    this.group = new THREE.Group();
    this.group.name = 'sky_root';

    this.time = 0;
    this._disposables = [];

    this._buildDome();
    this._buildStars();
    this._buildMoon();

    this.scene.add(this.group);
  }

  _buildDome() {
    // Large sphere enclosing the visible world
    const domeGeo = new THREE.SphereGeometry(320, 24, 16);
    this._disposables.push(domeGeo);

    // Custom gradient shader interpolating from horizon glow to zenith night navy
    const domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(NIGHT_PALETTE.skyZenith) },
        uBottomColor: { value: new THREE.Color(NIGHT_PALETTE.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        varying vec3 vWorldPosition;
        void main() {
          // Normalize elevation angle: 0 at horizon, 1 at zenith
          float h = normalize(vWorldPosition).y;
          float factor = clamp(h * 1.8 + 0.1, 0.0, 1.0);
          // Non-linear ease gives a rich twilight band near the horizon
          factor = pow(factor, 0.65);
          vec3 sky = mix(uBottomColor, uTopColor, factor);
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this._disposables.push(domeMat);

    this.domeMesh = new THREE.Mesh(domeGeo, domeMat);
    this.group.add(this.domeMesh);
  }

  _buildStars() {
    const starCount = this.qualityConfig.starsCount || 500;
    const positions = new Float32Array(starCount * 3);
    const phases = new Float32Array(starCount);
    const sizes = new Float32Array(starCount);

    const radius = 300;

    for (let i = 0; i < starCount; i++) {
      // Distribute stars strictly on the upper dome hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.15); // Above horizon

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = Math.random() * 2.8 + 1.2;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this._disposables.push(starGeo);

    // Star material with twinkling brightness and size computed on the GPU
    this.starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        attribute float aPhase;
        attribute float aSize;
        varying float vAlpha;

        void main() {
          // Subtle twinkle using sine wave with unique star phase
          float twinkle = sin(uTime * 1.8 + aPhase) * 0.45 + 0.55;
          vAlpha = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (0.8 + 0.4 * twinkle) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          // Soft circular point shape
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float intensity = smoothstep(0.5, 0.0, dist);
          // Cool crystalline star color
          vec3 starColor = vec3(0.85, 0.95, 1.0);
          gl_FragColor = vec4(starColor, intensity * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this._disposables.push(this.starMat);

    this.starPoints = new THREE.Points(starGeo, this.starMat);
    this.group.add(this.starPoints);
  }

  _buildMoon() {
    this.moonGroup = new THREE.Group();

    // Position moon aligned with directional moonlight vector
    const moonDir = new THREE.Vector3(
      NIGHT_PALETTE.moonPos.x,
      NIGHT_PALETTE.moonPos.y,
      NIGHT_PALETTE.moonPos.z
    ).normalize();
    const moonDist = 240;
    this.moonGroup.position.copy(moonDir.multiplyScalar(moonDist));

    // 1. Glowing moon orb
    const moonGeo = new THREE.SphereGeometry(7.5, 16, 12);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe6f2ff,
      fog: false,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonGroup.add(moonMesh);
    this._disposables.push(moonGeo, moonMat);

    // 2. Soft atmospheric glow halo billboard
    const haloGeo = new THREE.PlaneGeometry(36, 36);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Look directly at camera (billboard orientation)
          vec4 mvPos = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mvPos.xy += position.xy;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = pow(1.0 - dist * 2.0, 2.4);
          vec3 haloColor = vec3(0.4, 0.65, 0.95);
          gl_FragColor = vec4(haloColor * glow, glow * 0.7);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.moonGroup.add(haloMesh);
    this._disposables.push(haloGeo, haloMat);

    this.group.add(this.moonGroup);
  }

  /**
   * Animates star twinkling and follows camera horizontally to avoid clipping.
   * @param {number} delta
   * @param {THREE.Vector3} cameraPos
   */
  update(delta, cameraPos) {
    this.time += delta;

    if (this.starMat) {
      this.starMat.uniforms.uTime.value = this.time;
    }

    if (cameraPos) {
      // Reposition sky dome around camera horizontally so it remains infinitely distant
      this.group.position.x = cameraPos.x;
      this.group.position.z = cameraPos.z;
    }
  }

  /**
   * Rebuilds stars when quality tier changes.
   * @param {object} qualityConfig
   */
  applyQuality(qualityConfig) {
    this.qualityConfig = qualityConfig || {};
    if (this.starPoints) {
      this.group.remove(this.starPoints);
      this.starPoints.geometry.dispose();
      this.starPoints = null;
      this._buildStars();
    }
  }

  /**
   * Disposes of geometries, shaders, and materials.
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
  }
}

export default Sky;
