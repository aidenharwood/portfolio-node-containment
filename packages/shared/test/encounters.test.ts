import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  activeMechanicIds,
  findEncounterIssues,
  telegraphHitCap,
  type GameContent,
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
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

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

describe('encounter integrity', () => {
  const withBoss = (encounterOf: EncounterDefinition) => {
    const creatures = new Map(FIXTURE_CONTENT.creatures);
    creatures.set('hollow-warden', { ...FIXTURE_CONTENT.creatures.get('hollow-warden')!, encounter: encounterOf });
    return findEncounterIssues({ ...FIXTURE_CONTENT, creatures } as GameContent).filter((issue) => issue.includes('hollow-warden') || issue.includes('s2-warden'));
  };
  const slam = { kind: 'telegraph' as const, id: 'slam', shape: 'body' as const, reach: 1, windupTicks: 6, cooldownTicks: 20, style: 'melee' as const, accuracy: 10, maxHit: 5 };

  test('the shipped content has no encounter issues', () => {
    assert.deepEqual(findEncounterIssues(FIXTURE_CONTENT), []);
  });

  test('a rushed surround telegraph is reported', () => {
    assert.ok(withBoss({ mechanics: [{ ...slam, windupTicks: 3 }] }).some((issue) => issue.includes('needs at least 4')));
  });

  test('a telegraph over the tier cap is reported', () => {
    assert.ok(withBoss({ mechanics: [{ ...slam, maxHit: telegraphHitCap(4) + 1 }] }).some((issue) => issue.includes('caps it at')));
  });

  test('thresholds must descend and enables must name mechanics', () => {
    const issues = withBoss({
      mechanics: [slam],
      phases: [
        { belowIntegrity: 0.4, announce: 'a', enables: [] },
        { belowIntegrity: 0.6, announce: 'b', enables: ['ghost'] },
      ],
    });
    assert.ok(issues.some((issue) => issue.includes('strictly descend')));
    assert.ok(issues.some((issue) => issue.includes('unknown mechanic "ghost"')));
  });

  test('summons must exist, be weaker and not be bosses', () => {
    const summon = (creatureId: string) => ({ kind: 'summon' as const, id: `s-${creatureId}`, creatureId, count: 1, maxAlive: 1 });
    const issues = withBoss({ mechanics: [summon('nobody'), summon('elder-mite'), summon('small-specimen')] });
    assert.ok(issues.some((issue) => issue.includes('unknown creature "nobody"')));
    assert.ok(issues.some((issue) => issue.includes('outranks')));
    assert.ok(issues.some((issue) => issue.includes('boss itself')));
  });

  test('a duplicate id and a single-combat area are reported', () => {
    const issues = withBoss({ mechanics: [slam, slam] });
    assert.ok(issues.some((issue) => issue.includes('used twice')));
    const multi = FIXTURE_CONTENT.districts.get('fx-arena')!.areas.find((area) => area.id === 'arena')?.multiCombat === true;
    assert.equal(issues.some((issue) => issue.includes('multi-combat')), !multi);
  });
});
