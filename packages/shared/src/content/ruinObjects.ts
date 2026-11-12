import type { WorldObjectDefinition } from '../world/entities.ts';

const ruin = (id: string, name: string, examine: string, model: WorldObjectDefinition['model'], footprint?: WorldObjectDefinition['footprint']): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  ...(footprint ? { footprint } : {}),
  interactions: [],
});

export const RUIN_OBJECTS: readonly WorldObjectDefinition[] = [
  ruin('bench-toppled', 'Toppled Bench', 'A steel bench torn off its bolts and rolled onto its back. Whatever did it did not stop to sit.', 'benchToppled'),
  ruin('planter-toppled', 'Toppled Planter', 'A planter on its side, soil spilled in a fan across the floor. The plants have started to give up.', 'planterToppled'),
  ruin('barricade', 'Barricade', 'Desks, panels and a stretcher wedged together and chained to a pillar. It was built in a hurry, by people who meant it.', 'barricade'),
  ruin('debris-pile', 'Debris Pile', 'A heap of ceiling tile, conduit and broken concrete, higher than it is wide.', 'debrisPile'),
  ruin('kiosk-burnt', 'Burnt Kiosk', 'A concession kiosk gutted by fire. The shutter fused to its frame, and the notice on it is ash.', 'kioskBurnt'),
  ruin('collapsed-slab', 'Collapsed Slab', 'A section of ceiling lying where it fell, one corner still hanging from its rebar.', 'collapsedSlab', { width: 3, height: 3 }),
];
