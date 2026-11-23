/**
 * Main Game HUD overlay component.
 * Coordinates the profile card, level & XP progression bar, floating discovery toasts,
 * fast-travel navigation menu, quick-access social links, and the compass widget.
 *
 * Implemented strictly with DOM APIs (createElement/textContent) to eliminate XSS risks.
 * Overlay root uses pointer-events: none so 3D camera dragging remains responsive.
 */

import { FastTravelMenu } from './FastTravelMenu.js';
import { Compass } from './Compass.js';

export class Hud {
  /**
   * @param {object} options
   * @param {HTMLElement} options.parent - Root container (#ui-root)
   * @param {object} options.profile - Profile data from portfolio.js
   * @param {Array<object>} options.navItems - Fast-travel nav list
   * @param {Array<object>} options.pois - POIs from World.getPOIs()
   * @param {object} options.spawnPoint - Central spawn coordinates
   * @param {import('../player/PlayerController.js').PlayerController} options.player
   * @param {import('../player/CameraRig.js').CameraRig} options.cameraRig
   * @param {import('../input/InputManager.js').InputManager} options.inputManager
   * @param {import('../interaction/InteractionSystem.js').InteractionSystem} options.interactionSystem
   * @param {import('../systems/Progress.js').Progress} options.progress
   */
  constructor({
    parent,
    profile,
    navItems,
    pois,
    spawnPoint,
    player,
    cameraRig,
    inputManager,
    interactionSystem,
    progress,
  }) {
    this.parent = parent;
    this.profile = profile || {};
    this.navItems = navItems || [];
    this.pois = pois || [];
    this.spawnPoint = spawnPoint;
    this.player = player;
    this.cameraRig = cameraRig;
    this.inputManager = inputManager;
    this.interactionSystem = interactionSystem;
    this.progress = progress;

    // POI lookup map for label discovery
    this._poiMap = new Map();
    for (const poi of this.pois) {
      this._poiMap.set(poi.id, poi);
    }

    this._activeToasts = []; // Managed toast queue [ { element, timer } ]
    this._unsubProgress = null;
    this._unsubPanelState = null;

    this._buildUI();
    this._setupSubscriptions();
  }

  _buildUI() {
    this.element = document.createElement('div');
    this.element.className = 'hud-container';
    this.element.setAttribute('aria-label', 'Game HUD');

    // 1. Top-Left: Profile & XP progression card
    this._buildProfileCard();

    // 2. Top-Right: Fast-travel navigation menu
    this.fastTravelMenu = new FastTravelMenu({
      navItems: this.navItems,
      pois: this.pois,
      spawnPoint: this.spawnPoint,
      player: this.player,
      cameraRig: this.cameraRig,
      inputManager: this.inputManager,
      progress: this.progress,
      interactionSystem: this.interactionSystem,
      container: this.element,
    });

    // 3. Bottom-Left: Quick Access links card
    this._buildQuickAccessCard();

    // 4. Bottom-Right: Compass widget
    this.compass = new Compass({
      pois: this.pois,
      player: this.player,
      cameraRig: this.cameraRig,
      progress: this.progress,
      container: this.element,
    });

    // 5. Floating Toast Anchor
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'hud-toast-container';
    this.toastContainer.setAttribute('aria-live', 'polite');
    this.element.appendChild(this.toastContainer);

    this.parent.appendChild(this.element);

    // Initial progress sync
    if (this.progress) {
      this.updateProgress(this.progress.getState());
    }
  }

