/**
 * Circular navigational compass HUD widget.
 * Features rotating cardinal markers (N, E, S, W) aligned with camera yaw,
 * center player marker, and POI landmark blips with proximity and discovery states.
 * Throttles DOM style writes to avoid layout thrashing and avoids per-frame garbage.
 */

export const COMPASS_CONFIG = {
  DIAMETER: 78, // Widget diameter in px
  RADIUS: 30, // Plotting radius for POI blips in px
  MIN_POI_RADIUS: 10, // Minimum radius distance for blips in px
  ISLAND_EXTENT: 42, // Normalization distance for island radius in meters
  YAW_THRESHOLD: 0.008, // Radians threshold to trigger dial rotation update (~0.45 deg)
  POS_THRESHOLD: 0.18, // Meters threshold to trigger POI blip layout update
};

export class Compass {
  /**
   * @param {object} options
   * @param {Array<object>} options.pois - POIs from World.getPOIs()
   * @param {import('../player/PlayerController.js').PlayerController} options.player
   * @param {import('../player/CameraRig.js').CameraRig} options.cameraRig
   * @param {import('../systems/Progress.js').Progress} [options.progress]
   * @param {HTMLElement} [options.container] - Parent container
   */
  constructor({
    pois = [],
    player,
    cameraRig,
    progress = null,
    container = null,
  }) {
    this.pois = pois;
    this.player = player;
    this.cameraRig = cameraRig;
    this.progress = progress;

    // Cache previous states to prevent redundant DOM writes
    this._lastYaw = -999;
    this._currentRotDeg = 0; // Continuous damped rotation angle in degrees
    this._lastPlayerX = -9999;
    this._lastPlayerZ = -9999;
    this._lastNearestId = null;
    this._needsBlipRefresh = true;

    this._blips = new Map();

    this._buildUI();

    if (this.progress) {
      this._unsubProgress = this.progress.onChange(() => {
        this._needsBlipRefresh = true;
      });
    }

    if (container) {
      container.appendChild(this.element);
    }
  }

  _buildUI() {
    this.element = document.createElement('div');
    this.element.className = 'hud-compass';
    this.element.setAttribute('aria-label', 'Navigational compass');

    // Outer fixed ring bezel with heading indicator pointer at top
    const pointer = document.createElement('div');
    pointer.className = 'compass-heading-pointer';
    pointer.setAttribute('aria-hidden', 'true');
    this.element.appendChild(pointer);

    // Rotating dial that turns as the camera orbits
    this.dial = document.createElement('div');
    this.dial.className = 'compass-dial';
    this.dial.setAttribute('aria-hidden', 'true');

    // Cardinal direction labels
    const cardinals = [
      { text: 'N', cls: 'cardinal-n' },
      { text: 'E', cls: 'cardinal-e' },
      { text: 'S', cls: 'cardinal-s' },
      { text: 'W', cls: 'cardinal-w' },
    ];

    for (const { text, cls } of cardinals) {
      const label = document.createElement('span');
      label.className = `compass-cardinal ${cls}`;
      label.textContent = text;
      this.dial.appendChild(label);
    }

    // Dial crosshair ticks
    const crosshair = document.createElement('div');
    crosshair.className = 'compass-crosshair';
    this.dial.appendChild(crosshair);

    // POI landmark blips
    for (const poi of this.pois) {
      const blip = document.createElement('div');
      blip.className = 'compass-blip';
      blip.title = poi.label || poi.id;
      blip.dataset.id = poi.id;

      this.dial.appendChild(blip);
      this._blips.set(poi.id, {
        element: blip,
        poi,
        isDiscovered: false,
        isNearest: false,
      });
    }

    this.element.appendChild(this.dial);

    // Center player indicator pip (stationary inside bezel)
    const centerPip = document.createElement('div');
    centerPip.className = 'compass-center-pip';
    centerPip.setAttribute('aria-hidden', 'true');
    this.element.appendChild(centerPip);
  }

