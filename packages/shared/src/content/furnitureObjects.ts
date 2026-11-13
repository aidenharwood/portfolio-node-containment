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
  furniture('bookcase', 'Bookcase', 'Timber shelving full of bound reports, all the same grey cloth. The spines are numbered, not titled.', 'bookcase'),
  furniture('armchair', 'Armchair', 'A heavy upholstered chair, worn shiny where a thousand shift-ends have sat in it.', 'armchair'),
  furniture('serving-counter', 'Serving Counter', 'A steel counter with warming trays. Today is something brown, as it was yesterday.', 'servingCounter'),
  furniture('cook-range', 'Cooking Range', 'A six-ring range and a pot big enough to bathe in. Something in it is still simmering.', 'cookRange'),
  furniture('washer', 'Industrial Washer', 'A drum washer the size of a wardrobe. Through the porthole, grey sheets turn and turn.', 'washer'),
  furniture('water-cooler', 'Water Cooler', 'Filtered water, slightly blue. The cups ran out in the first week of the breach.', 'waterCooler'),
];
