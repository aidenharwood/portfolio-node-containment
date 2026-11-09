import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  countItem,
  createStartingSkills,
  experienceForLevel,
  GAME_CONTENT,
  maxIntegrityFor,
  type CharacterRecord,
  type QuestProgress,
} from '@containment/shared';
import { createHarness, at, type Harness } from './support/testHarness.ts';

const NEAR_WARDEN = at('sector-two', { x: 25, y: 7 });

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

function operative(containmentLevel: number, seals: readonly string[]) {
  return (record: CharacterRecord): CharacterRecord => {
    const skills = createStartingSkills({
      closeQuarters: experienceForLevel(30),
      fortitude: experienceForLevel(40),
      containment: experienceForLevel(containmentLevel),
    });
    const inventory = seals.reduce((current, itemId) => addItem(current, GAME_CONTENT.items, itemId, 1).inventory, record.inventory);
    return {
      ...record,
      location: NEAR_WARDEN,
      quests: { 'live-fire': completed('live-fire') },
      skills,
      vitals: { integrity: maxIntegrityFor(skills) },
      inventory,
      equipment: { ...record.equipment, primary: 'stun-baton' },
    };
  };
}


function warden(harness: Harness) {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance('s2-warden');
  assert.ok(creature);
  return creature;
}

const notices = (harness: Harness) => harness.sink.messages.flatMap((message) => (message.type === 'notice' ? [message.text] : []));

describe('containment', () => {
  test('a qualified operative wears a boss down, contains it and collects the bonus', () => {
    const harness = createHarness({ prepare: operative(6, ['containment-seal-3']) });
    const creature = warden(harness);
    const containmentBefore = harness.player.record.skills.containment;

    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 1 });
    assert.ok(notices(harness).some((text) => text.includes('too strong')));

    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
    harness.ticksUntil(() => harness.player.heldFireOn === creature.entityId, 2000);
    assert.ok(creature.isAlive);
    assert.ok(creature.integrity <= 3 && creature.integrity >= 1);

    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 1 });
    harness.ticksUntil(() => !creature.isAlive, 50);

    assert.equal(countItem(harness.player.record.inventory, 'containment-seal-3'), 0, 'a higher-tier seal holds a lower specimen');
    assert.ok(harness.player.record.skills.containment >= containmentBefore + 300);
    const ground = [...harness.gameplay.world.levelOf(harness.player).groundItems.values()];
    const scrip = ground.filter((item) => item.itemId === 'meridian-scrip' && item.ownerId === harness.player.entityId).reduce((total, item) => total + item.quantity, 0);
    assert.equal(scrip, 25 + 40, 'the regular drop and the containment bonus both land');
    assert.ok(harness.sink.messages.some((message) => message.type === 'chat.message' && message.text.startsWith('Containment bonus:')));
    assert.ok(harness.sink.messages.some((message) => message.type === 'combat.death' && message.containedBy === harness.player.entityId));
  });

  test('containment is refused below the specimen level', () => {
    const harness = createHarness({ prepare: operative(3, ['containment-seal-2']) });
    const creature = warden(harness);
    creature.integrity = 1;
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 1 });
    assert.ok(notices(harness).some((text) => text.includes('Containment level 4')));
    assert.equal(harness.player.containTargetId, null);
  });

  test('an operative can choose to finish a weakened specimen instead', () => {
    const harness = createHarness({ prepare: operative(6, ['containment-seal-2']) });
    const creature = warden(harness);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
    harness.ticksUntil(() => harness.player.heldFireOn === creature.entityId, 2000);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
    harness.ticksUntil(() => !creature.isAlive, 200);
    assert.equal(countItem(harness.player.record.inventory, 'containment-seal-2'), 1, 'killing a specimen spends no seal');
    assert.ok(!harness.sink.messages.some((message) => message.type === 'combat.death' && message.containedBy !== undefined));
  });

  test('without a seal an operative fights a boss to the end as before', () => {
    const harness = createHarness({ prepare: operative(6, []) });
    const creature = warden(harness);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
    harness.ticksUntil(() => !creature.isAlive, 2000);
    assert.equal(harness.player.heldFireOn, null);
  });
});
