import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { depletionChance, MIN_DEPLETION_CHANCE, TIER_LEVEL_FLOORS, type GatheringSource } from '../src/index.ts';

const source = (level: number): GatheringSource => ({
  skill: 'salvage',
  level,
  itemId: 'scrap-metal',
  experience: 10,
  attemptTicks: 4,
  charges: 5,
  respawnTicks: 30,
  progressVerb: 'Salvaging',
});

describe('node depletion', () => {
  test('tier one nodes rarely spend a charge and top tier nodes always do', () => {
    assert.equal(depletionChance(source(1)), MIN_DEPLETION_CHANCE);
    assert.equal(depletionChance(source(TIER_LEVEL_FLOORS[TIER_LEVEL_FLOORS.length - 1] ?? 35)), 1);
  });

  test('depletion grows with each tier', () => {
    const chances = TIER_LEVEL_FLOORS.map((floor) => depletionChance(source(floor)));
    chances.slice(1).forEach((chance, index) => assert.ok(chance > (chances[index] ?? 1)));
  });
});
