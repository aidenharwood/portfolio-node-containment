export const TILE_KIND_IDS = [
  'void',
  'wall',
  'glass',
  'door',
  'plating',
  'concrete',
  'grate',
  'rust',
  'carpet',
  'hazard',
  'coolant',
  'soil',
  'track',
  'terrazzo',
  'ceramic',
  'boards',
  'grass',
  'dirt',
  'gravel',
  'asphalt',
  'water',
  'rock',
  'trees',
  'fence',
  'barrier',
  'brick',
  'blockwork',
  'cladding',
  'paving',
] as const;

export type TileKindId = (typeof TILE_KIND_IDS)[number];

export type TileStructure = 'void' | 'wall' | 'floor' | 'liquid';

export interface TileKind {
  readonly id: TileKindId;
  readonly structure: TileStructure;
  readonly walkable: boolean;
}

export const TILE_KINDS: Readonly<Record<TileKindId, TileKind>> = {
  void: { id: 'void', structure: 'void', walkable: false },
  wall: { id: 'wall', structure: 'wall', walkable: false },
  glass: { id: 'glass', structure: 'wall', walkable: false },
  door: { id: 'door', structure: 'floor', walkable: true },
  plating: { id: 'plating', structure: 'floor', walkable: true },
  concrete: { id: 'concrete', structure: 'floor', walkable: true },
  grate: { id: 'grate', structure: 'floor', walkable: true },
  rust: { id: 'rust', structure: 'floor', walkable: true },
  carpet: { id: 'carpet', structure: 'floor', walkable: true },
  hazard: { id: 'hazard', structure: 'floor', walkable: true },
  coolant: { id: 'coolant', structure: 'liquid', walkable: false },
  soil: { id: 'soil', structure: 'floor', walkable: true },
  track: { id: 'track', structure: 'floor', walkable: false },
  terrazzo: { id: 'terrazzo', structure: 'floor', walkable: true },
  ceramic: { id: 'ceramic', structure: 'floor', walkable: true },
  boards: { id: 'boards', structure: 'floor', walkable: true },
  grass: { id: 'grass', structure: 'floor', walkable: true },
  dirt: { id: 'dirt', structure: 'floor', walkable: true },
  gravel: { id: 'gravel', structure: 'floor', walkable: true },
  asphalt: { id: 'asphalt', structure: 'floor', walkable: true },
  water: { id: 'water', structure: 'liquid', walkable: false },
  rock: { id: 'rock', structure: 'wall', walkable: false },
  trees: { id: 'trees', structure: 'wall', walkable: false },
  fence: { id: 'fence', structure: 'wall', walkable: false },
  barrier: { id: 'barrier', structure: 'wall', walkable: false },
  brick: { id: 'brick', structure: 'wall', walkable: false },
  blockwork: { id: 'blockwork', structure: 'wall', walkable: false },
  cladding: { id: 'cladding', structure: 'wall', walkable: false },
  paving: { id: 'paving', structure: 'floor', walkable: true },
};

export const MAP_LEGEND: Readonly<Record<string, TileKindId>> = {
  ' ': 'void',
  '#': 'wall',
  W: 'glass',
  D: 'door',
  '.': 'plating',
  ',': 'concrete',
  '=': 'grate',
  '%': 'rust',
  _: 'carpet',
  '!': 'hazard',
  '~': 'coolant',
  ':': 'soil',
  T: 'track',
  ';': 'terrazzo',
  '+': 'ceramic',
  '-': 'boards',
  '"': 'grass',
  '`': 'dirt',
  '*': 'gravel',
  '^': 'asphalt',
  w: 'water',
  R: 'rock',
  Y: 'trees',
  '|': 'fence',
  B: 'barrier',
  K: 'brick',
  Q: 'blockwork',
  C: 'cladding',
  P: 'paving',
};

export const EDGE_TILE_KINDS = ['barrier', 'rock', 'trees', 'fence'] as const;

export type EdgeTileKindId = (typeof EDGE_TILE_KINDS)[number];

export const OUTDOOR_FLOORS: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'gravel', 'asphalt', 'paving', 'water']);

export const isOutdoorFloor = (kind: TileKindId): boolean => OUTDOOR_FLOORS.has(kind);

export const WALL_MATERIALS = ['wall', 'brick', 'blockwork', 'cladding'] as const;

export type WallMaterialId = (typeof WALL_MATERIALS)[number];

const WALL_MATERIAL_SET: ReadonlySet<TileKindId> = new Set<TileKindId>(WALL_MATERIALS);

export const isBuildingWall = (kind: TileKindId): kind is WallMaterialId => WALL_MATERIAL_SET.has(kind);
