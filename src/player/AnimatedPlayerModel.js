/**
 * Skinned & Animated Player Character Model.
 * Wraps loaded GLTF hierarchy, normalizes height and root origin,
 * and coordinates skeletal animation state blending (idle, walk, run, jump)
 * using Three.js AnimationMixer.
 *
 * Implements the identical public interface as PlayerModel (group, setState, update, dispose)
 * allowing seamless runtime hot-swapping from the placeholder capsule.
 */

import * as THREE from 'three';
import {
  ANIMATION_CONFIG,
  findMatchingClip,
} from './animationConfig.js';

export class AnimatedPlayerModel {
  /**
   * @param {object} gltf - Resolved GLTF object from AssetLoader
   * @param {object} [config] - Animation & normalization configuration
   */
  constructor(gltf, config = ANIMATION_CONFIG) {
    this.config = config || ANIMATION_CONFIG;
    this.gltf = gltf;

    // Root group representing character world transform (feet origin at y = 0)
    this.group = new THREE.Group();
    this.group.name = 'animated_player_root';

    // Internal sub-group for physical scaling and orientation adjustments
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.name = 'player_skinned_body';
    this.group.add(this.bodyGroup);

    this._state = null;
    this._currentAction = null;
    this._actions = new Map();
    this._disposables = [];

    this._initModel();
    this._initAnimations();

    // Default to idle state
    this.setState('idle');
  }

  /**
   * Normalizes model dimensions, aligns feet to local y=0 ground level,
   * configures shadow casting, and validates material color spaces.
   * @private
   */
  _initModel() {
    // Clone or add scene into local body group
    const sceneRoot = this.gltf.scene;
    this.bodyGroup.add(sceneRoot);

    // Compute original unscaled bounding box
    const box = new THREE.Box3().setFromObject(sceneRoot);
    const size = new THREE.Vector3();
    box.getSize(size);

    const originalHeight = size.y || 1.8287;
    const targetHeight = this.config.targetHeight || 1.7;
    const scale = targetHeight / originalHeight;

    // Apply uniform scaling
    this.bodyGroup.scale.set(scale, scale, scale);

    // Align feet exactly to local y = 0
    // If bounding box base is offset from model pivot, translate bodyGroup accordingly
    this.bodyGroup.position.y = -box.min.y * scale;

    // Apply facing yaw offset so character forward matches controller local +Z convention
    const yawOffset = this.config.modelYawOffset || 0;
    this.bodyGroup.rotation.y = yawOffset;

    // Configure skinned meshes and materials
    this.bodyGroup.traverse((obj) => {
      if (obj.isSkinnedMesh) {
        obj.castShadow = true;
        // Turn off receiveShadow on character to prevent harsh self-shadow banding artifacts
        obj.receiveShadow = false;
        // Disable frustum culling to prevent meshes popping out when bounds shift during animations
        obj.frustumCulled = false;
        this._disposables.push(obj.geometry);
      }

      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;

          // Prevent character materials from over-blooming into white haze under post-processing
          if (mat.emissive && mat.emissive.getHex() > 0) {
            mat.emissiveIntensity = Math.min(mat.emissiveIntensity || 1.0, 1.0);
          }
          this._disposables.push(mat);
        }
      }
    });
  }

  /**
   * Sets up Three.js AnimationMixer and maps logical states to real GLB animation clips.
   * @private
   */
  _initAnimations() {
    const clips = this.gltf.animations || [];
    this.mixer = new THREE.AnimationMixer(this.bodyGroup);

    const states = ['idle', 'walk', 'run', 'jump'];
    for (const state of states) {
      const candidateNames = this.config.stateClips[state] || [state];
      const clip = findMatchingClip(clips, candidateNames);

      if (clip) {
        const action = this.mixer.clipAction(clip);
        const settings = this.config.stateSettings[state] || {};

        action.setLoop(
          settings.loop ?? THREE.LoopRepeat,
          settings.loop === THREE.LoopOnce ? 1 : Infinity
        );
        action.clampWhenFinished = settings.clampWhenFinished ?? false;
        action.timeScale = settings.timeScale ?? 1.0;

        this._actions.set(state, action);
      }
    }
  }

  /**
   * Resolves transition crossfade duration between two states.
   * @param {string|null} fromState
   * @param {string} toState
   * @returns {number} Duration in seconds
   * @private
   */
  _getCrossfadeDuration(fromState, toState) {
    if (!fromState) return 0.0;
    const key = `${fromState}->${toState}`;
    const durations = this.config.crossfadeDurations || {};

    if (durations[key] !== undefined) {
      return durations[key];
    }
    if (toState === 'jump' && durations['to-jump'] !== undefined) {
      return durations['to-jump'];
    }
    if (fromState === 'jump' && durations['from-jump'] !== undefined) {
      return durations['from-jump'];
    }
    return durations.default ?? 0.2;
  }

  /**
   * Returns current active animation state.
   * @returns {string|null}
   */
  getState() {
    return this._state;
  }

  /**
   * Returns root 3D Object representing character in world space.
   * @returns {THREE.Group}
   */
  getObject3D() {
    return this.group;
  }

  /**
   * Switches character animation state ('idle' | 'walk' | 'run' | 'jump').
   * Crossfades smoothly from previous state; ignores duplicate calls to prevent restarts.
   * @param {string} nextState
   */
  setState(nextState) {
    if (nextState === this._state) return;

    const nextAction = this._actions.get(nextState);
    if (!nextAction) {
      this._state = nextState;
      return;
    }

    const prevAction = this._currentAction;
    const prevState = this._state;
    const duration = this._getCrossfadeDuration(prevState, nextState);
    const settings = this.config.stateSettings[nextState] || {};

    if (nextState === 'jump') {
      // Leap action must always begin cleanly from frame 0
      nextAction.reset();
      nextAction.timeScale = settings.timeScale ?? 1.4;
    }

    if (prevAction && prevAction !== nextAction) {
      nextAction.enabled = true;
      nextAction.setEffectiveTimeScale(settings.timeScale ?? 1.0);
      nextAction.setEffectiveWeight(1.0);
      nextAction.crossFadeFrom(prevAction, duration, true);
      nextAction.play();
    } else {
      nextAction.reset();
      nextAction.play();
    }

    this._state = nextState;
    this._currentAction = nextAction;
  }

  /**
   * Per-frame animation tick. Zero runtime heap allocations.
   * @param {number} delta - Frame delta in seconds
   */
  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  /**
   * Tears down mixer, actions, geometries, and materials.
   */
  dispose() {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.bodyGroup);
      this.mixer = null;
    }

    this._actions.clear();
    this._currentAction = null;

    if (this.bodyGroup && this.bodyGroup.parent) {
      this.bodyGroup.parent.remove(this.bodyGroup);
    }

    for (const item of this._disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    this._disposables.length = 0;
  }
}

export default AnimatedPlayerModel;
