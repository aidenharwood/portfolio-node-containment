import type { CreatureId } from '../combat/creatures.ts';
import type { AreaId, InstanceId, NpcId, WorldObjectId, DistrictId, RegionId } from '../ids.ts';
import { tileKey, type Facing, type TilePoint, type TileRect } from './geometry.ts';
import type { AssemblyPlacement } from './assemblies.ts';
import type { WorldObjectDefinition } from './entities.ts';
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

export interface DistrictDefinition {
  readonly id: DistrictId;
  readonly name: string;
  readonly subtitle: string;
  readonly tier: number;
  readonly region: RegionId;
  readonly reachedOnlyByTram?: boolean;
  readonly map: readonly string[];
  readonly recovery?: { readonly districtId: DistrictId; readonly position: TilePoint };
  readonly ambience: ZoneAmbience;
  readonly areas: readonly AreaDefinition[];
  readonly npcs: readonly NpcPlacement[];
  readonly objects: readonly ObjectPlacement[];
  readonly assemblies?: readonly AssemblyPlacement[];
  readonly creatures?: readonly CreaturePlacement[];
  readonly lights: readonly ZoneLight[];
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
  return {
    isWalkable: (point) => {
      const key = tileKey(point);
      return !blocked.has(key) && (decks.has(key) || TILE_KINDS[layout.tileAt(point)].walkable);
    },
  };
}

export function createObjectWalkabilityGrid(
  layout: TileLayout,
  placements: readonly ObjectPlacement[],
  definitionOf: (objectId: WorldObjectId) => WorldObjectDefinition | undefined,
): WalkabilityGrid {
  const placed = placements.map((placement) => ({ position: placement.position, definition: definitionOf(placement.objectId) }));
  return createWalkabilityGrid(
    layout,
    placed.filter(({ definition }) => definition?.blocksMovement).map(({ position }) => position),
    placed.filter(({ definition }) => definition?.deck && !definition.blocksMovement).map(({ position }) => position),
  );
}
