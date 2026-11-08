import type { WorldObjectDefinition } from '../world/entities.ts';

const furniture = (id: string, name: string, examine: string, model: WorldObjectDefinition['model'], blocksMovement = true): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement,
  interactions: [],
});

export const FURNITURE_OBJECTS: readonly WorldObjectDefinition[] = [
  furniture('office-desk', 'Desk', 'A steel desk with a terminal that has been asleep since the last audit. The chair is still warm, somehow.', 'officeDesk'),
  furniture('wall-shelf', 'Wall Shelf', 'Bolted shelving holding binders, sample tins and a mug nobody admits to owning.', 'wallShelf', false),
  furniture('filing-cabinet', 'Filing Cabinets', 'Two cabinets of paper records. One drawer never quite closes, and the label on it has been scratched off.', 'filingCabinet'),
  furniture('storage-rack', 'Storage Rack', 'Open steel racking stacked with crates, canisters and cable spools. The weight limit sign is under one of the crates.', 'storageRack'),
  furniture('notice-board', 'Notice Board', 'Safety notices, a duty rota and a lost-and-found card asking after a left boot. The boot is circled in red.', 'noticeBoard', false),
  furniture('water-cooler', 'Water Cooler', 'Filtered water, slightly blue. The cups ran out in the first week of the breach.', 'waterCooler'),
];
