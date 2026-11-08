import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, type CharacterRecord, type TilePoint } from '@containment/shared';
import { upgradeLegacyLocation } from '../src/characters/legacyLocation.ts';
import { at, createHarness, levelPoint, type Harness } from './support/testHarness.ts';

const MAIN_FLOOR_SPAWN = { levelId: 'main-floor', position: levelPoint('meridian-atrium', { x: 5, y: 28 }) };

function walkTo(harness: Harness, target: TilePoint): void {
  harness.send({ type: 'world.walk', target });
  harness.ticksUntil(() => harness.player.path.length === 0);
  assert.deepEqual(harness.player.position, target);
}

const placedAt = (location: CharacterRecord['location'], flags: readonly string[] = []) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location,
  flags: [...record.flags, ...flags],
});

describe('levels', () => {
  test('legacy locations convert to level coordinates', () => {
    assert.deepEqual(upgradeLegacyLocation({ zoneId: 'hydroponics', position: { x: 4, y: 10 } }, GAME_CONTENT), at('hydroponics', { x: 4, y: 10 }));
  });

  test('legacy locations convert to the main-floor spawn when the zone is gone', () => {
    assert.deepEqual(upgradeLegacyLocation({ zoneId: 'sector-nine', position: { x: 1, y: 1 } }, GAME_CONTENT), MAIN_FLOOR_SPAWN);
  });

  test('legacy locations on an unwalkable tile fall back to the main-floor spawn', () => {
    assert.deepEqual(upgradeLegacyLocation({ zoneId: 'meridian-atrium', position: { x: 0, y: 0 } }, GAME_CONTENT), MAIN_FLOOR_SPAWN);
  });

  test('current locations pass through unchanged', () => {
    const current = at('deepwatch', { x: 3, y: 10 });
    assert.deepEqual(upgradeLegacyLocation(current, GAME_CONTENT), current);
  });

  test('walking from the Atrium into Hydroponics needs no teleport', () => {
    const harness = createHarness({ prepare: placedAt(at('meridian-atrium', { x: 3, y: 26 })) });
    walkTo(harness, { x: 45, y: 53 });
    walkTo(harness, levelPoint('hydroponics', { x: 30, y: 23 }));
    walkTo(harness, levelPoint('hydroponics', { x: 3, y: 12 }));
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'hydroponics');
    assert.equal(harness.sink.messages.filter((message) => message.type === 'world.entered').length, 1);
  });

  test('a gated same-level lift still teleports within the level', () => {
    const harness = createHarness({ prepare: placedAt(at('deepwatch', { x: 25, y: 21 }), ['clearance.cryovault']) });
    harness.interactWithObject('dw-cryovault-lift');
    assert.equal(harness.player.levelId, 'the-deep');
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'cryovault');
  });

  test('a saved position on an unwalkable tile spawns nearby in the same district', () => {
    const harness = createHarness({ prepare: placedAt(at('intake-wing', { x: 25, y: 5 })) });
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'intake-wing');
    const target = levelPoint('intake-wing', { x: 25, y: 5 });
    assert.ok(Math.max(Math.abs(harness.player.position.x - target.x), Math.abs(harness.player.position.y - target.y)) <= 3);
  });

  test('incapacitation in the Intake Wing recovers in the Intake Wing', () => {
    const harness = createHarness({ prepare: placedAt(at('intake-wing', { x: 25, y: 5 })) });
    harness.gameplay.recoverIncapacitated(harness.player);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'intake-wing');
    assert.deepEqual(harness.player.position, levelPoint('intake-wing', { x: 4, y: 5 }));
  });
});
