import * as THREE from 'three';

/**
 * Core 3D engine managing scene lifecycle, camera, WebGL renderer,
 * resize events, and frame-rate independent animation loop.
 */
export class Engine {
  /**
   * @param {HTMLElement|string} container - Mount target element or selector
   */
  constructor(container = document.body) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!this.container) {
      throw new Error('Engine container element not found.');
    }

    // Set of update callbacks executed on every frame: (delta) => void
    this.updatables = new Set();
    this.isRunning = false;
    this._wasRunningBeforeHide = false;
    this._animationFrameId = null;

    this.quality = null;
    this.postProcessing = null;
    this._unsubQuality = null;
    this._qualityToastElement = null;
    this._qualityToastTimeout = null;

    this._initScene();
    this._initCamera();
    this._initRenderer();
    this._initTimer();
    this._bindEvents();
    this._initStatsOverlay();
  }

  _initScene() {
    this.scene = new THREE.Scene();
  }

  _initCamera() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    // Enforce sRGB color space for accurate color reproduction
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Enable soft shadow mapping
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Do not auto-reset info so draw calls across multi-pass post-processing sum accurately
    this.renderer.info.autoReset = false;

    // Cap device pixel ratio at 1.5 to keep GPU fill rate manageable on high-DPI screens
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);

    this.container.appendChild(this.renderer.domElement);
  }

  _initTimer() {
    this.timer = new THREE.Timer();
    this.timer.connect(document);
  }

  _bindEvents() {
    this._onResize = () => this.resize();
    this._onVisibilityChange = () => this._handleVisibility();

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  /**
   * Initializes the lightweight DOM stats overlay showing FPS, draw calls, triangles, and quality tier.
   * Toggled with F3 key. Also listens for F2 key to cycle graphics quality tiers.
   */
  _initStatsOverlay() {
    this._fpsElement = document.getElementById('fps-counter');

    this._onKeyDown = (event) => {
      if (event.code === 'F3') {
        event.preventDefault();
        if (this._fpsElement) {
          this._fpsElement.classList.toggle('hidden');
        }
      } else if (event.code === 'F2') {
        event.preventDefault();
        if (this.quality) {
          const nextTier = this.quality.cycleTier();
          this._showQualityToast(nextTier);
        }
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    this._statsFrameCount = 0;
    this._statsLastSample = performance.now();
  }

  /**
   * Spawns a floating toast banner showing the new quality tier when cycled with F2.
   * @param {string} tier - Active tier identifier ('low' | 'medium' | 'high')
   */
  _showQualityToast(tier) {
    if (this._qualityToastTimeout) {
      clearTimeout(this._qualityToastTimeout);
      this._qualityToastTimeout = null;
    }

    if (!this._qualityToastElement) {
      this._qualityToastElement = document.createElement('div');
      this._qualityToastElement.className = 'quality-toast';
      const root = document.getElementById('ui-root') || document.body;
      root.appendChild(this._qualityToastElement);
    }

    this._qualityToastElement.classList.remove('fade-out');
    this._qualityToastElement.textContent = 'Graphics: ';
    const span = document.createElement('span');
    span.className = 'toast-accent';
    span.textContent = (tier || '').toUpperCase();
    this._qualityToastElement.appendChild(span);

    this._qualityToastTimeout = setTimeout(() => {
      if (this._qualityToastElement) {
        this._qualityToastElement.classList.add('fade-out');
        this._qualityToastTimeout = setTimeout(() => {
          if (this._qualityToastElement && this._qualityToastElement.parentNode) {
            this._qualityToastElement.parentNode.removeChild(this._qualityToastElement);
            this._qualityToastElement = null;
          }
        }, 300);
      }
    }, 1500);
  }

  /**
   * Updates stats counters every 500ms using renderer.info.render.
   */
  _updateStats() {
    if (!this._fpsElement) return;

    this._statsFrameCount++;
    const now = performance.now();
    const elapsed = now - this._statsLastSample;

    if (elapsed >= 500) {
      const fps = Math.round((this._statsFrameCount * 1000) / elapsed);
      const calls = this.renderer.info.render.calls;
      const triangles = this.renderer.info.render.triangles;
      const qTier = this.quality ? this.quality.getTier().toUpperCase() : 'MED';
      this._fpsElement.textContent = `FPS: ${fps} | Calls: ${calls} | Tris: ${triangles.toLocaleString()} | Quality: ${qTier}`;
      this._statsFrameCount = 0;
      this._statsLastSample = now;
    }
  }

  /**
   * Attaches graphics quality manager and subscribes to runtime tier updates.
   * @param {import('./Quality.js').Quality} quality
   */
  setQuality(quality) {
    if (this._unsubQuality) {
      this._unsubQuality();
      this._unsubQuality = null;
    }

    this.quality = quality;
    if (this.quality) {
      this._unsubQuality = this.quality.onChange((config) => this.applyQuality(config));
      this.applyQuality(this.quality.getConfig());
    }
  }

  /**
   * Attaches post-processing pipeline.
   * @param {import('./PostProcessing.js').PostProcessing} postProcessing
   */
  setPostProcessing(postProcessing) {
    this.postProcessing = postProcessing;
  }

  /**
   * Applies graphics tier parameters (pixel ratio, shadow mapping, composer size).
   * @param {object} config
   */
  applyQuality(config) {
    if (!config) return;

    const pixelRatioCap = config.pixelRatioCap || 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));

    if (this.renderer.shadowMap) {
      this.renderer.shadowMap.enabled = config.tier !== 'low';
    }

    if (this.postProcessing) {
      this.postProcessing.applyQuality(config);
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    if (this.postProcessing) {
      this.postProcessing.setSize(width, height);
    }
  }

  /**
   * Registers a callback function to run on each frame with delta time in seconds.
   * @param {Function} fn - (delta: number) => void
   */
  addUpdatable(fn) {
    if (typeof fn === 'function') {
      this.updatables.add(fn);
    }
  }

  /**
   * Unregisters an update callback function.
   * @param {Function} fn
   */
  removeUpdatable(fn) {
    this.updatables.delete(fn);
  }

  /**
   * Handles window and container size changes.
   */
  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const pixelRatioCap = this.quality ? this.quality.getConfig().pixelRatioCap : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    this.renderer.setSize(width, height);

    if (this.postProcessing) {
      this.postProcessing.setSize(width, height);
    }
  }

  /**
   * Pauses rendering loop when browser tab loses visibility to conserve system resources.
   */
  _handleVisibility() {
    if (document.hidden) {
      this._wasRunningBeforeHide = this.isRunning;
      this.stop();
    } else if (this._wasRunningBeforeHide) {
      // Discard accumulated time during hidden state to avoid animation jumps
      this.timer.reset();
      this.start();
    }
  }

  /**
   * Starts the animation loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer.reset();
    this._tick();
  }

  /**
   * Stops the animation loop.
   */
  stop() {
    this.isRunning = false;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  /**
   * Per-frame animation tick.
   * @param {number} [timestamp]
   */
  _tick(timestamp) {
    if (!this.isRunning) return;

    this.timer.update(timestamp);
    // Clamp delta to a sane max (0.1s) to prevent animation jumps after tab switches or lag
    const delta = Math.min(this.timer.getDelta(), 0.1);

    // Call all registered update hooks
    for (const updateFn of this.updatables) {
      updateFn(delta);
    }

    // Reset draw call & triangle stats once at start of frame so multi-pass post-processing accumulates accurately
    this.renderer.info.reset();

    // Render through post-processing pipeline or directly via WebGLRenderer
    if (this.postProcessing && this.postProcessing.enabled) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Update draw call & triangle stats from renderer.info
    this._updateStats();

    this._animationFrameId = requestAnimationFrame((time) => this._tick(time));
  }

  /**
   * Tears down scene objects, event listeners, and WebGL context.
   */
  dispose() {
    this.stop();

    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
    }

    if (this._unsubQuality) {
      this._unsubQuality();
      this._unsubQuality = null;
    }

    if (this._qualityToastTimeout) {
      clearTimeout(this._qualityToastTimeout);
      this._qualityToastTimeout = null;
    }

    if (this._qualityToastElement && this._qualityToastElement.parentNode) {
      this._qualityToastElement.parentNode.removeChild(this._qualityToastElement);
      this._qualityToastElement = null;
    }

    if (this.postProcessing) {
      this.postProcessing.dispose();
      this.postProcessing = null;
    }

    if (this.timer) {
      this.timer.dispose();
    }

    this.updatables.clear();

    // Traverse scene and dispose geometries, materials, and textures
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
