import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem } from '@containment/shared';
import { createHarness, finishDialogue, type Harness, at, districtOf, levelPoint } from './support/testHarness.ts';

const ORIENTATION = 'orientation-protocol';

const currentStep = (harness: Harness, questId = ORIENTATION): number | 'completed' | undefined => {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
};

describe('orientation protocol tutorial', () => {
  test('a new operative can complete the full tutorial and reach the atrium', () => {
    const harness = createHarness();
    const { player } = harness;
    assert.equal(districtOf(player), 'intake-wing');
    assert.equal(currentStep(harness), 0);

    harness.talkTo('intake-reyes');
    finishDialogue(harness);
    assert.equal(countItem(player.record.inventory, 'clearance-card-l1'), 1);
    assert.equal(currentStep(harness), 1);

    harness.interactWithObject('issue-locker');
    assert.equal(countItem(player.record.inventory, 'field-vest-mk1'), 1);
    assert.equal(currentStep(harness), 2);

    harness.equipItem('field-vest-mk1');
    harness.equipItem('hazard-visor');
    assert.equal(player.record.equipment.torso, 'field-vest-mk1');
    assert.equal(countItem(player.record.inventory, 'field-vest-mk1'), 0);
    assert.equal(currentStep(harness), 3);

    const researchBefore = player.record.skills.research;
    harness.interactWithObject('diag-terminal');
    assert.ok(player.record.skills.research > researchBefore);
    assert.equal(currentStep(harness), 4);

    harness.send({ type: 'world.walk', target: levelPoint('intake-wing', { x: 23, y: 5 }) });
    harness.ticksUntil(() => currentStep(harness) === 5);

    harness.talkTo('intake-varga');
    finishDialogue(harness);
    assert.equal(currentStep(harness), 6);

    harness.interactWithObject('storeroom-cabinet');
    assert.equal(countItem(player.record.inventory, 'resonance-sample'), 1);
    assert.equal(currentStep(harness), 7);

    harness.talkTo('intake-varga');
    finishDialogue(harness, (text) => text.startsWith('Hand over'));
    assert.equal(countItem(player.record.inventory, 'resonance-sample'), 0);
    assert.ok(player.hasFlag('clearance.atrium-transit'));
    assert.equal(currentStep(harness), 8);

    harness.interactWithObject('transit-lift');
    assert.equal(districtOf(player), 'meridian-atrium');
    assert.equal(currentStep(harness), 'completed');
    assert.equal(countItem(player.record.inventory, 'operative-badge'), 1);
    assert.equal(countItem(player.record.inventory, 'meridian-scrip'), 50);
  });

  test('the issue locker can only be looted once', () => {
    const harness = createHarness();
    harness.talkTo('intake-reyes');
    finishDialogue(harness);
    harness.interactWithObject('issue-locker');
    harness.interactWithObject('issue-locker');
    assert.equal(countItem(harness.player.record.inventory, 'field-vest-mk1'), 1);
  });

  test('the locker refuses operatives without a clearance card', () => {
    const harness = createHarness();
    harness.interactWithObject('issue-locker');
    assert.equal(countItem(harness.player.record.inventory, 'field-vest-mk1'), 0);
    assert.match(harness.sink.last('notice')?.text ?? '', /clearance card/);
  });

  test('the transit lift stays locked until Dr. Varga signs off', () => {
    const harness = createHarness();
    harness.interactWithObject('transit-lift');
    assert.equal(districtOf(harness.player), 'intake-wing');
  });

  test('walking away closes an open dialogue', () => {
    const harness = createHarness();
    harness.talkTo('intake-reyes');
    harness.send({ type: 'world.walk', target: levelPoint('intake-wing', { x: 2, y: 6 }) });
    assert.equal(harness.player.dialogue, null);
    assert.equal(harness.sink.last('dialogue.closed')?.type, 'dialogue.closed');
  });

  test('leaving the world persists the character', () => {
    const harness = createHarness();
    harness.send({ type: 'world.walk', target: levelPoint('intake-wing', { x: 2, y: 6 }) });
    harness.ticksUntil(() => harness.player.path.length === 0);
    harness.gameplay.leaveWorld(harness.player);
    assert.deepEqual(harness.saved.at(-1)?.location.position, levelPoint('intake-wing', { x: 2, y: 6 }));
  });
});
