import type { DistrictId } from '../ids.ts';
import type { DistrictExit, ExitSide } from './blueprint.ts';
import type { DistrictDefinition } from './district.ts';
import type { TilePoint } from './geometry.ts';
import type { DistrictPlacement } from './level.ts';

export interface DistrictJoin {
  readonly districtId: DistrictId;
  readonly exit: string;
  readonly to: DistrictId;
  readonly toExit: string;
}

export interface DistrictOffset {
  readonly districtId: DistrictId;
  readonly from: DistrictId;
  readonly offset: TilePoint;
}

export type DistrictAttachment = DistrictJoin | DistrictOffset;

const OPPOSITE: Readonly<Record<ExitSide, ExitSide>> = { north: 'south', south: 'north', east: 'west', west: 'east' };

const STEP_OUT: Readonly<Record<ExitSide, TilePoint>> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

function exitOf(district: DistrictDefinition, exitId: string): DistrictExit {
  const exit = district.exits?.[exitId];
  if (!exit) throw new Error(`District "${district.id}" has no exit "${exitId}".`);
  return exit;
}

export function joinDistricts(districts: readonly DistrictDefinition[], rootId: DistrictId, attachments: readonly DistrictAttachment[]): DistrictPlacement[] {
  const byId = new Map(districts.map((district) => [district.id, district]));
  const definitionOf = (districtId: DistrictId): DistrictDefinition => {
    const district = byId.get(districtId);
    if (!district) throw new Error(`joinDistricts was not given district "${districtId}".`);
    return district;
  };
  const origins = new Map<DistrictId, TilePoint>([[definitionOf(rootId).id, { x: 0, y: 0 }]]);
  const originOf = (districtId: DistrictId): TilePoint => {
    const origin = origins.get(districtId);
    if (!origin) throw new Error(`District "${districtId}" must be placed before anything attaches to it.`);
    return origin;
  };

  for (const attachment of attachments) {
    if (origins.has(attachment.districtId)) throw new Error(`District "${attachment.districtId}" is attached twice.`);
    if ('offset' in attachment) {
      const from = originOf(attachment.from);
      definitionOf(attachment.districtId);
      origins.set(attachment.districtId, { x: from.x + attachment.offset.x, y: from.y + attachment.offset.y });
      continue;
    }
    const anchor = originOf(attachment.to);
    const theirs = exitOf(definitionOf(attachment.to), attachment.toExit);
    const ours = exitOf(definitionOf(attachment.districtId), attachment.exit);
    if (ours.side !== OPPOSITE[theirs.side]) throw new Error(`Exit "${attachment.districtId}.${attachment.exit}" does not face "${attachment.to}.${attachment.toExit}".`);
    if (ours.tiles.length !== theirs.tiles.length) throw new Error(`Exits "${attachment.districtId}.${attachment.exit}" and "${attachment.to}.${attachment.toExit}" differ in width.`);
    const theirFirst = theirs.tiles[0] as TilePoint;
    const ourFirst = ours.tiles[0] as TilePoint;
    const out = STEP_OUT[theirs.side];
    origins.set(attachment.districtId, { x: anchor.x + theirFirst.x + out.x - ourFirst.x, y: anchor.y + theirFirst.y + out.y - ourFirst.y });
  }

  const minX = Math.min(...[...origins.values()].map((origin) => origin.x));
  const minY = Math.min(...[...origins.values()].map((origin) => origin.y));
  return [...origins].map(([districtId, origin]) => ({ districtId, origin: { x: origin.x - minX, y: origin.y - minY } }));
}
