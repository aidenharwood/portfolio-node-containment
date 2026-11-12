import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  activeMechanicIds,
  enragedSpeedTicks,
  phaseIndexFor,
  seedHazard,
  spreadHazard,
  telegraphHitShare,
  telegraphTiles,
  tileKey,
  type EncounterDefinition,
  type TilePoint,
} from '../src/index.ts';

const open = () => true;
const keys = (tiles: readonly TilePoint[]) => new Set(tiles.map(tileKey));

const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
};

const encounter: EncounterDefinition = {
  mechanics: [
    { kind: 'telegraph', id: 'slam', shape: 'body', reach: 1, windupTicks: 5, cooldownTicks: 20, style: 'melee', accuracy: 10, maxHit: 5 },
    { kind: 'enrage', id: 'fury', afterTicks: 100, speedFactor: 2 },
    { kind: 'summon', id: 'adds', creatureId: 'gloam-mite', count: 2, maxAlive: 2 },
  ],
  phases: [
    { belowIntegrity: 0.6, announce: 'It roars.', enables: ['adds'] },
    { belowIntegrity: 0.25, announce: 'It rages.', enables: ['fury'] },
  ],
};

describe('telegraph shapes', () => {
  test('a line runs out of the body in the facing direction, as wide as the body', () => {
    const tiles = telegraphTiles('line', 3, { x: 5, y: 5 }, 2, 'east', { x: 0, y: 0 }, open);
    assert.deepEqual(keys(tiles), keys([7, 8, 9].flatMap((x) => [5, 6].map((y) => ({ x, y })))));
  });

  test('a cone widens by one each side per row', () => {
    const tiles = telegraphTiles('cone', 2, { x: 5, y: 5 }, 1, 'south', { x: 0, y: 0 }, open);
    assert.equal(tiles.length, 8);
    assert.ok(keys(tiles).has('3,7') && keys(tiles).has('7,7') && keys(tiles).has('4,6'));
  });

  test('a ring surrounds the body', () => {
    assert.equal(telegraphTiles('ring', 1, { x: 5, y: 5 }, 1, 'north', { x: 0, y: 0 }, open).length, 8);
    assert.equal(telegraphTiles('ring', 2, { x: 5, y: 5 }, 1, 'north', { x: 0, y: 0 }, open).length, 24);
  });

  test('a body slam covers the body and the ring beside it', () => {
    assert.equal(telegraphTiles('body', 1, { x: 5, y: 5 }, 2, 'north', { x: 0, y: 0 }, open).length, 16);
  });

  test('a circle lands on the target', () => {
    const tiles = telegraphTiles('circleOnTarget', 1, { x: 5, y: 5 }, 1, 'north', { x: 20, y: 20 }, open);
    assert.equal(tiles.length, 9);
    assert.ok(keys(tiles).has('20,20'));
  });

  test('closed tiles are left out', () => {
    const tiles = telegraphTiles('ring', 1, { x: 5, y: 5 }, 1, 'north', { x: 0, y: 0 }, (point) => point.x !== 4);
    assert.equal(tiles.length, 5);
  });
});

describe('phases', () => {
  test('phase index follows integrity thresholds', () => {
    assert.equal(phaseIndexFor(encounter, 0.7), 0);
    assert.equal(phaseIndexFor(encounter, 0.5), 1);
    assert.equal(phaseIndexFor(encounter, 0.2), 2);
  });

  test('mechanics named by a phase start inactive', () => {
    assert.deepEqual([...activeMechanicIds(encounter, 0)].sort(), ['slam']);
    assert.deepEqual([...activeMechanicIds(encounter, 1)].sort(), ['adds', 'slam']);
    assert.deepEqual([...activeMechanicIds(encounter, 2)].sort(), ['adds', 'fury', 'slam']);
  });
});

describe('hazards and limits', () => {
  test('hazards seed near the body and never grow past their cap', () => {
    const random = seeded(7);
    let tiles = seedHazard({ x: 10, y: 10 }, 2, 3, open, random);
    assert.equal(tiles.length, 3);
    for (let round = 0; round < 20; round++) tiles = spreadHazard(tiles, open, 12, random);
    assert.equal(tiles.length, 12);
    assert.equal(keys(tiles).size, 12);
  });

  test('enrage shortens the attack interval', () => {
    assert.equal(enragedSpeedTicks(6, 2), 3);
    assert.equal(enragedSpeedTicks(3, 4), 1);
  });

  test('the telegraph hit share rises with tier', () => {
    assert.equal(telegraphHitShare(1), 0.25);
    assert.equal(telegraphHitShare(2), 0.25);
    assert.ok(Math.abs(telegraphHitShare(13) - 0.45) < 1e-9);
    assert.ok(telegraphHitShare(8) > telegraphHitShare(3));
  });
});
