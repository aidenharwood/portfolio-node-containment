import type { WorldObjectDefinition } from '../world/entities.ts';

export const TRANSIT_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'tram-stop',
    name: 'Tram Stop',
    examine: 'A platform pylon with a split-flap destination board. The tram itself keeps the real list, which only shows stations you have stood in yourself.',
    model: 'tramStop',
    blocksMovement: true,
    light: { radius: 2.5, color: '#4fd8ff', intensity: 0.55 },
    interactions: [],
  },
];
