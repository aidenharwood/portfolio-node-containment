import type { WorldObjectDefinition } from '../world/entities.ts';

export const TRANSIT_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'tram-stop',
    name: 'Tram Stop',
    examine: 'A platform pylon with a split-flap destination board. It only lists stations you have stood in yourself, which the Council calls a security feature.',
    model: 'tramStop',
    blocksMovement: true,
    light: { radius: 2.5, color: '#4fd8ff', intensity: 0.55 },
    interactions: [{ verb: 'Board', effects: [{ type: 'openTramMap' }] }],
  },
];
