/**
 * Proximity interaction system.
 * Detects when the player approaches building entrance POIs, manages prompt visibility,
 * and controls modal dialog state while suspending character movement and camera orbit.
 */
export class InteractionSystem {
  /**
   * @param {object} params
   * @param {Array<object>} params.pois - List of POIs from World.getPOIs()
   * @param {import('../player/PlayerController.js').PlayerController} params.player
   * @param {import('../player/CameraRig.js').CameraRig} params.cameraRig
   * @param {import('../input/InputManager.js').InputManager} params.inputManager
   * @param {import('../ui/InfoPanel.js').InfoPanel} params.infoPanel
   * @param {import('../ui/InteractionPrompt.js').InteractionPrompt} params.interactionPrompt
   * @param {object} params.sections - Section definitions from portfolio.js
   */
  constructor({
    pois = [],
    player,
    cameraRig,
    inputManager,
    infoPanel,
    interactionPrompt,
    sections = {},
  }) {
    this.pois = pois;
    this.player = player;
    this.cameraRig = cameraRig;
    this.inputManager = inputManager;
    this.infoPanel = infoPanel;
    this.interactionPrompt = interactionPrompt;
    this.sections = sections;

    this.nearestPoi = null;
    this.visitedPois = new Set();

    this._onNearChangeCallbacks = new Set();
    this._onVisitCallbacks = new Set();
    this._onPanelStateChangeCallbacks = new Set();

    // Hook panel close event to restore player movement
    if (this.infoPanel) {
      this.infoPanel.onClose(() => this._handlePanelClosed());
    }
  }

  /**
   * Main per-frame interaction update loop step.
   */
  update() {
    // If modal is active, check for Escape close trigger
    if (this.isPanelOpen()) {
      if (this.inputManager.isJustPressed('Escape')) {
        this.close();
      }
      return;
    }

    // 1. Proximity detection: find closest POI entrance within interaction radius
    const playerPos = this.player.getPosition();
    if (!playerPos) return;

    let closest = null;
    let minDistanceSq = Infinity;

    for (let i = 0; i < this.pois.length; i++) {
      const poi = this.pois[i];
      const dx = playerPos.x - poi.entrance.x;
      const dz = playerPos.z - poi.entrance.z;
      const distSq = dx * dx + dz * dz;
      const maxRadius = poi.interactionRadius || 4.5;

      if (distSq <= maxRadius * maxRadius && distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closest = poi;
      }
    }

    // 2. Handle nearest POI change
    if (closest !== this.nearestPoi) {
      this.nearestPoi = closest;

      if (this.nearestPoi) {
        this.interactionPrompt.show(this.nearestPoi.label);
      } else {
        this.interactionPrompt.hide();
      }

      for (const cb of this._onNearChangeCallbacks) {
        cb(this.nearestPoi);
      }
    }

    // 3. Trigger interaction on E key press
    if (this.nearestPoi && this.inputManager.isJustPressed('KeyE')) {
      this.open(this.nearestPoi.id);
    }
  }

  /**
   * Opens the portfolio info panel for the specified POI id.
   * Suspends player kinematics and camera rotation.
   * @param {string} poiId
   */
  open(poiId) {
    if (this.isPanelOpen()) return;

    const section = this.sections[poiId];
    if (!section) return;

    // Suspend player movement and camera controls
    this.player.setEnabled(false);
    this.cameraRig.setEnabled(false);
    this.inputManager.clearHeldKeys();
    this.interactionPrompt.hide();

    // Track visited POI
    if (!this.visitedPois.has(poiId)) {
      this.visitedPois.add(poiId);
      for (const cb of this._onVisitCallbacks) {
        cb(poiId);
      }
    }

    this.infoPanel.open(section);
    for (const cb of this._onPanelStateChangeCallbacks) {
      cb(true);
    }
  }

  /**
   * Closes the info panel and restores control.
   */
  close() {
    if (!this.isPanelOpen()) return;
    this.infoPanel.close();
  }

  _handlePanelClosed() {
    // Restore character and camera controls
    this.player.setEnabled(true);
    this.cameraRig.setEnabled(true);
    this.inputManager.clearHeldKeys();

    // Re-show interaction prompt if still standing in range of a POI
    if (this.nearestPoi) {
      this.interactionPrompt.show(this.nearestPoi.label);
    }

    for (const cb of this._onPanelStateChangeCallbacks) {
      cb(false);
    }
  }

  /**
   * Returns currently active POI within proximity range.
   * @returns {object|null}
   */
  getNearest() {
    return this.nearestPoi;
  }

  /**
   * Returns true if the modal dialog is currently open.
   * @returns {boolean}
   */
  isPanelOpen() {
    return this.infoPanel ? this.infoPanel.isOpen() : false;
  }

  /**
   * Returns set of visited POI identifiers.
   * @returns {Set<string>}
   */
  getVisited() {
    return new Set(this.visitedPois);
  }

  /**
   * Registers a callback fired when the nearest POI changes.
   * @param {Function} callback - (poi: object|null) => void
   */
  onNearChange(callback) {
    if (typeof callback === 'function') {
      this._onNearChangeCallbacks.add(callback);
    }
  }

  /**
   * Registers a callback fired when a new POI is first visited.
   * @param {Function} callback - (poiId: string) => void
   */
  onVisit(callback) {
    if (typeof callback === 'function') {
      this._onVisitCallbacks.add(callback);
    }
  }

  /**
   * Registers a callback fired when the panel opens or closes.
   * @param {Function} callback - (isOpen: boolean) => void
   */
  onPanelStateChange(callback) {
    if (typeof callback === 'function') {
      this._onPanelStateChangeCallbacks.add(callback);
    }
  }

  /**
   * Marks a POI id as visited without triggering callbacks.
   * @param {string} poiId
   */
  markVisited(poiId) {
    this.visitedPois.add(poiId);
  }

  /**
   * Cleans up listeners.
   */
  dispose() {
    this._onNearChangeCallbacks.clear();
    this._onVisitCallbacks.clear();
    this._onPanelStateChangeCallbacks.clear();
    this.visitedPois.clear();
  }
}

export default InteractionSystem;
