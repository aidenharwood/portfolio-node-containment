import type { DistrictId, SiteId } from '../ids.ts';
import type { GameEffect } from '../rules/effects.ts';
import type { DistrictDefinition } from '../world/district.ts';
import { rectContains, type TilePoint } from '../world/geometry.ts';
import type { SiteDefinition } from '../world/site.ts';
import { districtObjectsOf } from './assemblyIntegrity.ts';
import type { GameContent } from './gameContent.ts';

const isSafeTile = (district: DistrictDefinition, point: TilePoint): boolean =>
  district.areas.some((area) => area.safe === true && rectContains(area.rect, point));

const objectEffects = (content: GameContent, districtId: DistrictId): { readonly position: TilePoint; readonly effects: readonly GameEffect[] }[] =>
  districtObjectsOf(content, districtId).map((placement) => ({
    position: placement.position,
    effects: (content.worldObjects.get(placement.objectId)?.interactions ?? []).flatMap((interaction) => interaction.effects),
  }));

const siteOfDistrict = (content: GameContent, districtId: DistrictId): SiteId | undefined => {
  const levelId = content.levelOfDistrict.get(districtId);
  return levelId === undefined ? undefined : content.levels.get(levelId)?.definition.site;
};

export const homeSiteOf = (content: GameContent): SiteId | undefined => content.levels.get(content.newCharacter.startingLocation.levelId)?.definition.site;

function hasRelayArrival(content: GameContent, site: SiteDefinition): boolean {
  for (const districtId of content.districts.keys()) {
    if (siteOfDistrict(content, districtId) === site.id) continue;
    const arrives = objectEffects(content, districtId).some(({ effects }) =>
      effects.some((effect) => effect.type === 'teleport' && siteOfDistrict(content, effect.districtId) === site.id),
    );
    if (arrives) return true;
  }
  return false;
}

function findHubIssues(content: GameContent, site: SiteDefinition, isHome: boolean, report: (problem: string) => void): void {
  const hub = content.districts.get(site.hubDistrictId);
  if (!hub) {
    report(`its hub district "${site.hubDistrictId}" does not exist`);
    return;
  }
  if (siteOfDistrict(content, hub.id) !== site.id) report(`its hub district "${hub.id}" is not on one of its levels`);
  const safeEffects = objectEffects(content, hub.id).filter(({ position }) => isSafeTile(hub, position)).flatMap(({ effects }) => effects);
  if (!safeEffects.some((effect) => effect.type === 'openStorage')) report('its hub has no storage locker in a safe area');
  const hasShop = hub.npcs.some((placement) => content.npcs.get(placement.npcId)?.shopId !== undefined && isSafeTile(hub, placement.position));
  if (!hasShop) report('its hub has no shopkeeper in a safe area');
  if (isHome) return;
  if (!safeEffects.some((effect) => effect.type === 'openMarket' && effect.access === 'collect')) report('its hub has no exchange mailbox in a safe area');
  if (!hasRelayArrival(content, site)) report('no relay from another Site arrives on any of its levels');
}

export function findSiteIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const level of content.levels.values()) {
    if (!content.sites.has(level.definition.site)) issues.push(`Level "${level.id}" belongs to unknown site "${level.definition.site}".`);
  }
  const home = homeSiteOf(content);
  if (home === undefined || !content.sites.has(home)) issues.push('The new-character start is not on a known Site.');
  for (const site of content.sites.values()) {
    const report = (problem: string) => issues.push(`Site "${site.id}": ${problem}.`);
    const floors = [...content.levels.values()].filter((level) => level.definition.site === site.id && level.definition.kind === 'floor');
    if (floors.length === 0) report('it has no floor level');
    findHubIssues(content, site, site.id === home, report);
  }
  return issues;
}
