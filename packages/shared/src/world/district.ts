import type { CreatureId } from '../combat/creatures.ts';
import type { AreaId, InstanceId, NpcId, WorldObjectId, DistrictId, RegionId } from '../ids.ts';
import { tileKey, type Facing, type TilePoint, type TileRect } from './geometry.ts';
import type { CompositionName } from '../content/compositions.ts';
import type { Condition } from '../content/conditions.ts';
import type { PrefabRole } from '../content/prefabs/types.ts';
import type { AssemblyPlacement } from './assemblies.ts';
import type { FloorDecal } from './decals.ts';
import type { DistrictExit } from './blueprint.ts';
import type { WorldObjectDefinition } from './entities.ts';
import { objectFootprintTiles } from './footprint.ts';
import type { WalkabilityGrid } from './pathfinding.ts';
import { MAP_LEGEND, TILE_KINDS, type TileKindId } from './tiles.ts';

export interface AreaDefinition {
  readonly id: AreaId;
  readonly name: string;
  readonly rect: TileRect;
  readonly multiCombat?: boolean;
  readonly safe?: boolean;
}

export interface NpcPlacement {
  readonly instanceId: InstanceId;
  readonly npcId: NpcId;
  readonly position: TilePoint;
}

export interface ObjectPlacement {
  readonly instanceId: InstanceId;
  readonly objectId: WorldObjectId;
  readonly position: TilePoint;
  readonly facing?: Facing;
}

export interface CreaturePlacement {
  readonly instanceId: InstanceId;
  readonly creatureId: CreatureId;
  readonly position: TilePoint;
}

export interface ZoneLight {
  readonly position: TilePoint;
  readonly radius: number;
  readonly color: string;
  readonly intensity: number;
}

export interface ZoneAmbience {
  readonly darkness: number;
  readonly tint: string;
  readonly fog: string;
  readonly fixtures?: 'working' | 'failing';
}

export interface DressedRoom {
  readonly room: string;
  readonly composition?: CompositionName;
  readonly formal: boolean;
  readonly prefabs: readonly string[];
  readonly additions: readonly string[];
  readonly setPieces: readonly { readonly prefab: string; readonly roles: readonly PrefabRole[] }[];
}

export interface DistrictDefinition {
  readonly id: DistrictId;
  readonly name: string;
  readonly subtitle: string;
  readonly tier: number;
  readonly condition?: Condition;
  readonly region: RegionId;
  readonly reachedOnlyByTram?: boolean;
  readonly deadEnd?: boolean;
  readonly rooms?: Readonly<Record<string, TileRect>>;
  readonly exits?: Readonly<Record<string, DistrictExit>>;
  readonly anchors?: Readonly<Record<string, TilePoint>>;
  readonly map: readonly string[];
  readonly recovery?: { readonly districtId: DistrictId; readonly position: TilePoint };
  readonly ambience: ZoneAmbience;
  readonly areas: readonly AreaDefinition[];
  readonly npcs: readonly NpcPlacement[];
  readonly objects: readonly ObjectPlacement[];
  readonly assemblies?: readonly AssemblyPlacement[];
  readonly creatures?: readonly CreaturePlacement[];
  readonly lights: readonly ZoneLight[];
  readonly decals?: readonly FloorDecal[];
  readonly landmarks?: readonly string[];
  readonly dressingLog?: readonly DressedRoom[];
}

export interface TileLayout {
  readonly width: number;
  readonly height: number;
  tileAt(point: TilePoint): TileKindId;
}

export function parseTileLayout(map: readonly string[]): TileLayout {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  const tiles: TileKindId[] = [];

  map.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Zone map row ${y} has width ${row.length}, expected ${width}.`);
    for (const [x, symbol] of [...row].entries()) {
      const kind = MAP_LEGEND[symbol];
      if (!kind) throw new Error(`Unknown map symbol "${symbol}" at ${x},${y}.`);
      tiles.push(kind);
    }
  });

  return {
    width,
    height,
    tileAt: ({ x, y }) => (x < 0 || y < 0 || x >= width || y >= height ? 'void' : (tiles[y * width + x] ?? 'void')),
  };
}

export function createWalkabilityGrid(layout: TileLayout, blockedTiles: Iterable<TilePoint>, deckTiles: Iterable<TilePoint> = []): WalkabilityGrid {
  const blocked = new Set([...blockedTiles].map(tileKey));
  const decks = new Set([...deckTiles].map(tileKey));
  const lookup = (point: TilePoint): boolean => {
    const key = tileKey(point);
    return !blocked.has(key) && (decks.has(key) || TILE_KINDS[layout.tileAt(point)].walkable);
  };
  const { width, height } = layout;
  const walkable = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) walkable[y * width + x] = lookup({ x, y }) ? 1 : 0;
  }
  return {
    isWalkable: (point) => {
      const { x, y } = point;
      if (x >= 0 && y >= 0 && x < width && y < height && Number.isInteger(x) && Number.isInteger(y)) return walkable[y * width + x] === 1;
      return lookup(point);
    },
  };
}

export function createObjectWalkabilityGrid(
  layout: TileLayout,
  placements: readonly ObjectPlacement[],
  definitionOf: (objectId: WorldObjectId) => WorldObjectDefinition | undefined,
): WalkabilityGrid {
  const placed = placements.map((placement) => ({ tiles: objectFootprintTiles(definitionOf(placement.objectId), placement), definition: definitionOf(placement.objectId) }));
  return createWalkabilityGrid(
    layout,
    placed.filter(({ definition }) => definition?.blocksMovement).flatMap(({ tiles }) => tiles),
    placed.filter(({ definition }) => definition?.deck && !definition.blocksMovement).flatMap(({ tiles }) => tiles),
  );
}
