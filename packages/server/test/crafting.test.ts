import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, type CharacterRecord, type WorldLocation } from '@containment/shared';
import { anchor, createHarness, type Harness, inRoom, levelPoint, localInRoom } from './support/testHarness.ts';

const WORKSHOP: WorldLocation = inRoom('fx-hub', 'plaza');
const FIELD: WorldLocation = anchor('fx-field', 'laneByNode');

const atWorkshop = () => (record: CharacterRecord): CharacterRecord => ({ ...record, location: WORKSHOP });

const carried = (harness: Harness, itemId: string) => countItem(harness.player.record.inventory, itemId);

function gatherFrom(harness: Harness, instanceId: string, itemId: string, count: number): void {
  const target = carried(harness, itemId) + count;
  harness.interactWithObject(instanceId);
  harness.ticksUntil(() => carried(harness, itemId) >= target || harness.player.activity === null, 400);
  if (carried(harness, itemId) < target) gatherFrom(harness, instanceId, itemId, target - carried(harness, itemId));
}

function craftAt(harness: Harness, stationInstanceId: string, recipeId: string, quantity: number): void {
  harness.interactWithObject(stationInstanceId);
  assert.ok(harness.player.craftingStation, `${stationInstanceId} opens a crafting window`);
  harness.send({ type: 'crafting.make', recipeId, quantity });
  harness.ticksUntil(() => harness.player.activity === null, 400);
}

describe('gathering, refining and assembly', () => {
  test('salvage is gathered, refined into parts, assembled into gear and compounded into medicine', () => {
    const harness = createHarness({ prepare: (record) => ({ ...record, location: FIELD }) });
    gatherFrom(harness, 'field-scrap-a', 'scrap-alloy', 4);
    assert.ok(harness.player.record.skills.salvage > 0);
    harness.gameplay.teleport(harness.player, WORKSHOP);
    craftAt(harness, 'hub-refinery', 'refinery:alloy-plate', 2);
    assert.equal(carried(harness, 'alloy-plate'), 2);
    assert.equal(carried(harness, 'scrap-alloy'), 0);
    craftAt(harness, 'hub-fabricator', 'fabricator:stun-baton', 1);
    assert.equal(carried(harness, 'stun-baton'), 1);
    harness.player.update({ inventory: [{ itemId: 'gel-sac', quantity: 1 }, ...harness.player.record.inventory.slice(1)] });
    const medgel = carried(harness, 'medgel');
    craftAt(harness, 'hub-synthesiser', 'synthesiser:medgel', 1);
    assert.equal(carried(harness, 'medgel'), medgel + 1);
    assert.ok(harness.player.record.skills.refining > 0 && harness.player.record.skills.engineering > 0 && harness.player.record.skills.biochemistry > 0);
  });

  test('a resource node runs dry, tells the level, and replenishes', () => {
    const harness = createHarness({ prepare: (record) => ({ ...record, location: FIELD }) });
    harness.interactWithObject('field-scrap-b');
    harness.ticksUntil(() => harness.player.activity === null, 400);
    assert.equal(carried(harness, 'scrap-alloy'), 6);
    assert.deepEqual(harness.sink.last('world.objectDepleted'), { type: 'world.objectDepleted', instanceId: 'field-scrap-b', depleted: true });

    harness.interactWithObject('field-scrap-b');
    assert.equal(harness.player.activity, null, 'an exhausted node refuses work');
    harness.ticksUntil(() => harness.sink.last('world.objectDepleted')?.depleted === false, 200);
  });

  test('gathering and crafting are gated by skill level and validated on the server', () => {
    const harness = createHarness({ prepare: (record) => ({ ...record, location: FIELD }) });
    harness.interactWithObject('field-deep-scrap');
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Salvage level 3/);

    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 1 });
    assert.equal(harness.player.activity, null, 'crafting needs an open station');

    harness.gameplay.teleport(harness.player, WORKSHOP);
    harness.player.update({ inventory: [{ itemId: 'alloy-plate', quantity: 5 }, ...harness.player.record.inventory.slice(1)] });
    harness.interactWithObject('hub-fabricator');
    harness.send({ type: 'crafting.make', recipeId: 'fabricator:heavy-maul', quantity: 1 });
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Engineering level 5/);

    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 1 });
    assert.match(harness.sink.last('notice')?.text ?? '', /not loaded on this station/);
  });

  test('walking away stops work and closes the station', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    harness.player.update({ inventory: [{ itemId: 'scrap-alloy', quantity: 10 }, ...harness.player.record.inventory.slice(1)] });
    harness.interactWithObject('hub-refinery');
    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 5 });
    assert.equal(harness.player.activity?.kind, 'craft');
    harness.send({ type: 'world.walk', target: levelPoint('fx-hub', localInRoom('fx-hub', 'hall')) });
    assert.equal(harness.player.activity, null);
    assert.equal(harness.player.craftingStation, null);
    assert.equal(harness.sink.last('crafting.closed')?.type, 'crafting.closed');
  });
});
