import type { DistrictId, LevelId } from '../ids.ts';
import type { DistrictDefinition } from '../world/district.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { LevelDefinition, WorldLocation } from '../world/level.ts';
import { resolveLevel, type ResolvedLevel } from '../world/levelLayout.ts';

export interface LevelIndex {
  readonly levels: ReadonlyMap<LevelId, ResolvedLevel>;
  readonly levelOfDistrict: ReadonlyMap<DistrictId, LevelId>;
}

export interface LocatableContent {
  readonly levels: ReadonlyMap<LevelId, ResolvedLevel>;
  readonly levelOfDistrict: ReadonlyMap<DistrictId, LevelId>;
}

export function buildLevelIndex(levels: readonly LevelDefinition[], districts: ReadonlyMap<DistrictId, DistrictDefinition>): LevelIndex {
  const levelOfDistrict = new Map<DistrictId, LevelId>();
  for (const level of levels) {
    for (const placement of level.districts) {
      if (!levelOfDistrict.has(placement.districtId)) levelOfDistrict.set(placement.districtId, level.id);
    }
  }
  return { levels: new Map(levels.map((level) => [level.id, resolveLevel(level, districts)])), levelOfDistrict };
}

export function locate(content: LocatableContent, districtId: DistrictId, local: TilePoint): WorldLocation | undefined {
  const levelId = content.levelOfDistrict.get(districtId);
  const level = levelId === undefined ? undefined : content.levels.get(levelId);
  if (!level) return undefined;
  return { levelId: level.id, position: level.layout.toLevelPoint(districtId, local) };
}
