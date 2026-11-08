import type { WorldObjectDefinition } from '../world/entities.ts';

const litter = (id: string, name: string, examine: string, model: WorldObjectDefinition['model']): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: false,
  interactions: [],
});

export const LITTER_OBJECTS: readonly WorldObjectDefinition[] = [
  litter('litter-papers', 'Loose Papers', 'Duty rosters and incident forms, all filled in, none filed.', 'litterPapers'),
  litter('litter-debris', 'Debris', 'Ceiling tile, a bent bracket and a handful of bolts that used to hold something up.', 'litterDebris'),
  litter('litter-puddle', 'Coolant Puddle', 'A slick of coolant with a faint glow. Someone has walked through it more than once.', 'litterPuddle'),
  litter('cable-run', 'Cable Run', 'A bundle of power and data lines taped to the floor. The tape has given up in places.', 'cableRun'),
  litter('cable-run-end', 'Cable Run', 'A bundle of power and data lines ending in a scorched junction plug.', 'cableRunEnd'),
];
