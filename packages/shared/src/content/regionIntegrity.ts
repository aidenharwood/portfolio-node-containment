import type { DistrictId, RegionId } from '../ids.ts';
import type { GameEffect } from '../rules/effects.ts';
import { isSafeIn, type DistrictDefinition } from '../world/district.ts';
import { rectContains, type TilePoint } from '../world/geometry.ts';
import type { RegionDefinition } from '../world/region.ts';
import { districtObjectsOf } from './assemblyIntegrity.ts';
import type { GameContent } from './gameContent.ts';

const isSafeTile = (district: DistrictDefinition, point: TilePoint): boolean =>
  isSafeIn(district.areas, point);

const safeObjectEffects = (content: GameContent, district: DistrictDefinition): GameEffect[] =>
  districtObjectsOf(content, district.id)
    .filter((placement) => isSafeTile(district, placement.position))
    .flatMap((placement) => (content.worldObjects.get(placement.objectId)?.interactions ?? []).flatMap((interaction) => interaction.effects));

export function marketDistrictOf(content: GameContent): DistrictId | undefined {
  const home = homeRegionOf(content);
  return home === undefined ? undefined : content.regions.get(home)?.hubDistrictId;
}

export function homeRegionOf(content: GameContent): RegionId | undefined {
  const start = content.newCharacter.startingLocation;
  const districtId: DistrictId | undefined = content.levels.get(start.levelId)?.layout.districtAt(start.position);
  return districtId === undefined ? undefined : content.districts.get(districtId)?.region;
}

function findOutpostIssues(content: GameContent, region: RegionDefinition, isHome: boolean, report: (problem: string) => void): void {
  const hub = content.districts.get(region.hubDistrictId);
  if (!hub) {
    report(`its hub district "${region.hubDistrictId}" does not exist`);
    return;
  }
  if (hub.region !== region.id) report(`its hub district "${hub.id}" belongs to region "${hub.region}"`);
  const effects = safeObjectEffects(content, hub);
  if (!effects.some((effect) => effect.type === 'openStorage')) report('its outpost has no storage locker in a safe area');
  const hasShop = hub.npcs.some((placement) => content.npcs.get(placement.npcId)?.shopId !== undefined && isSafeTile(hub, placement.position));
  if (!hasShop) report('its outpost has no shopkeeper in a safe area');
  if (isHome) return;
  if (!effects.some((effect) => effect.type === 'openMarket' && effect.access === 'collect')) report('its outpost has no exchange mailbox in a safe area');
  if (!effects.some((effect) => effect.type === 'openContracts')) report('its outpost has no contract board in a safe area');
}

export function findRegionIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const district of content.districts.values()) {
    if (!content.regions.has(district.region)) issues.push(`District "${district.id}" belongs to unknown region "${district.region}".`);
  }
  const home = homeRegionOf(content);
  if (home === undefined || !content.regions.has(home)) issues.push('The new-character start is not in a known region.');
  for (const region of content.regions.values()) {
    findOutpostIssues(content, region, region.id === home, (problem) => issues.push(`Region "${region.id}": ${problem}.`));
  }
  return issues;
}
