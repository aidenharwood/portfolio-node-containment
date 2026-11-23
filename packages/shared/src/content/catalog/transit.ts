import type { WorldObjectDefinition } from '../../world/entities.ts';
import type { AssemblyDefinition } from '../../world/assemblies.ts';
import type { FurnishingKit } from '../furnishingKit.ts';

const TRAM_CAR_EXAMINE = 'A car of the Span Transit maglev, Directorate white with a cyan stripe. It hangs a hand above the guideway on nothing at all, and hums when you lean on it.';
const BRIDGE_EXAMINE = 'A bolted girder span with a grip-plate deck, laid by the Directorate over a gap the precursors left open. The load rating has been scratched off and rewritten lower.';
const CATWALK_EXAMINE = 'A narrow mesh catwalk on a single spine girder, Directorate issue. It sways just enough to be noticed.';

const TRAM_CAR_DOOR = 'tram-car-door';

const tramCarPiece = (id: string, model: WorldObjectDefinition['model']): WorldObjectDefinition => ({
  id,
  name: 'Span Transit Car',
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

export const DEPARTURE_BOARD: WorldObjectDefinition = {
  id: 'departure-board',
  name: 'Departure Board',
  examine: 'A Span Transit board of cyan departures, spinward and anti-spinward. The status column is the only part that changes, and only between two words.',
  model: 'departureBoard',
  blocksMovement: false,
  footprint: { width: 3, height: 1 },
  light: { radius: 2, color: '#4fe3ff', intensity: 0.3 },
  furnishing: { mount: 'wall', homes: ['transit'] },
  interactions: [],
};

export const TRANSIT_OBJECTS: readonly WorldObjectDefinition[] = [
  tramCarPiece('tram-car-nose-left', 'tramNoseLeft'),
  tramCarPiece('tram-car-nose-right', 'tramNoseRight'),
  tramCarPiece(TRAM_CAR_DOOR, 'tramDoor'),
  tramCarPiece('tram-car-window', 'tramWindow'),
  deckPiece('bridge-span', 'Bridge', BRIDGE_EXAMINE, 'bridgeSpan'),
  deckPiece('bridge-end-left', 'Bridge', BRIDGE_EXAMINE, 'bridgeEndLeft'),
  deckPiece('bridge-end-right', 'Bridge', BRIDGE_EXAMINE, 'bridgeEndRight'),
  deckPiece('catwalk-span', 'Catwalk', CATWALK_EXAMINE, 'catwalkSpan'),
  deckPiece('catwalk-end', 'Catwalk', CATWALK_EXAMINE, 'catwalkEnd'),
  DEPARTURE_BOARD,
];

export const TRAM_CAR: AssemblyDefinition = {
  id: 'tram-car',
  name: 'Span Transit Car',
  pieces: {
    L: { objectId: 'tram-car-nose-left' },
    R: { objectId: 'tram-car-nose-right' },
    D: { objectId: TRAM_CAR_DOOR },
    W: { objectId: 'tram-car-window' },
    l: { objectId: 'tram-car-nose-left', turns: 2 },
    r: { objectId: 'tram-car-nose-right', turns: 2 },
    d: { objectId: TRAM_CAR_DOOR, turns: 2 },
    w: { objectId: 'tram-car-window', turns: 2 },
  },
  layout: ['rdwwdl', 'LDWWDR'],
};

export const BRIDGE: AssemblyDefinition = {
  id: 'bridge',
  name: 'Bridge',
  pieces: {
    L: { objectId: 'bridge-end-left' },
    R: { objectId: 'bridge-end-right' },
    l: { objectId: 'bridge-end-left', turns: 2 },
    r: { objectId: 'bridge-end-right', turns: 2 },
    s: { objectId: 'bridge-span' },
    S: { objectId: 'bridge-span', turns: 2 },
  },
  layout: ['LR', 'sS', 'rl'],
  stretchRow: 1,
};

export const CATWALK: AssemblyDefinition = {
  id: 'catwalk',
  name: 'Catwalk',
  pieces: {
    E: { objectId: 'catwalk-end' },
    e: { objectId: 'catwalk-end', turns: 2 },
    c: { objectId: 'catwalk-span' },
  },
  layout: ['E', 'c', 'e'],
  stretchRow: 1,
};

export const TRANSIT_ASSEMBLIES: readonly AssemblyDefinition[] = [TRAM_CAR, BRIDGE, CATWALK];

export const TRANSIT_KIT: FurnishingKit = {
  objects: [DEPARTURE_BOARD],
  prefabs: [],
  signatures: {},
};
