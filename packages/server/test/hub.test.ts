import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  countItem,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  type CharacterRecord,
  type WorldLocation,
} from '@containment/shared';
import { createHarness, finishDialogue, type Harness, at, districtOf } from './support/testHarness.ts';

const placed = (location: WorldLocation, changes: Partial<CharacterRecord> = {}) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location,
  ...changes,
});

const veteran = () => {
  const skills = createStartingSkills({
    closeQuarters: experienceForLevel(30),
    fortitude: experienceForLevel(30),
    salvage: experienceForLevel(10),
  });
  return { skills, vitals: { integrity: maxIntegrityFor(skills) } };
};

const areaOf = (harness: Harness): string[] =>
  harness.gameplay.world.levelOf(harness.player).areasAt(harness.player.position).map((area) => area.id);

function defeat(harness: Harness, instanceId: string): void {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  harness.ticksUntil(() => creature.isAlive && harness.player.combatTargetId === null, 1200);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.ticksUntil(() => !creature.isAlive, 2000);
}

describe('the Atrium hub', () => {
  test('the medbay patches operatives up, by the medic or by resting on a bed', () => {
    const harness = createHarness({ prepare: placed(at('meridian-atrium', { x: 22, y: 27 }), { vitals: { integrity: 3 } }) });
    harness.talkTo('atrium-anand');
    finishDialogue(harness, (text) => text.startsWith('Patch me up'));
    assert.equal(harness.player.integrity, harness.player.maxIntegrity);

    harness.player.setIntegrity(2);
    harness.interactWithObject('medbay-bed-a');
    assert.equal(harness.player.integrity, harness.player.maxIntegrity);
  });

});

describe('Verdance Hydroponics', () => {
  test('Overgrowth: crawlers, fibre, the seed vault and a report to Dr. Oyelaran', () => {
    const harness = createHarness({ prepare: placed(at('hydroponics', { x: 4, y: 10 }), veteran()) });
    harness.talkTo('hydro-oyelaran');
    finishDialogue(harness, (text) => text === 'Can I help?' || text === "I'll do it.");
    assert.equal(harness.player.record.quests.overgrowth?.status, 'active');

    const crawlers = ['hydro-crawler-nursery-a', 'hydro-crawler-nursery-b', 'hydro-crawler-hall-a', 'hydro-crawler-hall-b', 'hydro-crawler-hall-c'];
    for (const crawler of crawlers) defeat(harness, crawler);
    assert.equal(harness.player.record.quests.overgrowth?.stepIndex, 1);

    const fibreBefore = countItem(harness.player.record.inventory, 'vine-fibre');
    harness.interactWithObject('hydro-vine-nursery-a');
    harness.ticksUntil(() => harness.player.activity === null, 400);
    assert.ok(countItem(harness.player.record.inventory, 'vine-fibre') >= fibreBefore + 4);
    assert.equal(harness.player.record.quests.overgrowth?.stepIndex, 2);

    harness.interactWithObject('hydro-seed-vault');
    assert.equal(harness.player.record.quests.overgrowth?.stepIndex, 3);

    harness.talkTo('hydro-oyelaran');
    finishDialogue(harness);
    assert.equal(harness.player.record.quests.overgrowth?.status, 'completed');
    assert.equal(countItem(harness.player.record.inventory, 'sap-poultice'), 5);
  });

  test('strangler fibre needs Salvage 4', () => {
    const harness = createHarness({ prepare: placed(at('hydroponics', { x: 4, y: 10 })) });
    harness.interactWithObject('hydro-vine-nursery-a');
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Salvage level 4/);
  });
});
