import type { DistrictId } from '../ids.ts';
import { dressingObjectOf } from '../content/districts/furnish.ts';
import { pieceTiles, rotationOf, turnsOf, type Turn } from '../content/districts/prefabTurns.ts';
import { PREFABS } from '../content/prefabs/index.ts';
import type { DistrictDefinition, ObjectPlacement, TileLayout } from './district.ts';
import { rectContains, type Facing, type TilePoint } from './geometry.ts';

export interface MegastructurePlacement {
  readonly id: string;
  readonly prefab: string;
  readonly at: { readonly districtId: DistrictId; readonly room: string; readonly dx: number; readonly dy: number };
  readonly facing?: Facing;
}

export interface ResolvedMegastructure {
  readonly id: string;
  readonly prefab: string;
  readonly districtId: DistrictId;
  readonly room: string;
  readonly origin: TilePoint;
  readonly facing: Facing;
  readonly datum: number;
  readonly objects: readonly ObjectPlacement[];
}

export const MEGASTRUCTURE_DROP = 6;

export function megastructureTurn(prefab: string, facing: Facing): Turn | undefined {
  const found = PREFABS[prefab];
  return found ? turnsOf(found, dressingObjectOf)[rotationOf(facing)] : undefined;
}

export function resolveMegastructure(
  placement: MegastructurePlacement,
  districtOf: (id: DistrictId) => DistrictDefinition | undefined,
  originOf: (id: DistrictId) => TilePoint | undefined,
  layout: TileLayout,
): ResolvedMegastructure {
  const fail = (reason: string): never => {
    throw new Error(`Megastructure "${placement.id}": ${reason}`);
  };
  const facing = placement.facing ?? 'south';
  const turn = megastructureTurn(placement.prefab, facing) ?? fail(`unknown prefab "${placement.prefab}".`);
  const district = districtOf(placement.at.districtId) ?? fail(`unknown district "${placement.at.districtId}".`);
  const offset = originOf(district.id) ?? fail(`district "${district.id}" is not on the level.`);
  const rect = district.rooms?.[placement.at.room] ?? fail(`district "${district.id}" has no room "${placement.at.room}".`);
  const local = { x: rect.x + placement.at.dx, y: rect.y + placement.at.dy };
  if (!rectContains(rect, local)) fail(`its anchor ${placement.at.dx},${placement.at.dy} lies outside room "${placement.at.room}".`);
  const origin = { x: offset.x + local.x, y: offset.y + local.y };
  const datum = Math.max(...pieceTiles(origin, turn).map((tile) => layout.heightAt(tile)));
  return {
    id: placement.id,
    prefab: placement.prefab,
    districtId: district.id,
    room: placement.at.room,
    origin,
    facing,
    datum,
    objects: turn.pieces.map((piece, index) => ({
      instanceId: `${placement.id}/${index + 1}`,
      objectId: piece.objectId,
      position: { x: origin.x + piece.dx, y: origin.y + piece.dy },
      facing: piece.facing,
      datum,
    })),
  };
}
