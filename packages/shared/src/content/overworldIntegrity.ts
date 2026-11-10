import type { DistrictId } from '../ids.ts';
import { tileKey } from '../world/geometry.ts';
import type { GameContent } from './gameContent.ts';
import { tilesReachableOnFoot } from './levelIntegrity.ts';
import { homeRegionOf } from './regionIntegrity.ts';

export function overworldLevelOf(content: GameContent) {
  const home = homeRegionOf(content);
  const hubDistrictId = home === undefined ? undefined : content.regions.get(home)?.hubDistrictId;
  const levelId = hubDistrictId === undefined ? undefined : content.levelOfDistrict.get(hubDistrictId);
  return levelId === undefined ? undefined : content.levels.get(levelId);
}

export function findOverworldIssues(content: GameContent): string[] {
  const overworld = overworldLevelOf(content);
  if (!overworld) return ['The home region has no overworld level.'];
  const reached = tilesReachableOnFoot(content, overworld);
  const walkedInto = new Set<DistrictId>();
  for (let y = 0; y < overworld.layout.height; y++) {
    for (let x = 0; x < overworld.layout.width; x++) {
      if (!reached.has(tileKey({ x, y }))) continue;
      const districtId = overworld.layout.districtAt({ x, y });
      if (districtId !== undefined) walkedInto.add(districtId);
    }
  }
  return overworld.definition.districts
    .map((placement) => content.districts.get(placement.districtId))
    .filter((district) => district !== undefined && district.reachedOnlyByTram !== true && !walkedInto.has(district.id))
    .map((district) => `District "${district!.id}" on the overworld cannot be reached on foot from the ${overworld.name} spawn.`);
}
