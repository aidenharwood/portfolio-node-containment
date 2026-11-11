import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, npcPointOfInterestKind, objectPointOfInterestKind, pointsOfInterest, type WorldObjectDefinition } from '../src/index.ts';

const object = (effects: WorldObjectDefinition['interactions'][number]['effects']): WorldObjectDefinition => ({
  id: 'probe',
  name: 'Probe',
  examine: '',
  model: 'kiosk',
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
  const shopkeeper = [...GAME_CONTENT.npcs.values()].find((npc) => npc.shopId);
  assert.ok(shopkeeper);
  assert.equal(npcPointOfInterestKind(shopkeeper, GAME_CONTENT.dialogues), 'shop');
  const ambient = [...GAME_CONTENT.npcs.values()].filter((npc) => !npc.shopId && !npc.dialogueId);
  for (const npc of ambient) assert.equal(npcPointOfInterestKind(npc, GAME_CONTENT.dialogues), undefined);
});

test('every tram station platform has a tram point of interest nearby', () => {
  for (const station of GAME_CONTENT.tram.stations.values()) {
    const level = GAME_CONTENT.levels.get(station.levelId);
    assert.ok(level);
    const near = pointsOfInterest(level, GAME_CONTENT).some((point) => point.kind === 'tram' && Math.hypot(point.position.x - station.platformPoint.x, point.position.y - station.platformPoint.y) <= 16);
    assert.ok(near, `no tram icon near ${station.id}`);
  }
});

test('repeated fixtures of one kind collapse into a single icon', () => {
  for (const level of GAME_CONTENT.levels.values()) {
    const points = pointsOfInterest(level, GAME_CONTENT);
    for (const [index, point] of points.entries()) {
      const twin = points.slice(index + 1).find((other) => other.kind === point.kind && other.name === point.name && Math.abs(other.position.x - point.position.x) <= 10 && Math.abs(other.position.y - point.position.y) <= 10);
      assert.equal(twin, undefined, `${level.id} repeats ${point.name}`);
    }
  }
});
