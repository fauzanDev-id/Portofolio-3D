/**
 * Progress and Experience tracking system.
 * Handles visited POI discovery tracking, XP calculation, level progression,
 * and localStorage persistence with safe fallbacks.
 * Pure logic — no DOM dependencies.
 */

export const PROGRESS_STORAGE_KEY = 'portfolio3d_progress_visited';
export const DEFAULT_XP_PER_AREA = 150;
export const DEFAULT_XP_PER_LEVEL = 300;

export class Progress {
  /**
   * @param {object} [options]
   * @param {object} [options.config] - Level system config { xpPerArea, xpPerLevel }
   * @param {import('../interaction/InteractionSystem.js').InteractionSystem} [options.interactionSystem]
   */
  constructor(options = {}) {
    const config = options.config || {};
    this.xpPerArea =
      typeof config.xpPerArea === 'number' && config.xpPerArea > 0
        ? config.xpPerArea
        : DEFAULT_XP_PER_AREA;
    this.xpPerLevel =
      typeof config.xpPerLevel === 'number' && config.xpPerLevel > 0
        ? config.xpPerLevel
        : DEFAULT_XP_PER_LEVEL;

    this.interactionSystem = options.interactionSystem || null;
    this.visited = new Set();
    this._listeners = new Set();
    this._unsubVisit = null;

    // Load persisted visited areas from localStorage
    this._load();

    // Sync with InteractionSystem if supplied
    if (this.interactionSystem) {
      for (const id of this.visited) {
        if (typeof this.interactionSystem.markVisited === 'function') {
          this.interactionSystem.markVisited(id);
        }
      }

      this._unsubVisit = (poiId) => {
        this.recordVisit(poiId);
      };
      this.interactionSystem.onVisit(this._unsubVisit);
    }
  }

  /**
   * Safely loads visited IDs from localStorage.
   */
  _load() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && item.length > 0) {
            this.visited.add(item);
          }
        }
      }
    } catch {
      // LocalStorage blocked, quota exceeded, or corrupted data — degrade gracefully
    }
  }

  /**
   * Safely persists visited IDs to localStorage.
   */
  _save() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const array = Array.from(this.visited);
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(array));
    } catch {
      // Storage unavailable or blocked — ignore safely
    }
  }

  /**
   * Returns total accumulated experience points.
   * @returns {number}
   */
  getTotalXp() {
    return this.visited.size * this.xpPerArea;
  }

  /**
   * Returns current level (starts at 1).
   * @returns {number}
   */
  getLevel() {
    return 1 + Math.floor(this.getTotalXp() / this.xpPerLevel);
  }

  /**
   * Returns XP accumulated towards the next level.
   * @returns {number}
   */
  getXpIntoLevel() {
    return this.getTotalXp() % this.xpPerLevel;
  }

  /**
   * Returns XP required for each level bracket.
   * @returns {number}
   */
  getXpForNextLevel() {
    return this.xpPerLevel;
  }

  /**
   * Returns progress fraction towards next level [0, 1).
   * @returns {number}
   */
  getProgressRatio() {
    return this.getXpIntoLevel() / this.xpPerLevel;
  }

  /**
   * Returns snapshot of current progression state.
   * @returns {object}
   */
  getState() {
    return {
      visited: Array.from(this.visited),
      visitedCount: this.visited.size,
      totalXp: this.getTotalXp(),
      level: this.getLevel(),
      xpIntoLevel: this.getXpIntoLevel(),
      xpForNextLevel: this.getXpForNextLevel(),
      progressRatio: this.getProgressRatio(),
    };
  }

  /**
   * Returns true if the POI has been discovered.
   * @param {string} poiId
   * @returns {boolean}
   */
  hasVisited(poiId) {
    return this.visited.has(poiId);
  }

  /**
   * Records a visit to a POI. Awards XP and saves state on first discovery only.
   * @param {string} poiId
   * @returns {boolean} True if this was a newly discovered POI
   */
  recordVisit(poiId) {
    if (!poiId || this.visited.has(poiId)) {
      return false;
    }

    const prevLevel = this.getLevel();
    this.visited.add(poiId);
    this._save();

    const newLevel = this.getLevel();
    const isLevelUp = newLevel > prevLevel;

    const eventData = {
      ...this.getState(),
      newPoiId: poiId,
      isLevelUp,
      newLevel,
      xpGained: this.xpPerArea,
    };

    this._emit(eventData);
    return true;
  }

  /**
   * Resets all progress and clears localStorage.
   */
  reset() {
    this.visited.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }

    this._emit({
      ...this.getState(),
      reset: true,
      xpGained: 0,
      isLevelUp: false,
    });
  }

  /**
   * Registers a change listener callback.
   * @param {Function} callback
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

  /**
   * Notifies all registered listeners of a progress state update.
   */
  _emit(event) {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[Progress] Error in change listener:', err);
      }
    }
  }

  /**
   * Disposes of listeners.
   */
  dispose() {
    this._listeners.clear();
    this._unsubVisit = null;
  }
}

export default Progress;
