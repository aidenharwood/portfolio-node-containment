import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapScenery, npcPointOfInterestKind, objectMapSceneryKind, objectPointOfInterestKind, pointsOfInterest, type WorldObjectDefinition } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const object = (effects: WorldObjectDefinition['interactions'][number]['effects']): WorldObjectDefinition => ({
  id: 'probe',
  name: 'Probe',
  examine: '',
  model: 'placeholder',
  blocksMovement: true,
  interactions: [{ verb: 'Use', effects }],
});

test('objects take their point-of-interest kind from what interacting with them does', () => {
  assert.equal(objectPointOfInterestKind(object([{ type: 'openStorage' }])), 'storage');
  assert.equal(objectPointOfInterestKind(object([{ type: 'openTramMap' }])), 'tram');
  assert.equal(objectPointOfInterestKind(object([{ type: 'restoreIntegrity' }])), 'medical');
  assert.equal(objectPointOfInterestKind(object([{ type: 'openShop', shopId: 'x' }, { type: 'openContracts' }])), 'contracts');
  assert.equal(objectPointOfInterestKind(object([{ type: 'notify', text: 'hm' }])), undefined);
});

test('shopkeepers are shops and background staff are not points of interest', () => {
  const shopkeeper = [...FIXTURE_CONTENT.npcs.values()].find((npc) => npc.shopId);
  assert.ok(shopkeeper);
  assert.equal(npcPointOfInterestKind(shopkeeper, FIXTURE_CONTENT.dialogues), 'shop');
  const ambient = [...FIXTURE_CONTENT.npcs.values()].filter((npc) => !npc.shopId && !npc.dialogueId);
  for (const npc of ambient) assert.equal(npcPointOfInterestKind(npc, FIXTURE_CONTENT.dialogues), undefined);
});

test('every tram station platform has a tram point of interest nearby', () => {
  for (const station of FIXTURE_CONTENT.tram.stations.values()) {
    const level = FIXTURE_CONTENT.levels.get(station.levelId);
    assert.ok(level);
    const near = pointsOfInterest(level, FIXTURE_CONTENT).some((point) => point.kind === 'tram' && Math.hypot(point.position.x - station.platformPoint.x, point.position.y - station.platformPoint.y) <= 16);
    assert.ok(near, `no tram icon near ${station.id}`);
  }
});

test('scenery is categorised for the map by footprint and use', () => {
  const plain = { ...object([]), interactions: [] };
  assert.equal(objectMapSceneryKind(plain), 'obstacle');
  assert.equal(objectMapSceneryKind(object([{ type: 'openStorage' }])), 'fixture');
  assert.equal(objectMapSceneryKind({ ...plain, blocksMovement: false }), 'loose');
  assert.equal(objectMapSceneryKind({ ...plain, blocksMovement: false, deck: true }), 'deck');
  const door = [...FIXTURE_CONTENT.worldObjects.values()].find((candidate) => candidate.door);
  assert.ok(door);
  assert.equal(objectMapSceneryKind(door), undefined);
});

test('every level puts some blocking scenery on the map', () => {
  for (const level of FIXTURE_CONTENT.levels.values()) {
    const scenery = mapScenery(level, FIXTURE_CONTENT.worldObjects);
    if (level.objects.length > 0) assert.ok(scenery.length > 0, `${level.id} has no map scenery`);
  }
});

test('repeated fixtures of one kind collapse into a single icon', () => {
  for (const level of FIXTURE_CONTENT.levels.values()) {
    const points = pointsOfInterest(level, FIXTURE_CONTENT);
    for (const [index, point] of points.entries()) {
      const twin = points.slice(index + 1).find((other) => other.kind === point.kind && other.name === point.name && Math.abs(other.position.x - point.position.x) <= 10 && Math.abs(other.position.y - point.position.y) <= 10);
      assert.equal(twin, undefined, `${level.id} repeats ${point.name}`);
    }
  }
});
