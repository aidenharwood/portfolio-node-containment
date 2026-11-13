import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { CharacterRecord } from '@containment/shared';
import { at, createHarness, levelPoint, localInRoom } from './support/testHarness.ts';

const inYardOffice = (record: CharacterRecord): CharacterRecord => ({ ...record, location: at('service-yards', localInRoom('service-yards', 'yard-office', { x: 8, y: 0 })) });

describe('safe areas', () => {
  test('a creature drops a target who stands in a safe area, without landing a hit', () => {
    const harness = createHarness({ prepare: inYardOffice });
    const level = harness.gameplay.world.levelOf(harness.player);
    const drone = level.creatureByInstance('yd-dock-drone-a');
    assert.ok(drone);
    assert.ok(level.isSafe(harness.player.position));
    drone.position = levelPoint('service-yards', localInRoom('service-yards', 'loading-dock', { x: 8, y: 21 }));
    drone.targetId = harness.player.entityId;
    const integrity = harness.player.integrity;
    for (let tick = 0; tick < 20; tick++) harness.gameplay.tick();
    assert.equal(drone.targetId, null);
    assert.equal(harness.player.integrity, integrity);
  });

  test('creatures never path into a safe area', () => {
    const harness = createHarness({ prepare: inYardOffice });
    const level = harness.gameplay.world.levelOf(harness.player);
    const from = levelPoint('service-yards', localInRoom('service-yards', 'loading-dock', { x: 8, y: 20 }));
    const into = levelPoint('service-yards', localInRoom('service-yards', 'yard-office', { x: 8, y: 3 }));
    assert.equal(level.creaturePathBetween({ entityId: 'probe', position: from, size: 1 }, into, false), null);
    assert.ok(level.pathBetween(from, into, false));
  });

  test('aggressive creatures ignore operatives inside a safe area', () => {
    const harness = createHarness({ prepare: inYardOffice });
    const level = harness.gameplay.world.levelOf(harness.player);
    const drone = level.creatureByInstance('yd-dock-drone-a');
    assert.ok(drone);
    drone.position = levelPoint('service-yards', localInRoom('service-yards', 'loading-dock', { x: 8, y: 21 }));
    for (let tick = 0; tick < 10; tick++) harness.gameplay.tick();
    assert.equal(drone.targetId, null);
  });

  test('an operative steps out of a safe area before attacking', () => {
    const harness = createHarness({ prepare: inYardOffice });
    const level = harness.gameplay.world.levelOf(harness.player);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'yd-dock-drone-a', interactionIndex: 0 });
    harness.ticksUntil(() => harness.sink.messages.some((message) => message.type === 'combat.hit' && message.attackerId === harness.player.entityId), 200);
    assert.ok(!level.isSafe(harness.player.position));
  });
});
