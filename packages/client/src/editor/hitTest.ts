import {
  assemblyInstanceOf,
  districtObjects,
  drawBlueprint,
  GAME_CONTENT,
  objectFootprintTiles,
  rectContains,
  resolvePosition,
  trackBed,
  type DistrictDefinition,
  type DistrictLayout,
  type TilePoint,
} from '@containment/shared';
import type { EntryRef } from './edits.ts';

export type Hit =
  | { readonly kind: 'entry'; readonly ref: EntryRef }
  | { readonly kind: 'step'; readonly index: number }
  | { readonly kind: 'room'; readonly room: string }
  | { readonly kind: 'dressing'; readonly room: string };

const same = (a: TilePoint, b: TilePoint): boolean => a.x === b.x && a.y === b.y;

const keyOf = (hit: Hit): string => JSON.stringify(hit);

export function hitsAt(layout: DistrictLayout, district: DistrictDefinition, tile: TilePoint): Hit[] {
  const plan = drawBlueprint(layout.size, layout.steps, layout.tiles);
  const roomAt = Object.entries(plan.rooms).find(([, rect]) => rectContains(rect, tile))?.[0];
  const dressingHit = (): Hit[] => (roomAt ? [{ kind: 'dressing', room: roomAt }] : []);
  const indexById = (list: readonly { readonly id?: string }[], id: string): number => list.findIndex((entry) => entry.id === id);
  const resolved = (at: Parameters<typeof resolvePosition>[1]): TilePoint | null => {
    try {
      return resolvePosition(plan, at, 'hit');
    } catch {
      return null;
    }
  };

  const setPieceIndexOf = (instanceId: string): number => {
    const slash = instanceId.lastIndexOf('/');
    if (slash >= 0) {
      const index = indexById(layout.setPieces, instanceId.slice(0, slash));
      if (index >= 0) return index;
    }
    const unnamed = /^(.*)-set-(\d+)-\d+$/.exec(instanceId);
    if (!unnamed) return -1;
    const [, prefix, ordinal] = unnamed as unknown as [string, string, string];
    const room = prefix.slice(`${district.id}-`.length);
    const inRoom = layout.setPieces.map((piece, index) => ({ piece, index })).filter(({ piece }) => piece.at.room === room);
    return inRoom[Number(ordinal) - 1]?.index ?? -1;
  };

  const setPieces: Hit[] = [];
  const objects: Hit[] = [];
  for (const object of districtObjects(district, GAME_CONTENT.assemblies)) {
    if (!objectFootprintTiles(GAME_CONTENT.worldObjects.get(object.objectId), object).some((covered) => same(covered, tile))) continue;
    const direct = indexById(layout.objects, object.instanceId);
    if (direct >= 0) {
      objects.push({ kind: 'entry', ref: { collection: 'objects', index: direct } });
      continue;
    }
    const assembly = assemblyInstanceOf(object.instanceId);
    const assemblyIndex = assembly === null ? -1 : indexById(layout.assemblies, assembly);
    if (assemblyIndex >= 0) {
      objects.push({ kind: 'entry', ref: { collection: 'assemblies', index: assemblyIndex } });
      continue;
    }
    const setPiece = setPieceIndexOf(object.instanceId);
    if (setPiece >= 0) setPieces.push({ kind: 'entry', ref: { collection: 'setPieces', index: setPiece } });
    else objects.push(...dressingHit());
  }

  const npcs: Hit[] = district.npcs.filter((npc) => same(npc.position, tile)).flatMap((npc): Hit[] => {
    const index = indexById(layout.npcs, npc.instanceId);
    return index >= 0 ? [{ kind: 'entry', ref: { collection: 'npcs', index } }] : dressingHit();
  });
  const creatures: Hit[] = layout.creatures.flatMap((creature, index): Hit[] => {
    const at = resolved(creature.at);
    return at && same(at, tile) ? [{ kind: 'entry', ref: { collection: 'creatures', index } }] : [];
  });
  const anchors: Hit[] = Object.entries(layout.anchors).flatMap(([name, position]): Hit[] => {
    const at = resolved(position);
    return at && same(at, tile) ? [{ kind: 'entry', ref: { collection: 'anchors', name } }] : [];
  });
  const lights: Hit[] = layout.lights.flatMap((light, index): Hit[] => {
    const at = resolved(light.at);
    return at && same(at, tile) ? [{ kind: 'entry', ref: { collection: 'lights', index } }] : [];
  });
  const decals: Hit[] = layout.decals.flatMap((decal, index): Hit[] => {
    const at = resolved(decal.at);
    return at && rectContains({ ...at, width: decal.width, height: decal.height }, tile) ? [{ kind: 'entry', ref: { collection: 'decals', index } }] : [];
  });

  const steps: Hit[] = layout.steps.flatMap((step, index): Hit[] => {
    if (step.kind === 'link') return (plan.links[`${step.from}>${step.to}`] ?? []).some((linked) => same(linked, tile)) ? [{ kind: 'step', index }] : [];
    if (step.kind === 'exit') return (plan.exits[step.id]?.tiles ?? []).some((exitTile) => same(exitTile, tile)) ? [{ kind: 'step', index }] : [];
    if (step.kind === 'patch' || step.kind === 'hollow') return rectContains(step.rect, tile) ? [{ kind: 'step', index }] : [];
    if (step.kind === 'track') return trackBed(step.points).some((bed) => rectContains(bed, tile)) ? [{ kind: 'step', index }] : [];
    if (step.kind === 'pillars') {
      const rect = plan.rooms[step.room];
      const symbol = plan.map[tile.y]?.[tile.x];
      return rect && rectContains(rect, tile) && symbol === '#' ? [{ kind: 'step', index }] : [];
    }
    return [];
  });

  const room: Hit[] = roomAt ? [{ kind: 'room', room: roomAt }] : [];
  const seen = new Set<string>();
  return [...setPieces, ...objects, ...npcs, ...creatures, ...anchors, ...lights, ...decals, ...steps, ...room].filter((hit) => {
    const key = keyOf(hit);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
