import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, type CharacterRecord, type QuestProgress, type ZoneLocation } from '@containment/shared';
import { createHarness, finishDialogue, type Harness } from './support/testHarness.ts';

const WORKSHOP: ZoneLocation = { zoneId: 'meridian-atrium', position: { x: 3, y: 12 } };

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

    harness.talkTo('atrium-pell');
    finishDialogue(harness);
    assert.equal(stepOf(harness, 'field-fabrication'), 1);

    gatherFrom(harness, 'workshop-scrap-a', 'scrap-alloy', 6);
    gatherFrom(harness, 'workshop-textiles', 'synthweave-offcut', 6);
    gatherFrom(harness, 'workshop-textiles-b', 'synthweave-offcut', 2);
    gatherFrom(harness, 'workshop-moss-a', 'gloam-moss', 2);
    assert.equal(stepOf(harness, 'field-fabrication'), 2);
    assert.ok(harness.player.record.skills.salvage > 0);

    craftAt(harness, 'workshop-refinery', 'refinery:alloy-plate', 3);
    craftAt(harness, 'workshop-refinery', 'refinery:synthweave-bolt', 4);
    craftAt(harness, 'workshop-refinery', 'refinery:gel-base', 1);
    assert.equal(stepOf(harness, 'field-fabrication'), 3);
    assert.equal(carried(harness, 'scrap-alloy'), 0);

    craftAt(harness, 'workshop-fabricator', 'fabricator:intake-trousers', 1);
    craftAt(harness, 'workshop-fabricator', 'fabricator:work-boots', 1);
    craftAt(harness, 'workshop-fabricator', 'fabricator:stun-baton', 1);
    assert.equal(carried(harness, 'intake-trousers'), 1);
    assert.equal(carried(harness, 'work-boots'), 1);
    const medgelBefore = carried(harness, 'medgel');
    craftAt(harness, 'workshop-synthesiser', 'synthesiser:medgel', 1);
    assert.equal(carried(harness, 'stun-baton'), 1);
    assert.equal(carried(harness, 'medgel'), medgelBefore + 1);
    assert.equal(stepOf(harness, 'field-fabrication'), 4);

    harness.talkTo('atrium-pell');
    finishDialogue(harness);
    assert.equal(stepOf(harness, 'field-fabrication'), 'completed');
    assert.equal(stepOf(harness, 'live-fire'), 0);
    for (const skill of ['refining', 'engineering', 'biochemistry'] as const) assert.ok(harness.player.record.skills[skill] > 0, skill);
  });

  test('Kade accepts a home-made baton instead of issuing one', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...atWorkshop({ 'field-fabrication': completed('field-fabrication') })(record),
        location: { zoneId: 'meridian-atrium', position: { x: 36, y: 12 } },
        inventory: [{ itemId: 'stun-baton', quantity: 1 }, ...record.inventory.slice(1)],
      }),
    });
    harness.talkTo('atrium-kade');
    finishDialogue(harness, (text) => text.startsWith('I fabricated'));
    assert.equal(carried(harness, 'stun-baton'), 1);
  });

  test('a resource node runs dry, tells the zone, and replenishes', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    harness.interactWithObject('workshop-scrap-b');
    harness.ticksUntil(() => harness.player.activity === null, 400);
    assert.equal(carried(harness, 'scrap-alloy'), 6);
    assert.deepEqual(harness.sink.last('world.objectDepleted'), { type: 'world.objectDepleted', instanceId: 'workshop-scrap-b', depleted: true });

    harness.interactWithObject('workshop-scrap-b');
    assert.equal(harness.player.activity, null, 'an exhausted node refuses work');
    harness.ticksUntil(() => harness.sink.last('world.objectDepleted')?.depleted === false, 200);
  });

  test('gathering and crafting are gated by skill level and validated on the server', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    harness.interactWithObject('workshop-resin');
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Salvage level 3/);

    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 1 });
    assert.equal(harness.player.activity, null, 'crafting needs an open station');

    harness.player.update({ inventory: [{ itemId: 'hardened-steel', quantity: 3 }, { itemId: 'chitin-laminate', quantity: 2 }, ...harness.player.record.inventory.slice(2)] });
    harness.interactWithObject('workshop-fabricator');
    harness.send({ type: 'crafting.make', recipeId: 'fabricator:composite-plate', quantity: 1 });
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Engineering level 9/);

    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 1 });
    assert.match(harness.sink.last('notice')?.text ?? '', /not loaded on this station/);
  });

  test('walking away stops work and closes the station', () => {
    const harness = createHarness({ prepare: atWorkshop() });
    harness.player.update({ inventory: [{ itemId: 'scrap-alloy', quantity: 10 }, ...harness.player.record.inventory.slice(1)] });
    harness.interactWithObject('workshop-refinery');
    harness.send({ type: 'crafting.make', recipeId: 'refinery:alloy-plate', quantity: 5 });
    assert.equal(harness.player.activity?.kind, 'craft');
    harness.send({ type: 'world.walk', target: { x: 10, y: 11 } });
    assert.equal(harness.player.activity, null);
    assert.equal(harness.player.craftingStation, null);
    assert.equal(harness.sink.last('crafting.closed')?.type, 'crafting.closed');
  });
});
