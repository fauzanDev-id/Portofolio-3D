/**
 * Modal dialog rendering portfolio sections based on section type.
 * Built with document.createElement and textContent to prevent injection vulnerabilities.
 * Implements accessible modal semantics (role="dialog", focus trapping, Escape handling).
 */

export class InfoPanel {
  /**
   * @param {HTMLElement} [container=document.body] - Parent container element
   */
  constructor(container = document.body) {
    this.container = container;
    this.openState = false;
    this._closeCallbacks = new Set();
    this._previousActiveElement = null;

    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    // Dimmed backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'info-panel-backdrop';
    this.backdrop.className = 'info-panel-backdrop hidden';

    // Modal dialog container
    this.panel = document.createElement('div');
    this.panel.id = 'info-panel';
    this.panel.className = 'info-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-labelledby', 'info-panel-title');
    this.panel.setAttribute('aria-describedby', 'info-panel-subtitle');

    // Close button (X)
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'info-panel-close';
    this.closeBtn.setAttribute('aria-label', 'Close dialog');
    this.closeBtn.textContent = '×';
    this.panel.appendChild(this.closeBtn);

    // Header
    this.header = document.createElement('div');
    this.header.className = 'info-panel-header';

    this.iconElement = document.createElement('div');
    this.iconElement.className = 'info-panel-icon';

    this.titlesWrap = document.createElement('div');
    this.titlesWrap.className = 'info-panel-titles';

    this.titleElement = document.createElement('h2');
    this.titleElement.id = 'info-panel-title';
    this.titleElement.className = 'info-panel-title';

    this.subtitleElement = document.createElement('p');
    this.subtitleElement.id = 'info-panel-subtitle';
    this.subtitleElement.className = 'info-panel-subtitle';

    this.titlesWrap.appendChild(this.titleElement);
    this.titlesWrap.appendChild(this.subtitleElement);

    this.header.appendChild(this.iconElement);
    this.header.appendChild(this.titlesWrap);
    this.panel.appendChild(this.header);

    // Scrollable content body
    this.body = document.createElement('div');
    this.body.className = 'info-panel-body';
    this.panel.appendChild(this.body);

