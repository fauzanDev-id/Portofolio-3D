/**
 * Post-Processing Pipeline using Three.js EffectComposer.
 * Implements selective UnrealBloomPass and OutputPass for tone mapping
 * and color space accuracy. Automatically disables in 'low' quality tier
 * for zero GPU overhead.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class PostProcessing {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {object} qualityConfig - From Quality.getConfig()
   */
  constructor(renderer, scene, camera, qualityConfig) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.qualityConfig = qualityConfig || {};

    this.enabled = this.qualityConfig.postProcessing !== false;
    this._width = 1;
    this._height = 1;

    this._initComposer();
  }

  /**
   * Resolves active bloom configuration combining tier defaults and dev URL overrides.
   * @private
   */
  _getBloomConfig() {
    const tierBloom = this.qualityConfig.bloom || {
      strength: 0.35,
      radius: 0.32,
      threshold: 0.95,
      resolutionScale: 0.5,
    };
    return tierBloom;
  }

  _initComposer() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    this._width = size.x || window.innerWidth;
    this._height = size.y || window.innerHeight;
    const pixelRatio = this.renderer.getPixelRatio();

    // Main render target sized to physical pixels matching renderer
    const renderTarget = new THREE.WebGLRenderTarget(
      Math.floor(this._width * pixelRatio),
      Math.floor(this._height * pixelRatio),
      {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        colorSpace: THREE.SRGBColorSpace,
      }
    );

    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.setPixelRatio(pixelRatio);

    // 1. Scene render pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 2. Selective UnrealBloomPass with per-tier parameters
    const bloomCfg = this._getBloomConfig();
    const bloomScale = bloomCfg.resolutionScale || 0.5;
    const bloomRes = new THREE.Vector2(
      Math.floor(this._width * pixelRatio * bloomScale),
      Math.floor(this._height * pixelRatio * bloomScale)
    );

    this.bloomPass = new UnrealBloomPass(
      bloomRes,
      bloomCfg.strength,
      bloomCfg.radius,
      bloomCfg.threshold
    );
    this.composer.addPass(this.bloomPass);

    // 3. OutputPass for ACESFilmic tone mapping and sRGB output conversion
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  /**
   * Updates quality tier settings (enabling/disabling composer, updating bloom thresholds/strengths,
   * and synchronizing pixel ratio buffer sizes).
   * @param {object} qualityConfig
   */
  applyQuality(qualityConfig) {
    this.qualityConfig = qualityConfig || {};
    this.enabled = this.qualityConfig.postProcessing !== false;

    const bloomCfg = this._getBloomConfig();
    const pixelRatio = this.renderer.getPixelRatio();

    if (this.bloomPass) {
      this.bloomPass.strength = bloomCfg.strength;
      this.bloomPass.radius = bloomCfg.radius;
      this.bloomPass.threshold = bloomCfg.threshold;

      const bloomScale = bloomCfg.resolutionScale || 0.5;
      this.bloomPass.setSize(
        Math.floor(this._width * pixelRatio * bloomScale),
        Math.floor(this._height * pixelRatio * bloomScale)
      );
    }

    if (this.composer) {
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(this._width, this._height);
    }
  }

  /**
   * Resizes internal render targets and passes to match viewport changes and pixel ratios.
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this._width = width;
    this._height = height;
    const pixelRatio = this.renderer.getPixelRatio();

    if (this.composer) {
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
    }

    if (this.bloomPass) {
      const bloomCfg = this._getBloomConfig();
      const bloomScale = bloomCfg.resolutionScale || 0.5;
      this.bloomPass.setSize(
        Math.floor(width * pixelRatio * bloomScale),
        Math.floor(height * pixelRatio * bloomScale)
      );
    }
  }

  /**
   * Executes the render step.
   * If post-processing is enabled, renders through the EffectComposer pipeline.
   * Otherwise, renders directly via WebGLRenderer to minimize GPU draw overhead.
   */
  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Cleans up composer passes, render targets, and WebGL allocations.
   */
  dispose() {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    if (this.bloomPass && typeof this.bloomPass.dispose === 'function') {
      this.bloomPass.dispose();
    }
    if (this.renderPass && typeof this.renderPass.dispose === 'function') {
      this.renderPass.dispose();
    }
    if (this.outputPass && typeof this.outputPass.dispose === 'function') {
      this.outputPass.dispose();
    }
  }
}

export default PostProcessing;
