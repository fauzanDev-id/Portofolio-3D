/**
 * Pure layout configuration for the 3D island world.
 * Contains no Three.js imports so it can be safely used in headless or test environments.
 * 1 unit = 1 meter.
 */

export const worldLayout = {
  island: {
    radius: 45,
    groundColor: 0x55a630,
    sandColor: 0xe9d8a6,
    waterColor: 0x0077b6,
  },

  spawn: {
    x: 0,
    z: 2,
  },

  plaza: {
    radius: 7,
    color: 0xd4a373,
  },

  // Six distinct buildings arranged in a ring at distance ~26m from the plaza center,
  // facing inward toward (0, 0) with entrances on the plaza-facing side.
  buildings: [
    {
      id: 'developer-house',
      poiId: 'developer-house',
      label: 'Developer House',
      position: { x: 0, z: -26 },
      size: { w: 9, h: 6, d: 8 },
      rotationY: 0,
      color: 0x3a86ff,
      roofColor: 0x1d3557,
      interactionRadius: 4.5,
      // Offset from building position toward plaza (local +Z is forward facing South)
      entrance: { x: 0, z: 6 },
    },
    {
      id: 'skills',
      poiId: 'skills',
      label: 'Skills & Tech',
      position: { x: 22.5, z: -13 },
      size: { w: 8, h: 5.5, d: 8 },
      rotationY: -1.0472, // -60 degrees, facing (0,0)
      color: 0x8338ec,
      roofColor: 0x3a0ca3,
      interactionRadius: 4.5,
      entrance: { x: -5.19, z: 3.0 },
    },
    {
      id: 'projects',
      poiId: 'projects',
      label: 'Featured Projects',
      position: { x: 22.5, z: 13 },
      size: { w: 10, h: 6.5, d: 9 },
      rotationY: -2.0944, // -120 degrees, facing (0,0)
      color: 0xe63946,
      roofColor: 0x9b2226,
      interactionRadius: 4.5,
      entrance: { x: -5.63, z: -3.25 },
    },
    {
      id: 'experience',
      poiId: 'experience',
      label: 'Work Experience',
      position: { x: 0, z: 26 },
      size: { w: 9, h: 6, d: 8 },
      rotationY: 3.1416, // 180 degrees, facing (0,0)
      color: 0xf4a261,
      roofColor: 0xbc6c25,
      interactionRadius: 4.5,
      entrance: { x: 0, z: -6 },
    },
    {
      id: 'education',
      poiId: 'education',
      label: 'Education & Certs',
      position: { x: -22.5, z: 13 },
      size: { w: 8, h: 5.5, d: 8 },
      rotationY: 2.0944, // 120 degrees, facing (0,0)
      color: 0x2a9d8f,
      roofColor: 0x1b4332,
      interactionRadius: 4.5,
      entrance: { x: 5.19, z: -3.0 },
    },
    {
      id: 'contact',
      poiId: 'contact',
      label: 'Contact & Links',
      position: { x: -22.5, z: -13 },
      size: { w: 8, h: 5, d: 8 },
      rotationY: 1.0472, // 60 degrees, facing (0,0)
      color: 0xffb703,
      roofColor: 0xd48b00,
      interactionRadius: 4.5,
      entrance: { x: 5.19, z: 3.0 },
    },
  ],

  // Direct pathways connecting the central plaza border to each building's entrance point
  pathsColor: 0xcca878,
  paths: [
    {
      start: { x: 0, z: -7 },
      end: { x: 0, z: -20 },
      width: 2.8,
    },
    {
      start: { x: 6.06, z: -3.5 },
      end: { x: 17.31, z: -10.0 },
      width: 2.8,
    },
    {
      start: { x: 6.06, z: 3.5 },
      end: { x: 16.87, z: 9.75 },
      width: 2.8,
    },
    {
      start: { x: 0, z: 7 },
      end: { x: 0, z: 20 },
      width: 2.8,
    },
    {
      start: { x: -6.06, z: 3.5 },
      end: { x: -17.31, z: 10.0 },
      width: 2.8,
    },
    {
      start: { x: -6.06, z: -3.5 },
      end: { x: -17.31, z: -10.0 },
      width: 2.8,
    },
  ],

  // Procedural tree scattering parameters
  trees: {
    count: 45,
    minDistanceFromBuildings: 6.0,
    minDistanceFromPaths: 3.2,
    minDistanceFromPlaza: 8.5,
    maxDistanceFromCenter: 39,
    seed: 42,
  },

  // Optional decorative rocks parameters
  rocks: {
    count: 22,
    minDistanceFromBuildings: 5.0,
    minDistanceFromPaths: 2.8,
    minDistanceFromPlaza: 8.0,
    maxDistanceFromCenter: 40,
    seed: 99,
  },
};

export default worldLayout;