  _buildProfileCard() {
    this.profileCard = document.createElement('div');
    this.profileCard.className = 'hud-profile-card';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'hud-avatar';
    avatar.textContent = this.profile.avatar || '⚡';
    avatar.setAttribute('aria-hidden', 'true');
    this.profileCard.appendChild(avatar);

    // Details column
    const details = document.createElement('div');
    details.className = 'hud-profile-details';

    // Name row with Level badge
    const nameRow = document.createElement('div');
    nameRow.className = 'hud-name-row';

    const name = document.createElement('span');
    name.className = 'hud-name';
    name.textContent = this.profile.name || 'Developer';
    nameRow.appendChild(name);

    this.levelBadge = document.createElement('span');
    this.levelBadge.className = 'hud-level-badge';
    this.levelBadge.textContent = 'Lv. 1';
    nameRow.appendChild(this.levelBadge);

    details.appendChild(nameRow);

    // Title / subtitle
    const title = document.createElement('div');
    title.className = 'hud-title';
    title.textContent = this.profile.title || 'Creative Developer';
    details.appendChild(title);

    // XP progress bar
    const xpContainer = document.createElement('div');
    xpContainer.className = 'hud-xp-container';

    this.xpTrack = document.createElement('div');
    this.xpTrack.className = 'hud-xp-track';
    this.xpTrack.setAttribute('role', 'progressbar');
    this.xpTrack.setAttribute('aria-valuemin', '0');
    this.xpTrack.setAttribute('aria-valuemax', '300');
    this.xpTrack.setAttribute('aria-valuenow', '0');

    this.xpFill = document.createElement('div');
    this.xpFill.className = 'hud-xp-fill';
    this.xpTrack.appendChild(this.xpFill);
    xpContainer.appendChild(this.xpTrack);

    this.xpLabel = document.createElement('span');
    this.xpLabel.className = 'hud-xp-label';
    this.xpLabel.textContent = '0 / 300 XP';
    xpContainer.appendChild(this.xpLabel);

    details.appendChild(xpContainer);
    this.profileCard.appendChild(details);
    this.element.appendChild(this.profileCard);
  }

