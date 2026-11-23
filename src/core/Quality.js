/**
 * Graphics Quality Manager.
 * Defines scalable performance tiers ('low' | 'medium' | 'high'), persists
 * preference to localStorage with URL parameter override (?quality=low),
 * and coordinates shader/particle/post-processing budgets.
 */

export const QUALITY_TIERS = {
  low: {
    tier: 'low',
    label: 'Low',
    postProcessing: false,
    shadowMapSize: 1024,
    pixelRatioCap: 1.0,
    firefliesCount: 60,
    starsCount: 250,
    floatingIslandsCount: 2,
    bloomResolutionScale: 0.5,
    bloom: {
      strength: 0,
      radius: 0,
      threshold: 1.0,
      resolutionScale: 0.5,
    },
  },
  medium: {
    tier: 'medium',
    label: 'Medium',
    postProcessing: true,
    shadowMapSize: 1024,
    pixelRatioCap: 1.5,
    firefliesCount: 160,
    starsCount: 500,
    floatingIslandsCount: 4,
    bloomResolutionScale: 0.5,
    bloom: {
      strength: 0.45,
      radius: 0.38,
      threshold: 0.88,
      resolutionScale: 0.5,
    },
  },
  high: {
    tier: 'high',
    label: 'High',
    postProcessing: true,
    shadowMapSize: 2048,
    pixelRatioCap: 2.0,
    firefliesCount: 220,
    starsCount: 800,
    floatingIslandsCount: 5,
    bloomResolutionScale: 0.5,
    bloom: {
      strength: 0.35,
      radius: 0.32,
      threshold: 0.95,
      resolutionScale: 0.5,
    },
  },
};

/**
 * Parses dev-only URL search parameters (?bloom=0.4&bloomRadius=0.35&bloomThreshold=0.95)
 * to facilitate interactive visual tuning without rebuilding.
 * Clamped strictly to safe ranges to avoid rendering artifacts.
 */
function getDevBloomParams() {
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env?.DEV &&
    typeof window !== 'undefined' &&
    window.location
  ) {
    try {
      const p = new URLSearchParams(window.location.search);
      const res = {};
      const b = p.get('bloom');
      const r = p.get('bloomRadius');
      const t = p.get('bloomThreshold');

      if (b !== null && !isNaN(Number(b))) {
        res.strength = Math.max(0.0, Math.min(2.0, Number(b)));
      }
      if (r !== null && !isNaN(Number(r))) {
        res.radius = Math.max(0.0, Math.min(2.0, Number(r)));
      }
      if (t !== null && !isNaN(Number(t))) {
        res.threshold = Math.max(0.0, Math.min(1.5, Number(t)));
      }
      return Object.keys(res).length > 0 ? res : null;
    } catch {
      return null;
    }
  }
  return null;
}

const STORAGE_KEY = 'portfolio3d_quality';
const TIER_ORDER = ['low', 'medium', 'high'];

export class Quality {
  /**
   * @param {string} [initialTier]
   */
  constructor(initialTier = null) {
    this._listeners = new Set();
    this.currentTier = this._resolveInitialTier(initialTier);
  }

  /**
   * Determines active quality tier checking URL search params, localStorage, or fallback to 'medium'.
   */
  _resolveInitialTier(forcedTier) {
    if (forcedTier && QUALITY_TIERS[forcedTier]) {
      return forcedTier;
    }

    // 1. URL search parameter override (e.g. ?quality=low)
    try {
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        const urlTier = params.get('quality');
        if (urlTier && QUALITY_TIERS[urlTier.toLowerCase()]) {
          return urlTier.toLowerCase();
        }
      }
    } catch {
      // Ignore URL parsing errors
    }

    // 2. LocalStorage persistence
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && QUALITY_TIERS[stored]) {
          return stored;
        }
      }
    } catch {
      // LocalStorage blocked or restricted
    }

    // 3. Safe default
    return 'medium';
  }

  /**
   * Returns current quality tier identifier.
   * @returns {'low'|'medium'|'high'}
   */
  getTier() {
    return this.currentTier;
  }

  /**
   * Returns full configuration parameters for current tier, applying dev URL overrides if in dev mode.
   * @returns {object}
   */
  getConfig() {
    const base = QUALITY_TIERS[this.currentTier];
    const devBloom = getDevBloomParams();
    if (!devBloom || !base.postProcessing) {
      return base;
    }
    return {
      ...base,
      bloom: {
        ...base.bloom,
        ...devBloom,
      },
    };
  }

  /**
   * Sets new quality tier and persists to localStorage.
   * @param {'low'|'medium'|'high'} tier
   * @returns {boolean} True if tier changed
   */
  setTier(tier) {
    const nextTier = (tier || '').toLowerCase();
    if (!QUALITY_TIERS[nextTier] || nextTier === this.currentTier) {
      return false;
    }

    this.currentTier = nextTier;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, nextTier);
      }
    } catch {
      // LocalStorage unavailable
    }

    this._emit();
    return true;
  }

  /**
   * Cycles sequentially to the next tier: low -> medium -> high -> low.
   * @returns {string} The new active tier identifier
   */
  cycleTier() {
    const currentIndex = TIER_ORDER.indexOf(this.currentTier);
    const nextIndex = (currentIndex + 1) % TIER_ORDER.length;
    const nextTier = TIER_ORDER[nextIndex];
    this.setTier(nextTier);
    return nextTier;
  }

  /**
   * Subscribes to quality tier change events.
   * @param {Function} callback - (config: object) => void
   * @returns {Function} Unsubscribe function
   */
  onChange(callback) {
    if (typeof callback === 'function') {
      this._listeners.add(callback);
    }
    return () => {
      this._listeners.delete(callback);
    };
  }

  _emit() {
    const config = this.getConfig();
    for (const listener of this._listeners) {
      try {
        listener(config);
      } catch (err) {
        console.error('[Quality] Listener error:', err);
      }
    }
  }

  dispose() {
    this._listeners.clear();
  }
}

export default Quality;
