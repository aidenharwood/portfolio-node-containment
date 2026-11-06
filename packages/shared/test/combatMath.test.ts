import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  combatExperience,
  createStartingSkills,
  experienceForLevel,
  GAME_CONTENT,
  hasLineOfSight,
  hitChance,
  isWithinAttackRange,
  parseZoneLayout,
  playerAttackProfile,
  rollAttack,
} from '../src/index.ts';

const layout = parseZoneLayout([
  '#######',
  '#.....#',
  '#..#..#',
  '#.....#',
  '#######',
]);
const sightline = (from: { x: number; y: number }, to: { x: number; y: number }) => hasLineOfSight(layout, from, to);

describe('combat math', () => {
  test('hit chance rises with accuracy, falls with defence, and stays bounded', () => {
    assert.ok(hitChance(20, 5) > hitChance(5, 5));
    assert.ok(hitChance(5, 20) < hitChance(5, 5));
    assert.ok(hitChance(0, 1000) >= 0.1);
    assert.ok(hitChance(1000, 0) <= 0.95);
  });

  test('a successful roll never exceeds the max hit and a miss deals nothing', () => {
    const attack = { style: 'melee' as const, accuracy: 10, maxHit: 4, range: 1, speedTicks: 4 };
    assert.deepEqual(rollAttack(attack, 0, () => 0.999), { hit: false, damage: 0 });
    assert.deepEqual(rollAttack(attack, 0, () => 0), { hit: true, damage: 1 });
    let call = 0;
    const highDamage = () => (call++ === 0 ? 0 : 0.9999);
    assert.deepEqual(rollAttack(attack, 0, highDamage), { hit: true, damage: 4 });
  });

  test('training and weapons both improve the attack profile', () => {
    const novice = playerAttackProfile(createStartingSkills(), {}, GAME_CONTENT.items);
    const armed = playerAttackProfile(createStartingSkills(), { primary: 'stun-baton' }, GAME_CONTENT.items);
    const trained = playerAttackProfile(createStartingSkills({ closeQuarters: experienceForLevel(20) }), { primary: 'stun-baton' }, GAME_CONTENT.items);
    assert.equal(novice.style, 'melee');
    assert.ok(armed.accuracy > novice.accuracy);
    assert.ok(trained.maxHit > armed.maxHit);
    const sidearm = playerAttackProfile(createStartingSkills(), { primary: 'kestrel-sidearm' }, GAME_CONTENT.items);
    assert.equal(sidearm.style, 'ranged');
    assert.equal(sidearm.range, 6);
  });

  test('melee requires cardinal adjacency; ranged requires distance and sightline', () => {
    const melee = { style: 'melee' as const, range: 1 };
    const ranged = { style: 'ranged' as const, range: 4 };
    assert.ok(isWithinAttackRange(melee, { x: 1, y: 1 }, { x: 2, y: 1 }, sightline));
    assert.ok(!isWithinAttackRange(melee, { x: 1, y: 1 }, { x: 2, y: 2 }, sightline));
    assert.ok(isWithinAttackRange(ranged, { x: 1, y: 1 }, { x: 5, y: 1 }, sightline));
    assert.ok(!isWithinAttackRange(ranged, { x: 1, y: 2 }, { x: 5, y: 2 }, sightline), 'the wall at 3,2 blocks the shot');
  });

  test('damage awards style and fortitude experience', () => {
    assert.deepEqual(combatExperience('ranged', 3), [
      { skill: 'marksmanship', amount: 12 },
      { skill: 'fortitude', amount: 4 },
    ]);
    assert.deepEqual(combatExperience('melee', 0), []);
  });
});