  /**
   * Main per-frame compass update.
   * Compares changes against thresholds to avoid DOM style thrashing.
   * @param {string|null} nearestPoiId
   */
  update(nearestPoiId = null) {
    if (!this.cameraRig || !this.player) return;

    const camYaw = this.cameraRig.getYaw();
    const playerPos = this.player.getPosition();
    if (!playerPos) return;

    const px = playerPos.x;
    const pz = playerPos.z;

    // 1. Shortest-arc angular interpolation to prevent 360-degree flip spins
    // Target heading in degrees (Three.js -Z is North, yaw = PI)
    const targetDeg = (camYaw - Math.PI) * (180 / Math.PI);
    let diffDeg = (targetDeg - this._currentRotDeg) % 360;
    if (diffDeg > 180) diffDeg -= 360;
    if (diffDeg < -180) diffDeg += 360;

    const rotChanged = Math.abs(diffDeg) > 0.08;
    const dPos = Math.hypot(px - this._lastPlayerX, pz - this._lastPlayerZ);
    const nearestChanged = nearestPoiId !== this._lastNearestId;

    // Check if any state exceeds update threshold
    if (
      !rotChanged &&
      dPos < COMPASS_CONFIG.POS_THRESHOLD &&
      !nearestChanged &&
      !this._needsBlipRefresh
    ) {
      return;
    }

    // Update dial rotation with shortest-angle damping
    if (rotChanged) {
      this._currentRotDeg += diffDeg * 0.28;
      this.dial.style.transform = `rotate(${this._currentRotDeg.toFixed(2)}deg)`;
      this._lastYaw = camYaw;
    }

    // 2. Update blip positions if player moved or nearest/discovered state changed
    if (dPos >= COMPASS_CONFIG.POS_THRESHOLD || nearestChanged || this._needsBlipRefresh) {
      this._updateBlips(px, pz, nearestPoiId);
      this._lastPlayerX = px;
      this._lastPlayerZ = pz;
      this._lastNearestId = nearestPoiId;
      this._needsBlipRefresh = false;
    }
  }

  /**
   * Positions each POI landmark blip on the rotating dial based on world offset.
   */
  _updateBlips(px, pz, nearestPoiId) {
    const maxR = COMPASS_CONFIG.RADIUS;
    const minR = COMPASS_CONFIG.MIN_POI_RADIUS;
    const extent = COMPASS_CONFIG.ISLAND_EXTENT;

    for (const [id, blipData] of this._blips) {
      const { element, poi } = blipData;
      const targetPos = poi.entrance || poi.position;

      const dx = targetPos.x - px;
      const dz = targetPos.z - pz;
      const dist = Math.hypot(dx, dz);

      // Bearing relative to world North (clockwise from North: North=0, East=PI/2)
      const bearing = Math.atan2(dx, -dz);

      // Distance normalized and clamped between inner center and outer bezel
      const normDist = Math.max(0, Math.min(1, dist / extent));
      const radius = minR + normDist * (maxR - minR);

      const bx = radius * Math.sin(bearing);
      const by = -radius * Math.cos(bearing);

      element.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px)`;

      // Nearest active status
      const isNearest = id === nearestPoiId;
      if (isNearest !== blipData.isNearest) {
        blipData.isNearest = isNearest;
        element.classList.toggle('nearest', isNearest);
      }

      // Discovered status
      const isDiscovered = this.progress ? this.progress.hasVisited(id) : false;
      if (isDiscovered !== blipData.isDiscovered) {
        blipData.isDiscovered = isDiscovered;
        element.classList.toggle('discovered', isDiscovered);
      }
    }
  }

  /**
   * Cleans up listeners and removes DOM elements.
   */
  dispose() {
    if (this._unsubProgress) {
      this._unsubProgress();
      this._unsubProgress = null;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this._blips.clear();
  }
}

export default Compass;
