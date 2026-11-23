/**
 * Animation Configuration & State-to-Clip Mapping.
 * Pure data definition mapping player controller kinematic states ('idle' | 'walk' | 'run' | 'jump')
 * to real animation clips in the Universal Animation Library GLB.
 *
 * Includes fallback matching candidates, target physical dimensions, model yaw offset,
 * crossfade durations, and playback timeScales tuned to eliminate foot sliding.
 */

import * as THREE from 'three';

export const ANIMATION_CONFIG = {
  // Target physical height in meters (matches world doorway & capsule proportions)
  targetHeight: 1.7,

  // Yaw orientation offset in radians (0 = model local +Z matches controller forward direction)
  modelYawOffset: 0,

  // Candidate clip names per state, checked in ordered sequence (case-insensitive & substring)
  stateClips: {
    idle: ['Idle_Loop', 'Idle_Talking_Loop', 'Idle'],
    walk: ['Walk_Loop', 'Walk_Formal_Loop', 'Walk'],
    run: ['Sprint_Loop', 'Jog_Fwd_Loop', 'Run'],
    jump: ['Jump_Start', 'Jump_Loop', 'Jump'],
  },

  // Per-state animation playback parameters
  stateSettings: {
    idle: {
      loop: THREE.LoopRepeat,
      clampWhenFinished: false,
      timeScale: 1.0,
    },
    walk: {
      loop: THREE.LoopRepeat,
      clampWhenFinished: false,
      // Walk animation cycle is 1.333s; at timeScale 1.25, stride frequency aligns with 3.5 m/s walk speed
      timeScale: 1.25,
    },
    run: {
      loop: THREE.LoopRepeat,
      clampWhenFinished: false,
      // Sprint animation cycle is 0.667s; at timeScale 1.15, stride frequency aligns with 7.0 m/s run speed
      timeScale: 1.15,
    },
    jump: {
      loop: THREE.LoopOnce,
      clampWhenFinished: true,
      // Initial leap impulse: timeScale 1.4 synchronizes with ~0.6s total airborne parabolic arc
      timeScale: 1.4,
    },
  },

  // Smooth crossfade transition durations in seconds
  crossfadeDurations: {
    'idle->walk': 0.2,
    'walk->idle': 0.2,
    'walk->run': 0.2,
    'run->walk': 0.2,
    'idle->run': 0.2,
    'run->idle': 0.2,
    'to-jump': 0.12,
    'from-jump': 0.12,
    default: 0.2,
  },
};

/**
 * Resolves an AnimationClip from a list of clips using candidate names.
 * Supports exact case-insensitive matches followed by substring matches.
 * @param {Array<THREE.AnimationClip>} clips
 * @param {Array<string>} candidateNames
 * @returns {THREE.AnimationClip|null}
 */
export function findMatchingClip(clips, candidateNames) {
  if (!clips || !candidateNames || clips.length === 0) return null;

  for (const candidate of candidateNames) {
    const target = candidate.toLowerCase();

    // 1. Exact match (case-insensitive)
    const exact = clips.find((c) => c.name.toLowerCase() === target);
    if (exact) return exact;

    // 2. Substring match (case-insensitive)
    const substring = clips.find((c) => c.name.toLowerCase().includes(target));
    if (substring) return substring;
  }

  return null;
}
