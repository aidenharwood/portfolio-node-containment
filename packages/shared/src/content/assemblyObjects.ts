import type { WorldObjectDefinition } from '../world/entities.ts';

const TRAM_CAR_EXAMINE = 'A section of a Council tram car. The livery is newer than the bogies, which is true of most of the Council.';
const BRIDGE_EXAMINE = 'A bolted girder span with a grip-plate deck. The load rating has been scratched off and rewritten lower.';
const CATWALK_EXAMINE = 'A narrow mesh catwalk on a single spine girder. It sways just enough to be noticed.';

const TRAM_CAR_DOOR = 'tram-car-door';

const tramCarPiece = (id: string, name: string, model: WorldObjectDefinition['model']): WorldObjectDefinition => ({
  id,
  name,
  examine: TRAM_CAR_EXAMINE,
  model,
  blocksMovement: true,
  ...(id === TRAM_CAR_DOOR ? {} : { countsAs: TRAM_CAR_DOOR }),
  interactions: [{ verb: 'Board', effects: [{ type: 'openTramMap' }] }],
});

const deckPiece = (id: string, name: string, examine: string, model: WorldObjectDefinition['model']): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: false,
  deck: true,
  interactions: [],
});

export const ASSEMBLY_OBJECTS: readonly WorldObjectDefinition[] = [
  tramCarPiece('tram-car-nose-left', 'Tram Car', 'tramNoseLeft'),
  tramCarPiece('tram-car-nose-right', 'Tram Car', 'tramNoseRight'),
  tramCarPiece(TRAM_CAR_DOOR, 'Tram Car', 'tramDoor'),
  tramCarPiece('tram-car-window', 'Tram Car', 'tramWindow'),
  deckPiece('bridge-span', 'Bridge', BRIDGE_EXAMINE, 'bridgeSpan'),
  deckPiece('bridge-end-left', 'Bridge', BRIDGE_EXAMINE, 'bridgeEndLeft'),
  deckPiece('bridge-end-right', 'Bridge', BRIDGE_EXAMINE, 'bridgeEndRight'),
  deckPiece('catwalk-span', 'Catwalk', CATWALK_EXAMINE, 'catwalkSpan'),
  deckPiece('catwalk-end', 'Catwalk', CATWALK_EXAMINE, 'catwalkEnd'),
];
