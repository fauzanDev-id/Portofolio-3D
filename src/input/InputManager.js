/**
 * Manages keyboard input tracking for character navigation.
 * Uses KeyboardEvent.code for layout-independent key mapping.
 */
export class InputManager {
  constructor() {
    this.enabled = true;

    // Set of currently held key codes
    this._heldKeys = new Set();

    // Set of key codes pressed during the current frame
    this._justPressedKeys = new Set();

    this._bindEvents();
  }

  _bindEvents() {
    this._onKeyDown = (event) => {
      // Ignore input when user is typing in forms or editable elements
      if (
        event.target &&
        (event.target.tagName === 'INPUT' ||
          event.target.tagName === 'TEXTAREA' ||
          event.target.isContentEditable)
      ) {
        return;
      }

      // Prevent default page scroll on Space and navigation arrows
      if (
        event.code === 'Space' ||
        event.code === 'ArrowUp' ||
        event.code === 'ArrowDown' ||
        event.code === 'ArrowLeft' ||
        event.code === 'ArrowRight'
      ) {
        event.preventDefault();
      }

      if (!this._heldKeys.has(event.code)) {
        this._justPressedKeys.add(event.code);
      }
      this._heldKeys.add(event.code);
    };

    this._onKeyUp = (event) => {
      this._heldKeys.delete(event.code);
    };

    this._onBlur = () => {
      this.clearHeldKeys();
    };

    this._onVisibilityChange = () => {
      if (document.hidden) {
        this.clearHeldKeys();
      }
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  /**
   * Resets all key states to prevent stuck keys on window blur or tab switch.
   */
  clearHeldKeys() {
    this._heldKeys.clear();
    this._justPressedKeys.clear();
  }

  /**
   * Returns normalized 2D movement vector:
   * x: Left (-1) / Right (+1)
   * y: Forward (+1) / Backward (-1)
   * @returns {{ x: number, y: number }}
   */
  getMovementAxis() {
    if (!this.enabled) return { x: 0, y: 0 };

    let x = 0;
    let y = 0;

    if (this._heldKeys.has('KeyA') || this._heldKeys.has('ArrowLeft')) x -= 1;
    if (this._heldKeys.has('KeyD') || this._heldKeys.has('ArrowRight')) x += 1;
    if (this._heldKeys.has('KeyW') || this._heldKeys.has('ArrowUp')) y += 1;
    if (this._heldKeys.has('KeyS') || this._heldKeys.has('ArrowDown')) y -= 1;

    // Normalize diagonal movement so diagonal travel is not faster
    if (x !== 0 && y !== 0) {
      const invLen = 1 / Math.SQRT2;
      x *= invLen;
      y *= invLen;
    }

    return { x, y };
  }

  /**
   * Returns true if sprint modifier (Shift) is held.
   * @returns {boolean}
   */
  isRunHeld() {
    if (!this.enabled) return false;
    return this._heldKeys.has('ShiftLeft') || this._heldKeys.has('ShiftRight');
  }

  /**
   * Returns true if jump (Space) is currently held.
   * @returns {boolean}
   */
  isJumpHeld() {
    if (!this.enabled) return false;
    return this._heldKeys.has('Space');
  }

  /**
   * Returns true once per press for Space (jump), clearing the flag.
   * @returns {boolean}
   */
  isJumpJustPressed() {
    if (!this.enabled) return false;
    if (this._justPressedKeys.has('Space')) {
      this._justPressedKeys.delete('Space');
      return true;
    }
    return false;
  }

  /**
   * Returns true once per press for KeyR (respawn), clearing the flag.
   * @returns {boolean}
   */
  isRespawnJustPressed() {
    if (!this.enabled) return false;
    if (this._justPressedKeys.has('KeyR')) {
      this._justPressedKeys.delete('KeyR');
      return true;
    }
    return false;
  }

  /**
   * Removes all registered event listeners.
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.clearHeldKeys();
  }
}

export default InputManager;
