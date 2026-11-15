import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyBoost, boostGroups, boostStats, boostViews, describeBoost, expireBoosts, formatBoostDuration, isBoostRedundant, restoreBoosts, storeBoosts, supersededStats } from '../src/character/boosts.ts';
import { shieldedHazardDamage } from '../src/combat/combatMath.ts';

test('the same medicine refreshes its boost instead of stacking', () => {
  const first = applyBoost([], 'salve', { stats: { armor: 8 }, durationTicks: 100 }, 0);
  const again = applyBoost(first, 'salve', { stats: { armor: 8 }, durationTicks: 100 }, 50);
  assert.equal(again.length, 1);
  assert.equal(again[0]?.expiresAtTick, 150);
});

test('different medicines take the strongest bonus for each stat', () => {
  const boosts = applyBoost(applyBoost([], 'salve', { stats: { armor: 8, deflection: 8 }, durationTicks: 100 }, 0), 'bloom', { stats: { armor: 12 }, durationTicks: 100 }, 0);
  const totals = boostStats(boosts);
  assert.equal(totals.armor, 12);
  assert.equal(totals.deflection, 8);
  assert.equal(totals.power, 0);
});

test('boosts expire on their tick and report what is left', () => {
  const boosts = applyBoost([], 'tonic', { stats: { insight: 2 }, durationTicks: 10 }, 0);
  assert.equal(boostViews(boosts, 4, 300)[0]?.remainingMs, 1800);
  assert.equal(expireBoosts(boosts, 9).expired.length, 0);
  assert.equal(expireBoosts(boosts, 10).expired.length, 1);
});

test('boosts read as stat names and a clock', () => {
  assert.equal(describeBoost({ power: 8, accuracy: 8 }), '+8 Power, +8 Accuracy');
  assert.equal(formatBoostDuration(240_000), '4:00');
  assert.equal(formatBoostDuration(61_500), '1:02');
});

test('a refreshed boost keeps its place in the bar', () => {
  const salve = { stats: { armor: 8 }, durationTicks: 100 };
  const tonic = { stats: { insight: 2 }, durationTicks: 100 };
  const boosts = applyBoost(applyBoost(applyBoost([], 'salve', salve, 0), 'tonic', tonic, 0), 'salve', salve, 40);
  assert.deepEqual(boosts.map((boost) => boost.itemId), ['salve', 'tonic']);
});

test('a weaker dose under a stronger one is marked superseded and redundant', () => {
  const boosts = applyBoost(applyBoost([], 'poultice', { stats: { armor: 2 }, durationTicks: 100 }, 0), 'bloom', { stats: { armor: 16, deflection: 16 }, durationTicks: 100 }, 0);
  assert.deepEqual([...supersededStats(boosts, 'poultice')], ['armor']);
  assert.equal(supersededStats(boosts, 'bloom').size, 0);
  assert.equal(isBoostRedundant(boosts, 'poultice', { armor: 2 }), true);
  assert.equal(isBoostRedundant(boosts, 'red', { power: 8 }), false);
});

test('boosts survive logout with the time they had left', () => {
  const boost = { stats: { armor: 8 }, durationTicks: 100 };
  const stored = storeBoosts(applyBoost([], 'salve', boost, 0), 30);
  assert.deepEqual(stored, [{ itemId: 'salve', remainingTicks: 70 }]);
  const restored = restoreBoosts(stored, (itemId) => (itemId === 'salve' ? boost : undefined), 500);
  assert.equal(restored[0]?.expiresAtTick, 570);
  assert.equal(boostViews(restored, 500, 300)[0]?.durationMs, 30_000);
  assert.deepEqual(restoreBoosts([{ itemId: 'gone', remainingTicks: 5 }], () => undefined, 0), []);
});

test('boost labels group stats that share a value', () => {
  assert.deepEqual(boostGroups({ armor: 16, deflection: 16, cognitiveWard: 16, hazardShielding: 6 }), [
    { value: 16, stats: ['armor', 'deflection', 'cognitiveWard'] },
    { value: 6, stats: ['hazardShielding'] },
  ]);
});

test('hazard shielding softens hazard damage but never to nothing', () => {
  assert.equal(shieldedHazardDamage(10, 0), 10);
  assert.equal(shieldedHazardDamage(10, 40), 5);
  assert.equal(shieldedHazardDamage(1, 400), 1);
  assert.equal(shieldedHazardDamage(0, 10), 0);
});
