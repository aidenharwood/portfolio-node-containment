import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  countItem,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  type CharacterRecord,
  type EquipmentState,
  type QuestProgress,
  type WorldLocation,
} from '@containment/shared';
import { containSpecimen } from './support/containment.ts';
import { inRoom, at, createHarness, finishDialogue, type Harness, localInRoom } from './support/testHarness.ts';

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const FIGHTER = createStartingSkills({ closeQuarters: experienceForLevel(60), fortitude: experienceForLevel(60) });
const KIT: EquipmentState = { torso: 'composite-plate', legs: 'intake-trousers', feet: 'work-boots', primary: 'stun-baton' };
const TUTORIAL = ['orientation-protocol', 'field-fabrication', 'live-fire', 'cleared-for-transit'];

const PUMP_HOUSE: WorldLocation = inRoom('waterworks', 'pump-house');
const VALVE_GALLERY: WorldLocation = inRoom('waterworks', 'valve-gallery');
const FILTRATION_BEDS: WorldLocation = inRoom('waterworks', 'filtration-beds');
const SETTLING_TANKS: WorldLocation = inRoom('waterworks', 'settling-tanks');
const OUTFALL: WorldLocation = inRoom('waterworks', 'outfall');

function graduateAt(location: WorldLocation) {
  return (record: CharacterRecord): CharacterRecord => ({
    ...record,
    location,
    quests: Object.fromEntries(TUTORIAL.map((id) => [id, completed(id)])),
    skills: FIGHTER,
    vitals: { integrity: maxIntegrityFor(FIGHTER) },
    equipment: KIT,
  });
}

function stepOf(harness: Harness, questId: string): number | 'completed' | undefined {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
}

function talk(harness: Harness, ...choices: string[]): void {
  harness.talkTo('ww-ngata');
  finishDialogue(harness, choices.length ? (text) => choices.some((choice) => text.startsWith(choice)) : undefined);
}

function use(harness: Harness, instanceId: string): void {
  harness.interactWithObject(instanceId, 0);
  harness.ticksUntil(() => harness.player.path.length === 0, 2000);
}

function defeat(harness: Harness, instanceId: string): void {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  harness.player.update({ vitals: { integrity: maxIntegrityFor(harness.player.record.skills) } });
  harness.approach(instanceId);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.ticksUntil(() => !creature.isAlive, 8000);
  harness.ticksUntil(() => harness.player.combatTargetId === null, 2000);
}

const travel = (harness: Harness, location: WorldLocation) => harness.gameplay.teleport(harness.player, location);

describe('the waterworks', () => {
  test('Ngata offers nothing to someone still in the tutorial', () => {
    const harness = createHarness({
      prepare: (record) => ({ ...graduateAt(PUMP_HOUSE)(record), quests: { 'orientation-protocol': completed('orientation-protocol') } }),
    });
    talk(harness, 'Need a hand?', "I'll open them.");
    assert.equal(stepOf(harness, 'pressure-drop'), undefined);
  });

  test('the three quests run from the valve gallery to the outfall and back', () => {
    const harness = createHarness({ prepare: graduateAt(PUMP_HOUSE) });

    talk(harness, 'Need a hand?', "I'll open them.");
    assert.equal(stepOf(harness, 'pressure-drop'), 0);

    travel(harness, VALVE_GALLERY);
    for (const valve of ['ww-valve-a', 'ww-valve-b', 'ww-valve-c']) use(harness, valve);
    assert.equal(stepOf(harness, 'pressure-drop'), 1);

    for (const skimmer of ['ww-gallery-skimmer-a', 'ww-gallery-skimmer-b']) defeat(harness, skimmer);
    travel(harness, FILTRATION_BEDS);
    for (const skimmer of ['ww-beds-skimmer-c', 'ww-beds-skimmer-d', 'ww-beds-skimmer-e', 'ww-beds-skimmer-f']) defeat(harness, skimmer);
    assert.equal(stepOf(harness, 'pressure-drop'), 2);

    travel(harness, PUMP_HOUSE);
    const scripBefore = countItem(harness.player.record.inventory, 'meridian-scrip');
    talk(harness);
    assert.equal(stepOf(harness, 'pressure-drop'), 'completed');
    assert.equal(countItem(harness.player.record.inventory, 'meridian-scrip'), scripBefore + 80);

    talk(harness, 'Anything else wrong', "I'll take the samples.");
    assert.equal(stepOf(harness, 'bad-water'), 0);
    travel(harness, FILTRATION_BEDS);
    for (const tap of ['ww-tap-a', 'ww-tap-b', 'ww-tap-c']) use(harness, tap);
    assert.equal(stepOf(harness, 'bad-water'), 1);
    travel(harness, PUMP_HOUSE);
    use(harness, 'ww-assay');
    assert.equal(stepOf(harness, 'bad-water'), 2);
    talk(harness);
    assert.equal(stepOf(harness, 'bad-water'), 'completed');

    talk(harness, 'What do you want done', "I'll clear the outfall.");
    assert.equal(stepOf(harness, 'the-outfall'), 0);
    travel(harness, OUTFALL);
    use(harness, 'ww-outfall-pump');
    assert.equal(stepOf(harness, 'the-outfall'), 0, 'the pump stays choked until the outfall is cleared');

    travel(harness, SETTLING_TANKS);
    for (const bloat of ['ww-tanks-bloat-a', 'ww-tanks-bloat-b', 'ww-tanks-bloat-c', 'ww-tanks-bloat-d']) defeat(harness, bloat);
    assert.equal(stepOf(harness, 'the-outfall'), 1);

    travel(harness, OUTFALL);
    containSpecimen(harness, 'ww-outfall-mother');
    assert.equal(stepOf(harness, 'the-outfall'), 2);
    use(harness, 'ww-outfall-pump');
    assert.equal(stepOf(harness, 'the-outfall'), 3);

    travel(harness, PUMP_HOUSE);
    talk(harness);
    assert.equal(stepOf(harness, 'the-outfall'), 'completed');
    assert.equal(countItem(harness.player.record.inventory, 'composite-plate'), 1);
  });
});
