/**
 * Fast-travel navigation menu for the top-right HUD.
 * Renders real <button> elements with icons, labels, discovery dots,
 * and keyboard shortcuts (number keys 1-7).
 * Handles smooth fade-to-black teleport transitions.
 */

export const FADE_DURATION_MS = 240;
export const TELEPORT_HOLD_MS = 60;

export class FastTravelMenu {
  /**
   * @param {object} options
   * @param {Array<object>} options.navItems - [{ label, icon, target }]
   * @param {Array<object>} options.pois - POIs from World.getPOIs()
   * @param {object} options.spawnPoint - { x, z } from World.getSpawnPoint()
   * @param {import('../player/PlayerController.js').PlayerController} options.player
   * @param {import('../player/CameraRig.js').CameraRig} options.cameraRig
   * @param {import('../input/InputManager.js').InputManager} options.inputManager
   * @param {import('../systems/Progress.js').Progress} options.progress
   * @param {import('../interaction/InteractionSystem.js').InteractionSystem} options.interactionSystem
   * @param {HTMLElement} [options.container] - Parent container
   */
  constructor({
    navItems = [],
    pois = [],
    spawnPoint = { x: 0, z: 2 },
    player,
    cameraRig,
    inputManager,
    progress,
    interactionSystem,
    container = null,
  }) {
    this.navItems = navItems;
    this.pois = pois;
    this.spawnPoint = spawnPoint;
    this.player = player;
    this.cameraRig = cameraRig;
    this.inputManager = inputManager;
    this.progress = progress;
    this.interactionSystem = interactionSystem;

    // Fast lookup for POIs by target ID
    this._poiMap = new Map();
    for (const poi of this.pois) {
      this._poiMap.set(poi.id, poi);
    }

    this._isTraveling = false;
    this._buttons = [];

    // Create DOM elements
    this._buildUI();

    // Create screen fade overlay
    this._buildFadeOverlay();

    // Bind keyboard shortcuts (1-7)
    this._bindKeyboard();

    // Subscribe to progress changes to update visited dots
    if (this.progress) {
      this._unsubProgress = this.progress.onChange(() => {
        this.updateVisitedState();
      });
    }

    if (container) {
      container.appendChild(this.element);
    }
  }

  _buildUI() {
    this.element = document.createElement('nav');
    this.element.className = 'hud-nav';
    this.element.setAttribute('aria-label', 'Fast travel navigation');

    this.navItems.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hud-nav-btn';
      btn.dataset.target = item.target;

      const keyNumber = index + 1;
      const keyHint = keyNumber <= 9 ? ` [${keyNumber}]` : '';
      btn.title = `Fast travel to ${item.label}${keyHint}`;
      btn.setAttribute(
        'aria-label',
        `Fast travel to ${item.label}${keyHint}`
      );

      // Icon
      const iconSpan = document.createElement('span');
      iconSpan.className = 'hud-nav-icon';
      iconSpan.textContent = item.icon || '📍';
      iconSpan.setAttribute('aria-hidden', 'true');
      btn.appendChild(iconSpan);

      // Label
      const labelSpan = document.createElement('span');
      labelSpan.className = 'hud-nav-label';
      labelSpan.textContent = item.label;
      btn.appendChild(labelSpan);

      // Visited indicator dot (for POI destinations)
      if (item.target !== 'home') {
        const dot = document.createElement('span');
        dot.className = 'hud-nav-dot';
        dot.setAttribute('aria-hidden', 'true');
        if (this.progress && this.progress.hasVisited(item.target)) {
          dot.classList.add('visited');
        }
        btn.appendChild(dot);
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.blur();
        this.travelTo(item.target);
      });

