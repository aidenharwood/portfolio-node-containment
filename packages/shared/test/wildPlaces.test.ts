import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import { WILD_CACHES, WILD_NPCS } from '../src/content/span/wilds.ts';

const squares = [...GAME_CONTENT.districts.values()].filter((district) => district.square);

test('every land square has a building to walk into and a landmark to steer by', () => {
  const bare = squares.filter((district) => Object.keys(district.rooms ?? {}).filter((room) => room !== 'ground').length === 0 || (district.landmarks ?? []).length === 0);
  assert.deepEqual(bare.map((district) => district.id), []);
});

test('every region hides caches and skill-gated secrets in its wild squares', () => {
  const placed = new Map<string, Set<string>>();
  for (const district of squares) {
    for (const object of district.objects) {
      if (!WILD_CACHES.some((cache) => cache.id === object.objectId)) continue;
      placed.set(district.region, new Set([...(placed.get(district.region) ?? []), object.objectId]));
    }
  }
  for (const region of GAME_CONTENT.regions.keys()) assert.equal(placed.get(region)?.size, 2, region + ' has a cache and a secret');
  for (const cache of WILD_CACHES) assert.ok(cache.interactions.every((interaction) => interaction.oncePerCharacter), cache.id + ' empties once per character');
});

test('every wild NPC stands in a safe room somewhere on the Span', () => {
  for (const npc of WILD_NPCS) {
    const home = [...GAME_CONTENT.districts.values()].find((district) => district.npcs.some((placement) => placement.npcId === npc.id));
    assert.ok(home, npc.id + ' is placed');
  }
});

test('Site Tallow and Site Vesper each have a facility level below them', () => {
  for (const [districtId, tier, region] of [['tallow-holding', 9, 'wreckfield'], ['vesper-deep', 11, 'glass-steppe']] as const) {
    const district = GAME_CONTENT.districts.get(districtId);
    assert.ok(district, districtId);
    assert.equal(district.tier, tier);
    assert.equal(district.region, region);
    const levelId = GAME_CONTENT.levelOfDistrict.get(districtId);
    assert.equal(levelId === undefined ? undefined : GAME_CONTENT.levels.get(levelId)?.definition.depth, -1);
    assert.ok((district.creatures ?? []).length >= 5, districtId + ' is guarded');
    assert.ok((district.landmarks ?? []).length > 0, districtId + ' has a landmark');
  }
});
