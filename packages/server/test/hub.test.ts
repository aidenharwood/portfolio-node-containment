import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countItem, createStartingSkills, experienceForLevel, maxIntegrityFor, type CharacterRecord, type WorldLocation } from '@containment/shared';
import { containSpecimen } from './support/containment.ts';
import { createHarness, finishDialogue, inRoom, type Harness } from './support/testHarness.ts';

const placed = (location: WorldLocation, changes: Partial<CharacterRecord> = {}) => (record: CharacterRecord): CharacterRecord => ({ ...record, location, ...changes });

const veteran = () => {
  const skills = createStartingSkills({ closeQuarters: experienceForLevel(30), fortitude: experienceForLevel(40) });
  return { skills, vitals: { integrity: maxIntegrityFor(skills) }, equipment: { primary: 'stun-baton' } };
};

const stepOf = (harness: Harness, questId: string): number | 'completed' | undefined => {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
};

function defeat(harness: Harness, instanceId: string): void {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  harness.approach(instanceId);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.fightUntil(() => !creature.isAlive, 2000);
}

describe('the hub', () => {
  test('the medic patches operatives up, and so does resting on a bed', () => {
    const harness = createHarness({ prepare: placed(inRoom('fx-hub', 'plaza'), { vitals: { integrity: 3 } }) });
    harness.talkTo('hub-medic');
    finishDialogue(harness, (text) => text.startsWith('Patch me up'));
    assert.equal(harness.player.integrity, harness.player.maxIntegrity);

    harness.player.setIntegrity(2);
    harness.interactWithObject('hub-bed');
    assert.equal(harness.player.integrity, harness.player.maxIntegrity);
  });
});

describe('quest engine', () => {
  test('a quest runs through talk, travel, items, kills, containment and a hand-in signal', () => {
    const harness = createHarness({ prepare: placed(inRoom('fx-hub', 'plaza'), veteran()) });
    const { player } = harness;

    harness.talkTo('hub-handler');
    finishDialogue(harness, (text) => text === 'Take it.');
    assert.equal(stepOf(harness, 'vault-run'), 0);
    harness.gameplay.handle(player, { type: 'dialogue.close' });

    harness.talkTo('hub-handler');
    finishDialogue(harness);
    assert.equal(countItem(player.record.inventory, 'vault-keycard'), 1);
    assert.equal(stepOf(harness, 'vault-run'), 1);

    harness.gameplay.teleport(player, inRoom('fx-field', 'lane', { x: 35, y: 9 }));
    harness.interactWithObject('vault-door-a');
    harness.ticksUntil(() => stepOf(harness, 'vault-run') === 2, 60);

    harness.interactWithObject('vault-terminal');
    assert.equal(countItem(player.record.inventory, 'field-log'), 1);
    assert.equal(stepOf(harness, 'vault-run'), 3);

    defeat(harness, 'den-mite-a');
    defeat(harness, 'den-mite-b');
    assert.equal(stepOf(harness, 'vault-run'), 4);

    harness.gameplay.teleport(player, inRoom('fx-arena', 'arena', { x: 1, y: 1 }));
    containSpecimen(harness, 'arena-warden');
    assert.equal(stepOf(harness, 'vault-run'), 5);

    harness.gameplay.teleport(player, inRoom('fx-hub', 'plaza'));
    harness.talkTo('hub-handler');
    finishDialogue(harness, (text) => text.startsWith('Hand over'));
    assert.equal(stepOf(harness, 'vault-run'), 'completed');
    assert.equal(countItem(player.record.inventory, 'field-log'), 0);
  });
});
