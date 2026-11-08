import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, type CharacterRecord, type TilePoint } from '@containment/shared';
import { upgradeLegacyLocation } from '../src/characters/legacyLocation.ts';
import { at, createHarness, levelPoint, type Harness } from './support/testHarness.ts';

const MAIN_FLOOR_SPAWN = { levelId: 'main-floor', position: levelPoint('meridian-atrium', { x: 6, y: 31 }) };

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
    const harness = createHarness({ prepare: placedAt(at('meridian-atrium', { x: 3, y: 24 })) });
    walkTo(harness, levelPoint('verdance-concourse', { x: 9, y: 2 }));
    walkTo(harness, levelPoint('hydroponics', { x: 30, y: 23 }));
    walkTo(harness, levelPoint('hydroponics', { x: 3, y: 12 }));
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'hydroponics');
    assert.equal(harness.sink.messages.filter((message) => message.type === 'world.entered').length, 1);
  });

  test('walking from the Atrium out to the Service Yards needs no teleport', () => {
    const harness = createHarness({ prepare: placedAt(at('meridian-atrium', { x: 45, y: 24 })) });
    walkTo(harness, levelPoint('service-concourse', { x: 7, y: 3 }));
    walkTo(harness, levelPoint('service-yards', { x: 6, y: 13 }));
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'service-yards');
    assert.equal(harness.sink.messages.filter((message) => message.type === 'world.entered').length, 1);
  });

  test('Deepwatch opens onto the Deep Concourse on foot, and a gated pressure door leads on', () => {
    const harness = createHarness({ prepare: placedAt(at('deepwatch', { x: 29, y: 21 }), ['clearance.signal-array']) });
    walkTo(harness, levelPoint('deep-concourse', { x: 70, y: 3 }));
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'deep-concourse');
    harness.interactWithObject('dc-array-door-a');
    harness.ticksUntil(() => harness.player.path.length === 0);
    assert.equal(harness.player.levelId, 'the-deep');
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'signal-array');
  });

  test('a pressure door stays shut without clearance', () => {
    const harness = createHarness({ prepare: placedAt(at('deep-concourse', { x: 7, y: 4 })) });
    harness.interactWithObject('dc-cryovault-door-a');
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'deep-concourse');
    assert.match(harness.sink.last('notice')?.text ?? '', /COLD STORAGE SEALED/);
  });

  test('a cleared player walks straight through a joined pressure door, and it stays open for them alone', () => {
    const harness = createHarness({ prepare: placedAt(at('deep-concourse', { x: 5, y: 3 }), ['clearance.cryovault']) });
    walkTo(harness, levelPoint('cryovault', { x: 5, y: 3 }));
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'cryovault');
    assert.ok(harness.sink.last('player.state')?.self.openDoors.includes('cryovault-door'));

    const level = harness.gameplay.world.levelOf(harness.player);
    const door = levelPoint('deep-concourse', { x: 5, y: 6 });
    assert.equal(level.grid.isWalkable(door), false, 'the shared grid keeps the door shut for everyone else');
    assert.equal(level.creatureGrid.isWalkable(door), false, 'creatures never pass a door');
  });

  test('a door you have opened stays open after the key is gone', () => {
    const harness = createHarness({ prepare: placedAt(at('deep-concourse', { x: 5, y: 4 }), ['clearance.cryovault']) });
    harness.interactWithObject('dc-cryovault-door-a');
    harness.ticksUntil(() => harness.player.path.length === 0);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'cryovault');
    harness.player.update({ flags: harness.player.record.flags.filter((flag) => flag !== 'clearance.cryovault') });
    walkTo(harness, levelPoint('deep-concourse', { x: 5, y: 3 }));
  });

  test('Deepwatch reaches the Furnace Causeway on foot', () => {
    const harness = createHarness({ prepare: placedAt(at('deepwatch', { x: 30, y: 18 })) });
    walkTo(harness, levelPoint('furnace-causeway', { x: 10, y: 3 }));
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'furnace-causeway');
  });

  test('a saved position on an unwalkable tile spawns nearby in the same district', () => {
    const harness = createHarness({ prepare: placedAt(at('intake-wing', { x: 27, y: 5 })) });
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'intake-wing');
    const target = levelPoint('intake-wing', { x: 27, y: 5 });
    assert.ok(Math.max(Math.abs(harness.player.position.x - target.x), Math.abs(harness.player.position.y - target.y)) <= 3);
  });

  test('incapacitation in the Intake Wing recovers in the Intake Wing', () => {
    const harness = createHarness({ prepare: placedAt(at('intake-wing', { x: 27, y: 5 })) });
    harness.gameplay.recoverIncapacitated(harness.player);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'intake-wing');
    assert.deepEqual(harness.player.position, levelPoint('intake-wing', { x: 4, y: 5 }));
  });
});
