import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEATH_ANIMATION_MS, deathStartsAt, despawnAt, VitalsSchedule } from '../src/state/combatClock.ts';

test('a death waits for the killing blow to land', () => {
  assert.equal(deathStartsAt(1000, 1400), 1400);
  assert.equal(deathStartsAt(1000, 600), 1000);
});

test('a despawn during the death animation keeps the body until the animation ends', () => {
  assert.ok(despawnAt(1900, 1400) >= 1400 + DEATH_ANIMATION_MS);
  assert.equal(despawnAt(1900, null), 1900);
});

test('vitals apply in arrival order, so a heal after a pending hit is not overwritten', () => {
  const schedule = new VitalsSchedule<string>();
  const hit = schedule.slot('self', 1400);
  const heal = schedule.slot('self', 1100);
  assert.ok(heal >= hit, 'the heal is applied after the earlier hit');
});
