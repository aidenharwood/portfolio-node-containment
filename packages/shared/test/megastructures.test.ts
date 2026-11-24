import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/content/gameContent.ts';
import { findMegastructureIssues } from '../src/content/megastructureIntegrity.ts';
import { SPAN_MEGASTRUCTURES } from '../src/content/span/megastructures.ts';
import { objectFootprintTiles } from '../src/world/footprint.ts';
import { rectContains } from '../src/world/geometry.ts';
import type { ResolvedLevel } from '../src/world/levelLayout.ts';
import { resolveMegastructure, type MegastructurePlacement } from '../src/world/megastructure.ts';

const overworld = GAME_CONTENT.levels.get('overworld') as ResolvedLevel;
const origins = new Map(overworld.definition.districts.map((placement) => [placement.districtId, placement.origin]));
const resolve = (placement: MegastructurePlacement) => resolveMegastructure(placement, (id) => GAME_CONTENT.districts.get(id), (id) => origins.get(id), overworld.layout);

test('every shipped megastructure spans more than one land square and stands level on its datum', () => {
  assert.ok(SPAN_MEGASTRUCTURES.length >= 3);
  for (const megastructure of overworld.megastructures) {
    const districts = new Set<string>();
    for (const object of megastructure.objects) {
      assert.equal(object.datum, megastructure.datum);
      for (const tile of objectFootprintTiles(GAME_CONTENT.worldObjects.get(object.objectId), object)) {
        const district = overworld.layout.districtAt(tile);
        if (district) districts.add(district);
        assert.ok(overworld.layout.heightAt(tile) <= megastructure.datum, megastructure.id);
      }
    }
    assert.ok(districts.size >= 2, `${megastructure.id} stays inside ${[...districts].join(', ')}`);
    for (const object of megastructure.objects) assert.ok(overworld.objects.some((placed) => placed.instanceId === object.instanceId));
  }
  assert.deepEqual(findMegastructureIssues(GAME_CONTENT), []);
});

test('a megastructure footing on an anchor or another object is reported', () => {
  const district = GAME_CONTENT.districts.get('site-kestrel');
  const start = district?.anchors?.start;
  assert.ok(district && start);
  const [room, rect] = Object.entries(district.rooms ?? {}).find(([, candidate]) => rectContains(candidate, start)) ?? [];
  assert.ok(room && rect);
  const misplaced = resolve({ id: 'misplaced', prefab: 'mega-kestrel-uplink', at: { districtId: 'site-kestrel', room, dx: start.x - rect.x - 1, dy: start.y - rect.y - 1 } });
  const content = { ...GAME_CONTENT, levels: new Map([[overworld.id, { ...overworld, megastructures: [misplaced] }]]) };
  const issues = findMegastructureIssues(content);
  assert.ok(issues.some((issue) => issue.includes('misplaced') && issue.includes('anchor')), issues.join('\n'));
});

test('a megastructure that names an unknown prefab or room does not resolve', () => {
  assert.throws(() => resolve({ id: 'nowhere', prefab: 'mega-missing', at: { districtId: 'site-kestrel', room: 'ground', dx: 0, dy: 0 } }), /unknown prefab/);
  assert.throws(() => resolve({ id: 'nowhere', prefab: 'mega-kestrel-uplink', at: { districtId: 'site-kestrel', room: 'no-such-room', dx: 0, dy: 0 } }), /no room/);
});
