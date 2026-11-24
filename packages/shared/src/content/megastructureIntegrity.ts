import { footprintTiles, objectFootprintTiles, sizeOf } from '../world/footprint.ts';
import { rectContains, tileKey, type TilePoint } from '../world/geometry.ts';
import { MEGASTRUCTURE_DROP, type ResolvedMegastructure } from '../world/megastructure.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { TILE_KINDS, type TileKindId } from '../world/tiles.ts';
import type { GameContent } from './gameContent.ts';
import { PREFABS } from './prefabs/index.ts';

const KEPT_CLEAR: ReadonlySet<TileKindId> = new Set<TileKindId>(['door', 'hazard', 'track']);

function occupiedTiles(content: GameContent, level: ResolvedLevel, own: ReadonlySet<string>): { readonly objects: Set<string>; readonly people: Set<string>; readonly marks: Set<string> } {
  const objects = new Set<string>();
  for (const placement of level.objects) {
    if (own.has(placement.instanceId)) continue;
    for (const tile of objectFootprintTiles(content.worldObjects.get(placement.objectId), placement)) objects.add(tileKey(tile));
  }
  const people = new Set<string>(level.npcs.map((npc) => tileKey(npc.position)));
  for (const creature of level.creatures) {
    const definition = content.creatures.get(creature.creatureId);
    for (const tile of footprintTiles(creature.position, definition ? sizeOf(definition) : 1)) people.add(tileKey(tile));
  }
  const marks = new Set<string>();
  for (const placement of level.definition.districts) {
    const district = content.districts.get(placement.districtId);
    const lift = (point: TilePoint): string => tileKey({ x: point.x + placement.origin.x, y: point.y + placement.origin.y });
    for (const anchor of Object.values(district?.anchors ?? {})) marks.add(lift(anchor));
    for (const exit of Object.values(district?.exits ?? {})) for (const tile of exit.tiles) marks.add(lift(tile));
  }
  return { objects, people, marks };
}

function findOneMegastructure(content: GameContent, level: ResolvedLevel, megastructure: ResolvedMegastructure, report: (problem: string) => void): void {
  if (!PREFABS[megastructure.prefab]?.roles.includes('megastructure')) report(`prefab "${megastructure.prefab}" does not have the megastructure role`);
  const own = new Set(megastructure.objects.map((object) => object.instanceId));
  const { objects, people, marks } = occupiedTiles(content, level, own);
  const { layout } = level;
  let lowest = megastructure.datum;
  for (const object of megastructure.objects) {
    const definition = content.worldObjects.get(object.objectId);
    if (!definition) {
      report(`"${object.instanceId}" uses unknown object "${object.objectId}"`);
      continue;
    }
    for (const tile of objectFootprintTiles(definition, object)) {
      const key = tileKey(tile);
      const local = layout.toLocalPoint(tile);
      const rooms = local ? Object.values(content.districts.get(local.districtId)?.rooms ?? {}) : [];
      if (!local || !rooms.some((rect) => rectContains(rect, local.position))) {
        report(`"${object.instanceId}" reaches ${key}, outside every room`);
        continue;
      }
      if (!definition.blocksMovement) continue;
      const kind = layout.tileAt(tile);
      lowest = Math.min(lowest, layout.heightAt(tile));
      if (KEPT_CLEAR.has(kind) || !(TILE_KINDS[kind].walkable || kind === 'water')) report(`"${object.instanceId}" stands on ${kind} at ${key}`);
      if (objects.has(key)) report(`"${object.instanceId}" overlaps another object at ${key}`);
      if (people.has(key)) report(`"${object.instanceId}" stands on a creature or NPC at ${key}`);
      if (marks.has(key)) report(`"${object.instanceId}" covers an anchor or exit at ${key}`);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) if (layout.tileAt({ x: tile.x + dx, y: tile.y + dy }) === 'door') report(`"${object.instanceId}" crowds the doorway beside ${key}`);
      }
    }
  }
  if (megastructure.datum - lowest > MEGASTRUCTURE_DROP) report(`its footings fall ${megastructure.datum - lowest} steps below its datum; at most ${MEGASTRUCTURE_DROP}`);
}

export function findMegastructureIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const level of content.levels.values()) {
    const seen = new Set<string>();
    for (const megastructure of level.megastructures) {
      const report = (problem: string) => issues.push(`level ${level.id} megastructure ${megastructure.id}: ${problem}`);
      if (seen.has(megastructure.id)) report('its id is used more than once');
      seen.add(megastructure.id);
      findOneMegastructure(content, level, megastructure, report);
    }
  }
  return [...new Set(issues)];
}
