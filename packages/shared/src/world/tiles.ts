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
};