      this.element.appendChild(btn);
      this._buttons.push({ btn, target: item.target });
    });
  }

  _buildFadeOverlay() {
    this.fadeOverlay = document.createElement('div');
    this.fadeOverlay.className = 'fast-travel-overlay';
    this.fadeOverlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.fadeOverlay);
  }

  _bindKeyboard() {
    this._onKeyDown = (e) => {
      // Ignore if user is typing in forms or content-editable elements
      if (
        e.target &&
        (e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable)
      ) {
        return;
      }

      // Ignore when an info panel modal is currently open
      if (this.interactionSystem && this.interactionSystem.isPanelOpen()) {
        return;
      }

      // Check number keys 1 through 9
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < this.navItems.length) {
          e.preventDefault();
          this.travelTo(this.navItems[index].target);
        }
      }
    };

    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Refreshes the visited dots on all navigation buttons.
   */
  updateVisitedState() {
    if (!this.progress) return;
    for (const { btn, target } of this._buttons) {
      if (target === 'home') continue;
      const dot = btn.querySelector('.hud-nav-dot');
      if (dot) {
        const isVisited = this.progress.hasVisited(target);
        dot.classList.toggle('visited', isVisited);
      }
    }
  }

  /**
   * Initiates teleportation to target POI or 'home' spawn point.
   * Runs a 200ms fade-to-black transition, teleports character,
   * aligns camera yaw toward the destination, and fades back in.
   * @param {string} target
   */
  travelTo(target) {
    if (this._isTraveling) return;
    if (this.interactionSystem && this.interactionSystem.isPanelOpen()) return;

    let targetX = 0;
    let targetZ = 0;
    let faceYaw = 0;
    let camYaw = 0;

    if (target === 'home') {
      targetX = this.spawnPoint.x;
      targetZ = this.spawnPoint.z;
      // Face North toward plaza center
      faceYaw = Math.PI;
      camYaw = 0; // Camera behind looking North
    } else {
      const poi = this._poiMap.get(target);
      if (!poi) return;
      targetX = poi.entrance.x;
      targetZ = poi.entrance.z;

      // Face toward building center
      const dx = poi.position.x - poi.entrance.x;
      const dz = poi.position.z - poi.entrance.z;
      faceYaw = Math.atan2(dx, dz);
      // Position camera behind character looking at building
      camYaw = Math.atan2(-dx, -dz);
    }

    this._isTraveling = true;

    // Suspend player input & camera orbit during transition
    if (this.player) this.player.setEnabled(false);
    if (this.inputManager) this.inputManager.clearHeldKeys();
    if (this.cameraRig) this.cameraRig.setEnabled(false);

    // Fade to black
    this.fadeOverlay.classList.add('active');

    setTimeout(() => {
      // Teleport while screen is covered in darkness
      if (this.player) {
        this.player.teleportTo(targetX, targetZ, faceYaw);
      }

      if (this.cameraRig) {
        this.cameraRig._targetYaw = camYaw;
        this.cameraRig._currentYaw = camYaw;
        // Instantly align look-at focal target and camera position to prevent camera drift/snap
        if (typeof this.cameraRig._initInitialPosition === 'function') {
          this.cameraRig._initInitialPosition();
        }
      }

      // Brief hold before fade out
      setTimeout(() => {
        this.fadeOverlay.classList.remove('active');

        // Restore controls once fade transition concludes
        setTimeout(() => {
          if (this.player) this.player.setEnabled(true);
          if (this.cameraRig) this.cameraRig.setEnabled(true);
          if (this.inputManager) this.inputManager.clearHeldKeys();
          this._isTraveling = false;
        }, FADE_DURATION_MS);
      }, TELEPORT_HOLD_MS);
    }, FADE_DURATION_MS);
  }

  /**
   * Cleans up DOM elements and event listeners.
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    if (this._unsubProgress) {
      this._unsubProgress();
      this._unsubProgress = null;
    }
    if (this.fadeOverlay && this.fadeOverlay.parentNode) {
      this.fadeOverlay.parentNode.removeChild(this.fadeOverlay);
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this._buttons = [];
  }
}

export default FastTravelMenu;
