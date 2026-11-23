/**
 * Asset Loader for 3D assets (GLTF/GLB).
 * Wraps Three.js GLTFLoader with promise-based caching to prevent redundant network fetches,
 * supports progress reporting callbacks for future loading UI, and provides clean error handling.
 */

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  constructor() {
    this._loader = new GLTFLoader();
    this._cache = new Map(); // url -> Promise<gltf>
  }

  /**
   * Loads a GLTF/GLB asset with promise caching and optional progress reporting.
   * @param {string} url - Path or URL to the GLB/GLTF asset
   * @param {Function} [onProgress] - Optional progress callback: (loaded: number, total: number) => void
   * @returns {Promise<object>} Resolved GLTF result { scene, animations, cameras, asset, ... }
   */
  loadGLTF(url, onProgress = null) {
    if (this._cache.has(url)) {
      return this._cache.get(url);
    }

    const loadPromise = new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          resolve(gltf);
        },
        (xhr) => {
          if (onProgress && typeof onProgress === 'function') {
            onProgress(xhr.loaded, xhr.total);
          }
        },
        (error) => {
          const msg =
            error?.message ||
            (typeof error === 'string' ? error : 'Failed to load GLTF asset');
          reject(new Error(`[AssetLoader] Error loading "${url}": ${msg}`));
        }
      );
    });

    this._cache.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Returns whether a given URL is already cached or actively loading.
   * @param {string} url
   * @returns {boolean}
   */
  has(url) {
    return this._cache.has(url);
  }

  /**
   * Clears cached promises and resources.
   */
  dispose() {
    this._cache.clear();
  }
}

// Global default instance
export const assetLoader = new AssetLoader();
