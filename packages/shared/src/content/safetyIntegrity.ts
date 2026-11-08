import { rectContains } from '../world/geometry.ts';
import type { GameContent } from './gameContent.ts';

export function findSafetyIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const level of content.levels.values()) {
    for (const placement of level.definition.districts) {
      const district = content.districts.get(placement.districtId);
      if (!district) continue;
      const safeAreas = district.areas.filter((area) => area.safe);
      const isSafe = (point: { readonly x: number; readonly y: number }) => safeAreas.some((area) => rectContains(area.rect, point));
      for (const npc of district.npcs) {
        if (level.definition.kind === 'floor' && !isSafe(npc.position)) issues.push(`district ${district.id}: npc "${npc.instanceId}" stands outside a safe area`);
      }
      for (const creature of district.creatures ?? []) {
        if (isSafe(creature.position)) issues.push(`district ${district.id}: creature "${creature.instanceId}" is placed inside a safe area`);
      }
    }
  }
  return issues;
}
