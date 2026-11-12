import { mkdirSync, writeFileSync } from 'node:fs';
import { captureFurnish, type FurnishInput } from '../packages/shared/src/content/districts/furnish.ts';
import type { Blueprint } from '../packages/shared/src/world/blueprint.ts';
import type { TilePoint } from '../packages/shared/src/world/geometry.ts';
import type { DistrictLayout, LayoutPosition } from '../packages/shared/src/world/layoutSchema.ts';
import { printLayout } from '../packages/shared/src/world/printLayout.ts';

const captured: FurnishInput[] = [];
const stop = captureFurnish((input) => captured.push(input));
await import('../packages/shared/src/content/gameContent.ts');
stop();

const OUT = new URL('../packages/shared/src/content/districts/layouts/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const inside = (rect: { x: number; y: number; width: number; height: number }, point: TilePoint): boolean =>
  point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;

const positionIn = (plan: Blueprint) => {
  const roomOrder = plan.steps.flatMap((step) => (step.kind === 'room' ? [step.id] : []));
  return (point: TilePoint): LayoutPosition => {
    for (const room of roomOrder) {
      const rect = plan.rooms[room];
      if (rect && inside(rect, point)) return { room, dx: point.x - rect.x, dy: point.y - rect.y };
    }
    for (const [exit, value] of Object.entries(plan.exits)) {
      const index = value.tiles.findIndex((tile) => tile.x === point.x && tile.y === point.y);
      if (index >= 0) return { exit, index };
    }
    for (const [key, tiles] of Object.entries(plan.links)) {
      const index = tiles.findIndex((tile) => tile.x === point.x && tile.y === point.y);
      const [from, to] = key.split('>') as [string, string];
      if (index >= 0) return { link: [from, to], index };
    }
    return { x: point.x, y: point.y };
  };
};

const sameRect = (a: { x: number; y: number; width: number; height: number } | undefined, b: { x: number; y: number; width: number; height: number }): boolean =>
  a !== undefined && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

for (const { plan, district, dressing, options } of captured) {
  const at = positionIn(plan);
  const layout: DistrictLayout = {
    id: district.id,
    name: district.name,
    subtitle: district.subtitle,
    tier: district.tier,
    region: district.region,
    ...(district.condition === undefined ? {} : { condition: district.condition }),
    ...(district.reachedOnlyByTram === undefined ? {} : { reachedOnlyByTram: district.reachedOnlyByTram }),
    ...(district.deadEnd === undefined ? {} : { deadEnd: district.deadEnd }),
    ambience: district.ambience,
    size: plan.size,
    steps: [...plan.steps],
    tiles: [],
    areas: district.areas.map((area) => {
      const options = { ...(area.safe === undefined ? {} : { safe: area.safe }), ...(area.multiCombat === undefined ? {} : { multiCombat: area.multiCombat }) };
      return sameRect(plan.rooms[area.id], area.rect) ? { room: area.id, name: area.name, ...options } : { id: area.id, name: area.name, rect: area.rect, ...options };
    }),
    anchors: Object.fromEntries(Object.entries(district.anchors ?? {}).map(([name, point]) => [name, at(point)])),
    ...(district.recovery === undefined ? {} : { recovery: { districtId: district.recovery.districtId, at: at(district.recovery.position) } }),
    objects: district.objects.map((object) => ({ id: object.instanceId, object: object.objectId, at: at(object.position), ...(object.facing === undefined ? {} : { facing: object.facing }) })),
    assemblies: (district.assemblies ?? []).map((assembly) => ({
      id: assembly.instanceId,
      assembly: assembly.assemblyId,
      at: at(assembly.position),
      ...(assembly.facing === undefined ? {} : { facing: assembly.facing }),
      ...(assembly.span === undefined ? {} : { span: assembly.span }),
    })),
    npcs: district.npcs.map((npc) => ({ id: npc.instanceId, npc: npc.npcId, at: at(npc.position) })),
    creatures: (district.creatures ?? []).map((creature) => ({ id: creature.instanceId, creature: creature.creatureId, at: at(creature.position) })),
    lights: district.lights.map((light) => ({ at: at(light.position), radius: light.radius, color: light.color, intensity: light.intensity })),
    decals: (district.decals ?? []).map((decal) => ({
      kind: decal.kind,
      ...(decal.pattern === undefined ? {} : { pattern: decal.pattern }),
      ...(decal.tint === undefined ? {} : { tint: decal.tint }),
      at: at({ x: decal.rect.x, y: decal.rect.y }),
      width: decal.rect.width,
      height: decal.rect.height,
    })),
    setPieces: (options.setPieces ?? []).map((piece) => {
      const rect = plan.rooms[piece.room];
      if (!rect) throw new Error(`${district.id}: set-piece room "${piece.room}" is missing`);
      return { ...(piece.instanceId === undefined ? {} : { id: piece.instanceId }), prefab: piece.prefab, at: { room: piece.room, dx: piece.origin.x - rect.x, dy: piece.origin.y - rect.y }, facing: piece.facing };
    }),
    dressing: { ...dressing },
    furnish: {
      ...(options.cast === undefined ? {} : { cast: [...options.cast] }),
      ...(options.landmarks === undefined ? {} : { landmarks: [...options.landmarks] }),
      ...(options.decalSwaps === undefined ? {} : { decalSwaps: { ...options.decalSwaps } }),
    },
  };
  writeFileSync(new URL(`${district.id}.json`, OUT), printLayout(layout));
}

console.log(`wrote ${captured.length} layouts`);
