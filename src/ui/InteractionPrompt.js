/**
 * DOM floating interaction prompt displaying the interaction shortcut key (E).
 * Uses textContent exclusively to guarantee security and prevent layout injection.
 */
export class InteractionPrompt {
  /**
   * @param {HTMLElement} [container=document.body] - Parent container element
   */
  constructor(container = document.body) {
    this.container = container;
    this.visible = false;

    this._createDOM();
  }

  _createDOM() {
    this.element = document.createElement('div');
    this.element.id = 'interaction-prompt';
    this.element.className = 'interaction-prompt hidden';
    this.element.setAttribute('aria-live', 'polite');

    // Styled keyboard key indicator
    this.keyElement = document.createElement('kbd');
    this.keyElement.className = 'prompt-key';
    this.keyElement.textContent = 'E';

    // Text description span
    this.textElement = document.createElement('span');
    this.textElement.className = 'prompt-text';
    this.textElement.textContent = 'Interact';

    this.element.appendChild(this.keyElement);
    this.element.appendChild(this.textElement);

    this.container.appendChild(this.element);
  }

  /**
   * Shows the prompt with the specified POI label.
   * @param {string} label
   */
  show(label) {
    this.textElement.textContent = `Interact — ${label}`;
    this.element.classList.remove('hidden');
    this.visible = true;
  }

  /**
   * Hides the interaction prompt.
   */
  hide() {
    this.element.classList.add('hidden');
    this.visible = false;
  }

  /**
   * Removes element from DOM.
   */
  dispose() {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}

export default InteractionPrompt;
