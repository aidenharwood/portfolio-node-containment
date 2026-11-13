import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import { locate } from '../src/content/levelIndex.ts';
import { createObjectWalkabilityGrid } from '../src/world/district.ts';
import { doorTilesOf, withOpenDoors } from '../src/world/doors.ts';
import { parseLayout } from '../src/world/layout.ts';

const DIRECTORY = new URL('../src/content/districts/layouts/', import.meta.url);

interface Baseline {
  readonly areas: string[];
  readonly anchors: string[];
  readonly npcs: string[];
  readonly objects: string[];
  readonly assemblies: string[];
  readonly creatures: number;
  readonly nodes: number;
  readonly landmarks: string[];
}

const MOVED: Record<string, string> = { 'sector2-bulkhead': 'hydroponics' };

const baseline: Record<string, Baseline> = JSON.parse(readFileSync(new URL('./fixtures/worldBaseline.json', import.meta.url), 'utf8'));

const layouts = new Map(
  readdirSync(DIRECTORY)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const layout = parseLayout(JSON.parse(readFileSync(new URL(name, DIRECTORY), 'utf8')));
      return [layout.id, layout] as const;
    }),
);

const idsOf = (districtId: string) => {
  const layout = layouts.get(districtId);
  return {
    areas: (layout?.areas ?? []).map((area) => ('id' in area ? area.id : area.room)),
    anchors: Object.keys(layout?.anchors ?? {}),
    npcs: (layout?.npcs ?? []).map((npc) => npc.id),
    objects: (layout?.objects ?? []).map((object) => object.id),
    assemblies: (layout?.assemblies ?? []).map((assembly) => assembly.id),
    landmarks: layout?.furnish.landmarks ?? [],
  };
};

test('no district lost an area, anchor, npc, fixture or landmark', () => {
  const lost: string[] = [];
  for (const [districtId, before] of Object.entries(baseline)) {
    assert.ok(layouts.has(districtId), `${districtId} is gone`);
    for (const kind of ['areas', 'anchors', 'npcs', 'objects', 'assemblies', 'landmarks'] as const) {
      for (const id of before[kind]) {
        const home = MOVED[id] ?? districtId;
        if (!idsOf(home)[kind].includes(id)) lost.push(`${districtId}: ${kind} "${id}" is not in ${home}`);
      }
    }
  }
  assert.deepEqual(lost, []);
});

test('no district lost creatures or nodes', () => {
  const changed: string[] = [];
  for (const [districtId, before] of Object.entries(baseline)) {
    const layout = layouts.get(districtId);
    const creatures = layout?.creatures.length ?? 0;
    const nodes = (layout?.objects ?? []).filter((object) => GAME_CONTENT.worldObjects.get(object.object)?.interactions.some((interaction) => interaction.gather !== undefined)).length;
    if (creatures !== before.creatures) changed.push(`${districtId}: creatures ${before.creatures} became ${creatures}`);
    if (nodes !== before.nodes) changed.push(`${districtId}: nodes ${before.nodes} became ${nodes}`);
  }
  assert.deepEqual(changed, []);
});

test('every recovery point is walkable ground', () => {
  const problems: string[] = [];
  const grids = new Map<string, ReturnType<typeof createObjectWalkabilityGrid>>();
  for (const district of GAME_CONTENT.districts.values()) {
    const recovery = district.recovery;
    if (!recovery) {
      const spawns = [...GAME_CONTENT.levels.values()].some((level) => level.definition.spawn.districtId === district.id);
      if (!spawns) problems.push(`${district.id}: has no recovery point`);
      continue;
    }
    const raw = layouts.get(district.id)?.recovery;
    if (raw && raw.districtId !== district.id && 'at' in raw && 'x' in raw.at) problems.push(`${district.id}: recovery is a raw point in ${raw.districtId}`);
    const location = locate(GAME_CONTENT, recovery.districtId, recovery.position);
    const level = location && GAME_CONTENT.levels.get(location.levelId);
    if (!location || !level) {
      problems.push(`${district.id}: recovery does not resolve to a level`);
      continue;
    }
    const definitionOf = (objectId: string) => GAME_CONTENT.worldObjects.get(objectId);
    const grid = grids.get(level.id) ?? withOpenDoors(createObjectWalkabilityGrid(level.layout, level.objects, definitionOf), level.layout, doorTilesOf(level.objects, definitionOf), () => true);
    grids.set(level.id, grid);
    if (!grid.isWalkable(location.position)) problems.push(`${district.id}: recovery is not walkable`);
  }
  assert.deepEqual(problems, []);
});