  _buildQuickAccessCard() {
    const quickLinks = this.profile.quickLinks || [];
    if (quickLinks.length === 0) return;

    this.quickAccessCard = document.createElement('div');
    this.quickAccessCard.className = 'hud-quick-access';

    // Collapsible toggle button for compact viewports
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'hud-quick-toggle';
    toggleBtn.title = 'Toggle Quick Links';
    toggleBtn.setAttribute('aria-label', 'Toggle Quick Links');

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'quick-toggle-icon';
    toggleIcon.textContent = '🔗';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleBtn.appendChild(toggleIcon);

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'quick-toggle-label';
    toggleLabel.textContent = 'Links';
    toggleBtn.appendChild(toggleLabel);

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.quickAccessCard.classList.toggle('expanded');
    });

    this.quickAccessCard.appendChild(toggleBtn);

    // Links container list
    const list = document.createElement('ul');
    list.className = 'hud-quick-list';

    for (const link of quickLinks) {
      // Validate safe protocols strictly (http, https, mailto)
      if (
        !link.url ||
        (!link.url.startsWith('https://') &&
          !link.url.startsWith('http://') &&
          !link.url.startsWith('mailto:'))
      ) {
        continue;
      }

      const li = document.createElement('li');
      li.className = 'hud-quick-item';

      const a = document.createElement('a');
      a.className = 'hud-quick-link';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', `${link.label} (opens in new tab)`);

      const icon = document.createElement('span');
      icon.className = 'hud-quick-icon';
      icon.textContent = link.icon || '🔗';
      icon.setAttribute('aria-hidden', 'true');
      a.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'hud-quick-label';
      label.textContent = link.label;
      a.appendChild(label);

      li.appendChild(a);
      list.appendChild(li);
    }

    this.quickAccessCard.appendChild(list);
    this.element.appendChild(this.quickAccessCard);
  }

  _setupSubscriptions() {
    // 1. Progress events: XP update, discovery toast, level up
    if (this.progress) {
      this._unsubProgress = this.progress.onChange((event) => {
        this.updateProgress(event);

        if (event.xpGained > 0) {
          this.showXpToast(`+${event.xpGained} XP`);
        }

        if (event.newPoiId) {
          const poi = this._poiMap.get(event.newPoiId);
          const label = poi ? poi.label : event.newPoiId;
          this.showDiscoveryToast(`Area discovered: ${label}`);
        }

        if (event.isLevelUp) {
          this.showLevelUpToast(`Level Up! Level ${event.newLevel}`);
        }
      });
    }

    // 2. Interaction modal open/close: hide HUD smoothly when modal opens
    if (this.interactionSystem) {
      this._unsubPanelState = (isOpen) => {
        this.element.classList.toggle('hidden', isOpen);
      };
      this.interactionSystem.onPanelStateChange(this._unsubPanelState);
    }
  }

  /**
   * Updates profile level badge, XP bar, and ARIA attributes.
   * @param {object} state
   */
  updateProgress(state) {
    if (!state) return;

    if (this.levelBadge) {
      this.levelBadge.textContent = `Lv. ${state.level || 1}`;
    }

    if (this.xpFill) {
      const ratio = Math.max(0, Math.min(1, state.progressRatio || 0));
      this.xpFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }

    if (this.xpTrack) {
      this.xpTrack.setAttribute('aria-valuenow', String(state.xpIntoLevel || 0));
      this.xpTrack.setAttribute('aria-valuemax', String(state.xpForNextLevel || 300));
    }

    if (this.xpLabel) {
      this.xpLabel.textContent = `${state.xpIntoLevel || 0} / ${state.xpForNextLevel || 300} XP`;
    }
  }

  /**
   * Enqueues and displays a toast with queue management (max 3 visible).
   * @param {HTMLElement} toast
   * @param {number} duration - Milliseconds before auto-dismiss
   */
  _enqueueToast(toast, duration) {
    // If 3 or more toasts are currently active, dismiss the oldest immediately
    if (this._activeToasts.length >= 3) {
      const oldest = this._activeToasts.shift();
      if (oldest) {
        clearTimeout(oldest.timer);
        this._dismissToast(oldest.element);
      }
    }

    this.toastContainer.appendChild(toast);

    const timer = setTimeout(() => {
      this._dismissToast(toast);
      this._activeToasts = this._activeToasts.filter((t) => t.element !== toast);
    }, duration);

    this._activeToasts.push({ element: toast, timer });
  }

  /**
   * Fades out and safely removes a toast element from the DOM.
   * @param {HTMLElement} toast
   */
  _dismissToast(toast) {
    if (!toast) return;
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 240);
  }

  /**
   * Spawns a floating +XP badge that floats upward and fades.
   * @param {string} text
   */
  showXpToast(text) {
    const toast = document.createElement('div');
    toast.className = 'hud-toast hud-toast-xp';
    toast.textContent = text;
    this._enqueueToast(toast, 2000);
  }

  /**
   * Spawns an "Area discovered: [Name]" notification.
   * @param {string} text
   */
  showDiscoveryToast(text) {
    const toast = document.createElement('div');
    toast.className = 'hud-toast hud-toast-discovery';

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = '🌟';
    icon.setAttribute('aria-hidden', 'true');
    toast.appendChild(icon);

    const msg = document.createElement('span');
    msg.className = 'toast-text';
    msg.textContent = text;
    toast.appendChild(msg);

    this._enqueueToast(toast, 2800);
  }

  /**
   * Spawns a celebratory "Level Up!" banner toast.
   * @param {string} text
   */
  showLevelUpToast(text) {
    const toast = document.createElement('div');
    toast.className = 'hud-toast hud-toast-levelup';

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = '⚡';
    icon.setAttribute('aria-hidden', 'true');
    toast.appendChild(icon);

    const msg = document.createElement('span');
    msg.className = 'toast-text';
    msg.textContent = text;
    toast.appendChild(msg);

    this._enqueueToast(toast, 3200);
  }

  /**
   * Main per-frame HUD update step.
   * Coordinates compass tracking.
   */
  update() {
    if (this.compass) {
      const nearest =
        this.interactionSystem && this.interactionSystem.getNearest();
      this.compass.update(nearest ? nearest.id : null);
    }
  }

  /**
   * Disposes of child components, listeners, and DOM elements.
   */
  dispose() {
    if (this._unsubProgress) {
      this._unsubProgress();
      this._unsubProgress = null;
    }

    if (this.fastTravelMenu) {
      this.fastTravelMenu.dispose();
      this.fastTravelMenu = null;
    }

    if (this.compass) {
      this.compass.dispose();
      this.compass = null;
    }

    for (const entry of this._activeToasts) {
      clearTimeout(entry.timer);
      if (entry.element && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
    }
    this._activeToasts = [];

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export default Hud;