    this.backdrop.appendChild(this.panel);
    this.container.appendChild(this.backdrop);
  }

  _bindEvents() {
    // Close on X button click
    this.closeBtn.addEventListener('click', () => this.close());

    // Close on backdrop click (outside panel)
    this.backdrop.addEventListener('click', (event) => {
      if (event.target === this.backdrop) {
        this.close();
      }
    });

    // Prevent wheel zoom propagation into the 3D canvas
    this.panel.addEventListener(
      'wheel',
      (event) => {
        event.stopPropagation();
      },
      { passive: false }
    );

    // Accessible keyboard handling (Escape to close, Tab trapping)
    this._onKeyDown = (event) => {
      if (!this.openState) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }

      if (event.key === 'Tab') {
        this._trapFocus(event);
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  _trapFocus(event) {
    const focusableSelectors =
      'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      this.panel.querySelectorAll(focusableSelectors)
    );

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /**
   * Validates URLs to permit only safe navigation protocols (http, https, mailto).
   * @param {string} url
   * @returns {boolean}
   */
  _isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    const lower = url.trim().toLowerCase();
    return (
      lower.startsWith('https://') ||
      lower.startsWith('http://') ||
      lower.startsWith('mailto:')
    );
  }

  /**
   * Opens the modal dialog with content from the given portfolio section.
   * @param {object} section - Section configuration object from portfolio.js
   */
  open(section) {
    if (!section) return;

    this._previousActiveElement = document.activeElement;

    // Set header contents
    this.iconElement.textContent = section.icon || '📄';
    this.titleElement.textContent = section.title || 'Information';
    this.subtitleElement.textContent = section.subtitle || '';

    // Clear previous body contents
    while (this.body.firstChild) {
      this.body.removeChild(this.body.firstChild);
    }

    // Render section by type
    switch (section.type) {
      case 'about':
        this._renderAbout(section);
        break;
      case 'skills':
        this._renderSkills(section);
        break;
      case 'projects':
        this._renderProjects(section);
        break;
      case 'timeline':
        this._renderTimeline(section);
        break;
      case 'links':
        this._renderLinks(section);
        break;
      default:
        this._renderGeneric(section);
        break;
    }

    this.backdrop.classList.remove('hidden');
    this.openState = true;

    // Reset scroll to top
    this.body.scrollTop = 0;

    // Move initial focus to close button
    setTimeout(() => {
      this.closeBtn.focus();
    }, 50);
  }

  /**
   * Closes the modal dialog and returns focus.
   */
  close() {
    if (!this.openState) return;

    this.backdrop.classList.add('hidden');
    this.openState = false;

    // Return focus to previously active element or document body
    if (this._previousActiveElement && typeof this._previousActiveElement.focus === 'function') {
      this._previousActiveElement.focus();
    }

    for (const callback of this._closeCallbacks) {
      callback();
    }
  }

  /**
   * Registers a callback fired when the panel is closed.
   * @param {Function} callback
   */
  onClose(callback) {
    if (typeof callback === 'function') {
      this._closeCallbacks.add(callback);
    }
  }

  /**
   * Returns true if the modal panel is currently visible.
   * @returns {boolean}
   */
  isOpen() {
    return this.openState;
  }

  // ========================================================================
  // Content Renderers (strictly createElement + textContent)
  // ========================================================================

  _renderAbout(section) {
    if (Array.isArray(section.bio)) {
      for (const text of section.bio) {
        const p = document.createElement('p');
        p.className = 'about-p';
        p.textContent = text;
        this.body.appendChild(p);
      }
    }

    if (Array.isArray(section.facts) && section.facts.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'facts-grid';

      for (const fact of section.facts) {
        const card = document.createElement('div');
        card.className = 'fact-card';

        const label = document.createElement('span');
        label.className = 'fact-label';
        label.textContent = fact.label;

        const val = document.createElement('span');
        val.className = 'fact-value';
        val.textContent = fact.value;

        card.appendChild(label);
        card.appendChild(val);
        grid.appendChild(card);
      }

      this.body.appendChild(grid);
    }
  }

  _renderSkills(section) {
    if (!Array.isArray(section.groups)) return;

    for (const group of section.groups) {
      const groupEl = document.createElement('div');
      groupEl.className = 'skill-group';

      const title = document.createElement('h3');
      title.className = 'skill-group-title';
      title.textContent = group.name;
      groupEl.appendChild(title);

      const list = document.createElement('div');
      list.className = 'skills-list';

      if (Array.isArray(group.items)) {
        for (const item of group.items) {
          const itemEl = document.createElement('div');
          itemEl.className = 'skill-item';

          const info = document.createElement('div');
          info.className = 'skill-info';

          const name = document.createElement('span');
          name.className = 'skill-name';
          name.textContent = item.name;
          info.appendChild(name);

          if (typeof item.level === 'number') {
            const pct = document.createElement('span');
            pct.className = 'skill-pct';
            pct.textContent = `${item.level}%`;
            info.appendChild(pct);
          }
          itemEl.appendChild(info);

          if (typeof item.level === 'number') {
            const bar = document.createElement('div');
            bar.className = 'skill-bar';

            const fill = document.createElement('div');
            fill.className = 'skill-fill';
            const clamped = Math.max(0, Math.min(100, item.level));
            fill.style.width = `${clamped}%`;

            bar.appendChild(fill);
            itemEl.appendChild(bar);
          }

          list.appendChild(itemEl);
        }
      }

      groupEl.appendChild(list);
      this.body.appendChild(groupEl);
    }
  }

  _renderProjects(section) {
    if (!Array.isArray(section.projects)) return;

    for (const proj of section.projects) {
      const card = document.createElement('article');
      card.className = 'project-card';

      const title = document.createElement('h3');
      title.className = 'project-title';
      title.textContent = proj.title;
      card.appendChild(title);

      const desc = document.createElement('p');
      desc.className = 'project-desc';
      desc.textContent = proj.description;
      card.appendChild(desc);

      if (Array.isArray(proj.tech) && proj.tech.length > 0) {
        const chips = document.createElement('div');
        chips.className = 'tech-chips';
        for (const tag of proj.tech) {
          const chip = document.createElement('span');
          chip.className = 'tech-chip';
          chip.textContent = tag;
          chips.appendChild(chip);
        }
        card.appendChild(chips);
      }

      if (Array.isArray(proj.links) && proj.links.length > 0) {
        const linksRow = document.createElement('div');
        linksRow.className = 'project-links';

        for (const link of proj.links) {
          if (this._isSafeUrl(link.url)) {
            const btn = document.createElement('a');
            btn.className = 'ui-button';
            btn.href = link.url;
            btn.target = '_blank';
            btn.rel = 'noopener noreferrer';
            btn.textContent = link.label || 'View Link';
            linksRow.appendChild(btn);
          }
        }

        card.appendChild(linksRow);
      }

      this.body.appendChild(card);
    }
  }

  _renderTimeline(section) {
    if (!Array.isArray(section.items)) return;

    const list = document.createElement('div');
    list.className = 'timeline-list';

    for (const item of section.items) {
      const row = document.createElement('div');
      row.className = 'timeline-item';

      const marker = document.createElement('div');
      marker.className = 'timeline-marker';
      row.appendChild(marker);

      const content = document.createElement('div');
      content.className = 'timeline-content';

      const header = document.createElement('div');
      header.className = 'timeline-header';

      const title = document.createElement('h3');
      title.className = 'timeline-title';
      title.textContent = item.title;
      header.appendChild(title);

      if (item.period) {
        const period = document.createElement('span');
        period.className = 'timeline-period';
        period.textContent = item.period;
        header.appendChild(period);
      }
      content.appendChild(header);

      if (item.organization) {
        const org = document.createElement('div');
        org.className = 'timeline-org';
        org.textContent = item.organization;
        content.appendChild(org);
      }

      if (item.description) {
        const desc = document.createElement('p');
        desc.className = 'timeline-desc';
        desc.textContent = item.description;
        content.appendChild(desc);
      }

      row.appendChild(content);
      list.appendChild(row);
    }

    this.body.appendChild(list);
  }

  _renderLinks(section) {
    if (!Array.isArray(section.items)) return;

    const grid = document.createElement('div');
    grid.className = 'links-grid';

    for (const item of section.items) {
      if (!this._isSafeUrl(item.url)) continue;

      const a = document.createElement('a');
      a.className = 'contact-card';
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      const icon = document.createElement('span');
      icon.className = 'contact-icon';
      icon.textContent = item.icon || '🔗';
      a.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'contact-info';

      const label = document.createElement('div');
      label.className = 'contact-label';
      label.textContent = item.label;
      info.appendChild(label);

      if (item.description) {
        const desc = document.createElement('div');
        desc.className = 'contact-desc';
        desc.textContent = item.description;
        info.appendChild(desc);
      }
      a.appendChild(info);

      const arrow = document.createElement('span');
      arrow.className = 'external-arrow';
      arrow.textContent = '↗';
      a.appendChild(arrow);

      grid.appendChild(a);
    }

    this.body.appendChild(grid);
  }

  _renderGeneric(section) {
    const p = document.createElement('p');
    p.className = 'about-p';
    p.textContent = 'Details coming soon.';
    this.body.appendChild(p);
  }

  /**
   * Cleans up DOM elements and listeners.
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    if (this.backdrop && this.backdrop.parentElement) {
      this.backdrop.parentElement.removeChild(this.backdrop);
    }
    this._closeCallbacks.clear();
  }
}

export default InfoPanel;
