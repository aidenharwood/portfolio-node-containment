import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, tramStationFlag, type CharacterRecord, type QuestProgress } from '@containment/shared';
import { createHarness, finishDialogue, type Harness, at, districtOf, levelPoint } from './support/testHarness.ts';

const ORIENTATION = 'orientation-protocol';
const TRANSIT = 'cleared-for-transit';

const currentStep = (harness: Harness, questId = ORIENTATION): number | 'completed' | undefined => {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
};

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const readyToLeave = (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: at('intake-wing', { x: 52, y: 5 }),
  quests: { [ORIENTATION]: completed(ORIENTATION), 'field-fabrication': completed('field-fabrication'), 'live-fire': completed('live-fire') },
  inventory: [{ itemId: 'meridian-scrip', quantity: 30 }, ...record.inventory.slice(1)],
});

describe('orientation protocol tutorial', () => {
  test('a new operative is processed through the Intake Wing and handed to the workshop', () => {
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

    harness.send({ type: 'world.walk', target: levelPoint('intake-wing', { x: 33, y: 7 }) });
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
    assert.equal(currentStep(harness), 'completed');
    assert.equal(countItem(player.record.inventory, 'operative-badge'), 1);
    assert.equal(countItem(player.record.inventory, 'meridian-scrip'), 50);
    assert.equal(currentStep(harness, 'field-fabrication'), 0);
    assert.equal(districtOf(player), 'intake-wing');
  });

  test('the issue locker can only be looted once', () => {
    const harness = createHarness();
    harness.talkTo('intake-reyes');
    finishDialogue(harness);
    harness.interactWithObject('issue-locker');
    harness.interactWithObject('issue-locker');
    assert.equal(countItem(harness.player.record.inventory, 'field-vest-mk1'), 1);
  });

  test('leaving Reyes on the first line still hands over the clearance card', () => {
    const harness = createHarness();
    harness.talkTo('intake-reyes');
    harness.send({ type: 'world.walk', target: levelPoint('intake-wing', { x: 2, y: 6 }) });
    assert.equal(harness.player.dialogue, null);
    assert.equal(currentStep(harness), 1);
    assert.equal(countItem(harness.player.record.inventory, 'clearance-card-l1'), 1);
  });

  test('Reyes reissues a missing clearance card', () => {
    const harness = createHarness({
      prepare: (record) => ({ ...record, quests: { [ORIENTATION]: { questId: ORIENTATION, status: 'active', stepIndex: 1, objectiveProgress: [0] } } }),
    });
    assert.equal(countItem(harness.player.record.inventory, 'clearance-card-l1'), 0);
    harness.talkTo('intake-reyes');
    finishDialogue(harness, (text) => text.includes('clearance card'));
    assert.equal(countItem(harness.player.record.inventory, 'clearance-card-l1'), 1);
    harness.interactWithObject('issue-locker');
    assert.equal(currentStep(harness), 2);
  });

  test('the locker refuses operatives without a clearance card', () => {
    const harness = createHarness();
    harness.interactWithObject('issue-locker');
    assert.equal(countItem(harness.player.record.inventory, 'field-vest-mk1'), 0);
    assert.match(harness.sink.last('notice')?.text ?? '', /clearance card/);
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

describe('cleared for transit', () => {
  test('Hale signs off, sells a transit pass, and the tram carries the operative to the Atrium', () => {
    const harness = createHarness({ prepare: readyToLeave });
    const { player } = harness;
    assert.equal(currentStep(harness, TRANSIT), 0);

    harness.talkTo('intake-hale');
    finishDialogue(harness, (text) => text.startsWith('Show me'));
    assert.equal(currentStep(harness, TRANSIT), 1);
    assert.ok(player.shopSession, 'Hale opens the counter');

    harness.send({ type: 'shop.buy', itemId: 'transit-pass', quantity: 1 });
    assert.equal(countItem(player.record.inventory, 'transit-pass'), 1);
    assert.equal(countItem(player.record.inventory, 'meridian-scrip'), 20);
    assert.ok(player.hasFlag(tramStationFlag('atrium-transit')));
    assert.equal(currentStep(harness, TRANSIT), 2);

    harness.interactWithObject('intake-tram-car/2,0');
    assert.equal(harness.sink.last('tram.mapOpened')?.stationId, 'intake-transit');
    assert.equal(currentStep(harness, TRANSIT), 3);

    harness.send({ type: 'tram.board', destinationStationId: 'atrium-transit' });
    harness.ticksUntil(() => harness.sink.last('tram.arrived') !== undefined, 40);
    assert.equal(districtOf(player), 'meridian-atrium');
    assert.equal(currentStep(harness, TRANSIT), 'completed');
    assert.equal(countItem(player.record.inventory, 'transit-pass'), 0);
    assert.equal(currentStep(harness, 'the-knocking'), 0);
  });

  test('the intake tram will not run to the Atrium before the pass is bought', () => {
    const harness = createHarness({ prepare: (record) => ({ ...readyToLeave(record), location: at('intake-wing', { x: 52, y: 19 }) }) });
    harness.send({ type: 'tram.board', destinationStationId: 'atrium-transit' });
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /not found that station/);
    assert.equal(districtOf(harness.player), 'intake-wing');
  });

  test('veterans who already started the storyline are not sent back to Intake', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...record,
        location: at('meridian-atrium', { x: 25, y: 20 }),
        quests: { 'live-fire': completed('live-fire'), 'the-knocking': completed('the-knocking') },
      }),
    });
    assert.equal(harness.player.record.quests[TRANSIT], undefined);
  });

  test('a quest left on a retired step completes on login', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...record,
        location: at('meridian-atrium', { x: 25, y: 20 }),
        quests: { [ORIENTATION]: { questId: ORIENTATION, status: 'active', stepIndex: 8, objectiveProgress: [0] } },
      }),
    });
    assert.equal(currentStep(harness), 'completed');
    assert.equal(countItem(harness.player.record.inventory, 'operative-badge'), 1);
    assert.equal(currentStep(harness, 'field-fabrication'), 0);
  });
});

describe('returning trainees', () => {
  test('an operative still in training is returned to the Intake Wing on login', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...record,
        location: at('meridian-atrium', { x: 25, y: 20 }),
        quests: { [ORIENTATION]: { questId: ORIENTATION, status: 'active', stepIndex: 1, objectiveProgress: [0] } },
      }),
    });
    assert.equal(districtOf(harness.player), 'intake-wing');
  });

  test('an operative mid-ride to the Atrium is left where the tram put them', () => {
    const harness = createHarness({
      prepare: (record) => ({
        ...readyToLeave(record),
        location: at('meridian-atrium', { x: 6, y: 31 }),
        quests: { ...readyToLeave(record).quests, [TRANSIT]: { questId: TRANSIT, status: 'active', stepIndex: 3, objectiveProgress: [0] } },
      }),
    });
    assert.equal(districtOf(harness.player), 'meridian-atrium');
    harness.gameplay.tick();
    assert.equal(currentStep(harness, TRANSIT), 'completed');
  });

  test('the Intake station is always on the board, so anyone can ride back', () => {
    const harness = createHarness({
      prepare: (record) => ({ ...record, location: at('meridian-atrium', { x: 6, y: 31 }), quests: { [ORIENTATION]: completed(ORIENTATION), 'the-knocking': completed('the-knocking') } }),
    });
    harness.send({ type: 'tram.board', destinationStationId: 'intake-transit' });
    assert.equal(harness.player.activity?.kind, 'tram');
  });
});
