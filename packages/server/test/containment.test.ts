import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  containmentExperience,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  roundExperience,
  type CharacterRecord,
  type QuestProgress,
} from '@containment/shared';
import { createHarness, inRoom, type Harness } from './support/testHarness.ts';

const NEAR_WARDEN = inRoom('fx-arena', 'arena');

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

function operative(containmentLevel: number) {
  return (record: CharacterRecord): CharacterRecord => {
    const skills = createStartingSkills({
      closeQuarters: experienceForLevel(30),
      fortitude: experienceForLevel(40),
      containment: experienceForLevel(containmentLevel),
    });
    return {
      ...record,
      location: NEAR_WARDEN,
      quests: { 'live-fire': completed('live-fire') },
      skills,
      vitals: { integrity: maxIntegrityFor(skills) },
      flags: record.flags,
      equipment: { ...record.equipment, primary: 'stun-baton' },
    };
  };
}

function onTheWardenStep(prepare: (record: CharacterRecord) => CharacterRecord) {
  return (record: CharacterRecord): CharacterRecord => {
    const prepared = prepare(record);
    return { ...prepared, quests: { ...prepared.quests, 'vault-run': { questId: 'vault-run', status: 'active', stepIndex: 4, objectiveProgress: [0] } } };
  };
}

function warden(harness: Harness) {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance('arena-warden');
  assert.ok(creature);
  return creature;
}

const notices = (harness: Harness) => harness.sink.messages.flatMap((message) => (message.type === 'notice' ? [message.text] : []));

describe('containment', () => {
  test('a qualified operative wears a boss down, contains it and collects the bonus', () => {
    const harness = createHarness({ prepare: operative(6) });
    const creature = warden(harness);
    const containmentBefore = harness.player.record.skills.containment;

    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 1 });
    assert.ok(notices(harness).some((text) => text.includes('too strong')));

    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 0 });
    harness.ticksUntil(() => harness.player.heldFireOn === creature.entityId, 2000);
    assert.ok(creature.isAlive);
    assert.ok(creature.integrity <= 3 && creature.integrity >= 1);

    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 1 });
    harness.ticksUntil(() => !creature.isAlive, 50);

    assert.equal(roundExperience(harness.player.record.skills.containment - containmentBefore), containmentExperience(creature.definition));
    const ground = [...harness.gameplay.world.levelOf(harness.player).groundItems.values()];
    const scrip = ground.filter((item) => item.itemId === 'meridian-scrip' && item.ownerId === harness.player.entityId).reduce((total, item) => total + item.quantity, 0);
    assert.equal(scrip, 5 + 10, 'the regular drop and the containment bonus both land');
    assert.ok(harness.sink.messages.some((message) => message.type === 'chat.message' && message.text.startsWith('Containment bonus:')));
    assert.ok(harness.sink.messages.some((message) => message.type === 'combat.death' && message.containedBy === harness.player.entityId));
  });

  test('containment pays combat experience as well as Containment experience', () => {
    const harness = createHarness({ prepare: operative(6) });
    const creature = warden(harness);
    const before = { ...harness.player.record.skills };
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 0 });
    harness.ticksUntil(() => harness.player.heldFireOn === creature.entityId, 2000);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 1 });
    harness.ticksUntil(() => !creature.isAlive, 50);
    const after = harness.player.record.skills;
    assert.ok(after.containment >= before.containment + containmentExperience(creature.definition));
    const combatGain = after.closeQuarters - before.closeQuarters + after.fortitude - before.fortitude;
    assert.ok(combatGain > 0, 'combat experience is paid on containment');
  });

  test('containing a storyline boss advances its contain objective', () => {
    const harness = createHarness({ prepare: onTheWardenStep(operative(6)) });
    const creature = warden(harness);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 0 });
    harness.ticksUntil(() => harness.player.heldFireOn === creature.entityId, 2000);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 1 });
    harness.ticksUntil(() => !creature.isAlive, 50);
    assert.ok(harness.sink.messages.some((message) => message.type === 'combat.death' && message.containedBy === harness.player.entityId));
    assert.equal(harness.player.record.quests['vault-run']?.stepIndex, 5);
  });

  test('an operative ordered to contain a boss holds back even below the level', () => {
    const harness = createHarness({ prepare: onTheWardenStep(operative(2)) });
    const creature = warden(harness);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 0 });
    harness.ticksUntil(() => harness.player.heldFireOn === creature.entityId, 2000);
    assert.ok(creature.isAlive);
    assert.ok(notices(harness).some((text) => text.includes('your orders are to contain it') && text.includes('Containment level 3')));
    assert.equal(harness.player.record.quests['vault-run']?.stepIndex, 4);
  });

  test('containment is refused below the specimen level', () => {
    const harness = createHarness({ prepare: operative(2) });
    const creature = warden(harness);
    creature.integrity = 1;
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 1 });
    assert.ok(notices(harness).some((text) => text.includes('Containment level 3')));
    assert.equal(harness.player.containTargetId, null);
  });

  test('an operative can choose to finish a weakened specimen instead', () => {
    const harness = createHarness({ prepare: operative(6) });
    const creature = warden(harness);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 0 });
    harness.ticksUntil(() => harness.player.heldFireOn === creature.entityId, 2000);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 0 });
    harness.ticksUntil(() => !creature.isAlive, 200);
    assert.ok(!harness.sink.messages.some((message) => message.type === 'combat.death' && message.containedBy !== undefined));
  });

  test('below the containment level an operative fights a boss to the end as before', () => {
    const harness = createHarness({ prepare: operative(2) });
    const creature = warden(harness);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: 0 });
    harness.ticksUntil(() => !creature.isAlive, 2000);
    assert.equal(harness.player.heldFireOn, null);
  });
});
