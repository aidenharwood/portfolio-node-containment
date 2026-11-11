import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, type CharacterRecord, type QuestProgress, type WorldLocation } from '@containment/shared';
import { createHarness, finishDialogue, type Harness, at, levelPoint, localInRoom } from './support/testHarness.ts';

const WORKSHOP: WorldLocation = at('intake-wing', localInRoom('intake-wing', 'workshop', { x: 15, y: 17 }));

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const atWorkshop = (quests: Record<string, QuestProgress> = { 'orientation-protocol': completed('orientation-protocol') }) =>
  (record: CharacterRecord): CharacterRecord => ({ ...record, location: WORKSHOP, quests });

const stepOf = (harness: Harness, questId: string) => {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
};

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
  test('Field Fabrication teaches gather, refine and assemble, then hands over to Live Fire', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    assert.equal(stepOf(harness, 'field-fabrication'), 0);

    harness.talkTo('intake-pell');
    finishDialogue(harness);
    assert.equal(stepOf(harness, 'field-fabrication'), 1);

    gatherFrom(harness, 'intake-scrap-a', 'scrap-alloy', 6);
    gatherFrom(harness, 'intake-textile-a', 'synthweave-offcut', 6);
    gatherFrom(harness, 'intake-textile-b', 'synthweave-offcut', 2);
    gatherFrom(harness, 'intake-moss-a', 'gloam-moss', 2);
    assert.equal(stepOf(harness, 'field-fabrication'), 2);
    assert.ok(harness.player.record.skills.salvage > 0);

    craftAt(harness, 'intake-refinery/1,0', 'refinery:alloy-plate', 3);
    craftAt(harness, 'intake-refinery/1,0', 'refinery:synthweave-bolt', 4);
    craftAt(harness, 'intake-refinery/1,0', 'refinery:gel-base', 1);
    assert.equal(stepOf(harness, 'field-fabrication'), 3);
    assert.equal(carried(harness, 'scrap-alloy'), 0);

    craftAt(harness, 'intake-fabricator/1,0', 'fabricator:intake-trousers', 1);
    craftAt(harness, 'intake-fabricator/1,0', 'fabricator:work-boots', 1);
    craftAt(harness, 'intake-fabricator/1,0', 'fabricator:stun-baton', 1);
    assert.equal(carried(harness, 'intake-trousers'), 1);
    assert.equal(carried(harness, 'work-boots'), 1);
    const medgelBefore = carried(harness, 'medgel');
    craftAt(harness, 'intake-synthesiser/1,0', 'synthesiser:medgel', 1);
    assert.equal(carried(harness, 'stun-baton'), 1);
    assert.equal(carried(harness, 'medgel'), medgelBefore + 1);
    assert.equal(stepOf(harness, 'field-fabrication'), 4);

    harness.interactWithObject('intake-workshop-storage');
    assert.equal(harness.sink.last('storage.opened')?.type, 'storage.opened');
    assert.equal(stepOf(harness, 'field-fabrication'), 5);

    harness.talkTo('intake-pell');
    finishDialogue(harness);
    assert.equal(stepOf(harness, 'field-fabrication'), 'completed');
    assert.equal(stepOf(harness, 'live-fire'), 0);
    for (const skill of ['refining', 'engineering', 'biochemistry'] as const) assert.ok(harness.player.record.skills[skill] > 0, skill);
  });

  test('Osei accepts a home-made baton instead of issuing one', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...atWorkshop({ 'field-fabrication': completed('field-fabrication') })(record),
        location: at('intake-wing', localInRoom('intake-wing', 'range-gallery', { x: 18, y: 2 })),
        inventory: [{ itemId: 'stun-baton', quantity: 1 }, ...record.inventory.slice(1)],
      }),
    });
    harness.talkTo('intake-osei');
    finishDialogue(harness, (text) => text.startsWith('I fabricated'));
    assert.equal(carried(harness, 'stun-baton'), 1);
  });

  test('a resource node runs dry, tells the level, and replenishes', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    harness.interactWithObject('intake-scrap-b');
    harness.ticksUntil(() => harness.player.activity === null, 400);
    assert.equal(carried(harness, 'scrap-alloy'), 6);
    assert.deepEqual(harness.sink.last('world.objectDepleted'), { type: 'world.objectDepleted', instanceId: 'intake-scrap-b', depleted: true });

    harness.interactWithObject('intake-scrap-b');
    assert.equal(harness.player.activity, null, 'an exhausted node refuses work');
    harness.ticksUntil(() => harness.sink.last('world.objectDepleted')?.depleted === false, 200);
  });

  test('gathering and crafting are gated by skill level and validated on the server', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    harness.interactWithObject('intake-resin');
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Salvage level 3/);

    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 1 });
    assert.equal(harness.player.activity, null, 'crafting needs an open station');

    harness.player.update({ inventory: [{ itemId: 'hardened-steel', quantity: 3 }, { itemId: 'chitin-laminate', quantity: 2 }, ...harness.player.record.inventory.slice(2)] });
    harness.interactWithObject('intake-fabricator/1,0');
    harness.send({ type: 'crafting.make', recipeId: 'fabricator:composite-plate', quantity: 1 });
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Engineering level 9/);

    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 1 });
    assert.match(harness.sink.last('notice')?.text ?? '', /not loaded on this station/);
  });

  test('walking away stops work and closes the station', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    harness.player.update({ inventory: [{ itemId: 'scrap-alloy', quantity: 10 }, ...harness.player.record.inventory.slice(1)] });
    harness.interactWithObject('intake-refinery/1,0');
    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 5 });
    assert.equal(harness.player.activity?.kind, 'craft');
    harness.send({ type: 'world.walk', target: levelPoint('intake-wing', localInRoom('intake-wing', 'workshop', { x: 21, y: 10 })) });
    assert.equal(harness.player.activity, null);
    assert.equal(harness.player.craftingStation, null);
    assert.equal(harness.sink.last('crafting.closed')?.type, 'crafting.closed');
  });
});
