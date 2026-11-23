/**
 * Night Atmosphere & Environmental Lighting.
 * Centralizes the stylized fantasy night palette (single source of truth for visual mood),
 * sets up moonlight, hemisphere ambient fill, plaza point accent, exponential colored fog,
 * and ACESFilmic tone mapping with exposure tuning for high-contrast emissives.
 */

import * as THREE from 'three';

export const NIGHT_PALETTE = {
  skyZenith: 0x050716, // Midnight navy zenith
  skyHorizon: 0x241246, // Twilight purple-magenta horizon glow
  fog: 0x120c29, // Atmospheric night fog matching horizon
  moonLight: 0xa8c8ec, // Cool silver-blue moonlight
  moonPos: { x: 42, y: 62, z: 32 }, // Moonlight direction vector
  hemiSky: 0x3d2f66, // Deep indigo sky ambient
  hemiGround: 0x0b101c, // Dark navy ground ambient
  plazaPoint: 0x00f0ff, // Subtle plaza cyan accent
  water: 0x071b2d, // Dark oceanic teal
  waterShimmer: 0x00f0ff, // Neon cyan wave shimmer
  windowAmber: 0xffaa22, // Warm glowing interior window amber
  doorNeon: 0x00f0ff, // Futuristic cyan door frame neon
  lanternAmber: 0xff9900, // Path lantern flame amber
  crystalPurple: 0xbd00ff, // Floating island crystal neon purple
};

export class Atmosphere {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.WebGLRenderer} renderer
   * @param {object} [qualityConfig]
   */
  constructor(scene, renderer, qualityConfig = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.qualityConfig = qualityConfig;

    this._initToneMapping();
    this._initFog();
    this._initLights();
  }

  _initToneMapping() {
    // ACESFilmic tone mapping yields rich contrast and filmic saturation for neon emissives
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    let exposure = 1.0;

    if (
      typeof import.meta !== 'undefined' &&
      import.meta.env?.DEV &&
      typeof window !== 'undefined' &&
      window.location
    ) {
      try {
        const params = new URLSearchParams(window.location.search);
        const exp = params.get('exposure');
        if (exp !== null && !isNaN(Number(exp))) {
          exposure = Math.max(0.2, Math.min(3.0, Number(exp)));
        }
      } catch {
        // Ignore URL parsing errors in dev
      }
    }

    this.renderer.toneMappingExposure = exposure;
  }

  _initFog() {
    // Exponential fog tuned so far island perimeter smoothly fades into twilight horizon
    this.fogColor = new THREE.Color(NIGHT_PALETTE.fog);
    this.scene.fog = new THREE.FogExp2(this.fogColor, 0.0125);
    this.scene.background = this.fogColor;
  }

  _initLights() {
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = 'atmosphere_lights';

    // 1. Hemisphere light: indigo sky fill + dark ground fill
    this.hemiLight = new THREE.HemisphereLight(
      NIGHT_PALETTE.hemiSky,
      NIGHT_PALETTE.hemiGround,
      0.55
    );
    this.hemiLight.position.set(0, 50, 0);
    this.lightsGroup.add(this.hemiLight);

    // 2. Main directional moonlight casting soft shadows
    this.moonLight = new THREE.DirectionalLight(NIGHT_PALETTE.moonLight, 1.05);
    this.moonLight.position.set(
      NIGHT_PALETTE.moonPos.x,
      NIGHT_PALETTE.moonPos.y,
      NIGHT_PALETTE.moonPos.z
    );
    this.moonLight.castShadow = true;

    const shadowSize = this.qualityConfig.shadowMapSize || 1024;
    this.moonLight.shadow.mapSize.width = shadowSize;
    this.moonLight.shadow.mapSize.height = shadowSize;

    // Tight shadow frustum fitted to 45m island
    const shadowDist = 52;
    this.moonLight.shadow.camera.near = 10;
    this.moonLight.shadow.camera.far = 145;
    this.moonLight.shadow.camera.left = -shadowDist;
    this.moonLight.shadow.camera.right = shadowDist;
    this.moonLight.shadow.camera.top = shadowDist;
    this.moonLight.shadow.camera.bottom = -shadowDist;
    this.moonLight.shadow.bias = -0.0003;
    this.moonLight.shadow.normalBias = 0.05;

    this.lightsGroup.add(this.moonLight);

    // 3. Central plaza accent point light (only 1 PointLight used in scene)
    // Documented choice: We limit to exactly 1 point light at the plaza center
    // to strictly preserve the GPU budget, letting bloom and emissives create rich lighting.
    this.plazaLight = new THREE.PointLight(
      NIGHT_PALETTE.plazaPoint,
      1.1,
      22,
      1.6
    );
    this.plazaLight.position.set(0, 2.2, 0);
    this.lightsGroup.add(this.plazaLight);

    this.scene.add(this.lightsGroup);
  }

  /**
   * Adjusts directional shadow map size based on active quality tier.
   * @param {number} shadowMapSize
   */
  applyQuality(qualityConfig) {
    this.qualityConfig = qualityConfig || {};
    const size = this.qualityConfig.shadowMapSize || 1024;

    if (this.moonLight && this.moonLight.shadow) {
      if (
        this.moonLight.shadow.mapSize.width !== size ||
        this.moonLight.shadow.mapSize.height !== size
      ) {
        this.moonLight.shadow.mapSize.set(size, size);
        if (this.moonLight.shadow.map) {
          this.moonLight.shadow.map.dispose();
          this.moonLight.shadow.map = null;
        }
      }
    }
  }

  /**
   * Tears down light sources and removes them from scene.
   */
  dispose() {
    if (this.moonLight && this.moonLight.shadow && this.moonLight.shadow.map) {
      this.moonLight.shadow.map.dispose();
    }
    if (this.lightsGroup && this.lightsGroup.parent) {
      this.lightsGroup.parent.remove(this.lightsGroup);
    }
  }
}

export default Atmosphere;
