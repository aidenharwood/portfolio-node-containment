import { minimumWindup, telegraphHitShare } from '../combat/encounters.ts';
import type { CreatureDefinition } from '../combat/creatures.ts';
import { tierForLevel } from '../crafting/tiers.ts';
import { parseTileLayout } from '../world/district.ts';
import { rectContains } from '../world/geometry.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import type { GameContent } from './gameContent.ts';

export const referenceIntegrityAt = (level: number): number => 20 + level * 4;

export const telegraphHitCap = (bossLevel: number): number => Math.floor(telegraphHitShare(tierForLevel(bossLevel)) * referenceIntegrityAt(bossLevel));

function findDefinitionIssues(content: GameContent, creature: CreatureDefinition, report: (problem: string) => void): void {
  const encounter = creature.encounter;
  if (!encounter) return;
  const ids = new Set<string>();
  for (const mechanic of encounter.mechanics) {
    if (ids.has(mechanic.id)) report(`mechanic id "${mechanic.id}" is used twice`);
    ids.add(mechanic.id);
    if (mechanic.kind === 'telegraph') {
      if (mechanic.windupTicks < minimumWindup(mechanic.shape)) {
        report(`telegraph "${mechanic.id}" winds up in ${mechanic.windupTicks} ticks; a ${mechanic.shape} needs at least ${minimumWindup(mechanic.shape)}`);
      }
      const cap = telegraphHitCap(creature.level);
      if (mechanic.maxHit > cap) report(`telegraph "${mechanic.id}" hits for ${mechanic.maxHit}; tier ${tierForLevel(creature.level)} caps it at ${cap}`);
    }
    if (mechanic.kind === 'summon') {
      const summoned = content.creatures.get(mechanic.creatureId);
      if (!summoned) report(`summon "${mechanic.id}" names unknown creature "${mechanic.creatureId}"`);
      else {
        if (summoned.level > creature.level) report(`summon "${mechanic.id}" calls "${summoned.id}", which outranks its summoner`);
        if (summoned.containment || summoned.encounter) report(`summon "${mechanic.id}" calls "${summoned.id}", which is a boss itself`);
      }
    }
  }
  let previous = 1;
  for (const phase of encounter.phases ?? []) {
    if (!(phase.belowIntegrity > 0 && phase.belowIntegrity < previous)) report(`phase thresholds must strictly descend within (0, 1); ${phase.belowIntegrity} does not`);
    previous = phase.belowIntegrity;
    for (const id of phase.enables) {
      if (!ids.has(id)) report(`a phase enables unknown mechanic "${id}"`);
    }
  }
}

function findPlacementIssues(content: GameContent, issues: string[]): void {
  for (const district of content.districts.values()) {
    const layout = parseTileLayout(district.map);
    for (const placement of district.creatures ?? []) {
      const encounter = content.creatures.get(placement.creatureId)?.encounter;
      if (!encounter) continue;
      const report = (problem: string) => issues.push(`district ${district.id}: "${placement.instanceId}" ${problem}`);
      const strikesArea = encounter.mechanics.some((mechanic) => mechanic.kind === 'telegraph' || mechanic.kind === 'hazard');
      const areas = district.areas.filter((area) => rectContains(area.rect, placement.position));
      if (strikesArea && !areas.some((area) => area.multiCombat)) report('has area mechanics but does not stand in a multi-combat area');
      const room = Object.values(district.rooms ?? {}).find((rect) => rectContains(rect, placement.position));
      if (!room) continue;
      let walkable = 0;
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) if (TILE_KINDS[layout.tileAt({ x, y })].walkable) walkable++;
      }
      for (const mechanic of encounter.mechanics) {
        if (mechanic.kind === 'hazard' && mechanic.maxTiles > walkable) report(`hazard "${mechanic.id}" can grow to ${mechanic.maxTiles} tiles in a room of ${walkable}`);
      }
    }
  }
}

export function findEncounterIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const creature of content.creatures.values()) {
    findDefinitionIssues(content, creature, (problem) => issues.push(`creature ${creature.id}: ${problem}`));
  }
  findPlacementIssues(content, issues);
  return issues;
}
