import type { CreatureId } from '../combat/creatures.ts';
import type { AreaId, InstanceId, NpcId, WorldObjectId, ZoneId } from '../ids.ts';
import { tileKey, type Facing, type TilePoint, type TileRect } from './geometry.ts';
import type { WalkabilityGrid } from './pathfinding.ts';
import { MAP_LEGEND, TILE_KINDS, type TileKindId } from './tiles.ts';

export interface AreaDefinition {
  readonly id: AreaId;
  readonly name: string;
  readonly rect: TileRect;
  readonly multiCombat?: boolean;
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

export interface ZoneDefinition {
  readonly id: ZoneId;
  readonly name: string;
  readonly subtitle: string;
  readonly tier: number;
  readonly map: readonly string[];
  readonly spawn: TilePoint;
  readonly capacity?: number;
  readonly recovery?: { readonly zoneId: ZoneId; readonly position: TilePoint };
  readonly ambience: ZoneAmbience;
  readonly areas: readonly AreaDefinition[];
  readonly npcs: readonly NpcPlacement[];
  readonly objects: readonly ObjectPlacement[];
  readonly creatures?: readonly CreaturePlacement[];
  readonly lights: readonly ZoneLight[];
}

export interface ZoneLayout {
  readonly width: number;
  readonly height: number;
  tileAt(point: TilePoint): TileKindId;
}

export function parseZoneLayout(map: readonly string[]): ZoneLayout {
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

export function createWalkabilityGrid(layout: ZoneLayout, blockedTiles: Iterable<TilePoint>): WalkabilityGrid {
  const blocked = new Set([...blockedTiles].map(tileKey));
  return {
    isWalkable: (point) => TILE_KINDS[layout.tileAt(point)].walkable && !blocked.has(tileKey(point)),
  };
}
