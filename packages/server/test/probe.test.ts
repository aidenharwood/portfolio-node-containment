import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearanceFlag, createStartingSkills, experienceForLevel, maxIntegrityFor, type CharacterRecord } from '@containment/shared';
import { createHarness, at } from './support/testHarness.ts';

test('containing the Hollow Warden clears the warden step of The Knocking', () => {
  const harness = createHarness({
    prepare: (record: CharacterRecord): CharacterRecord => {
      const skills = createStartingSkills({ closeQuarters: experienceForLevel(30), fortitude: experienceForLevel(40), containment: experienceForLevel(6) });
      return {
        ...record,
        location: at('sector-two', { x: 25, y: 7 }),
        quests: {
          'live-fire': { questId: 'live-fire', status: 'completed', stepIndex: 0, objectiveProgress: [] },
          'the-knocking': { questId: 'the-knocking', status: 'active', stepIndex: 6, objectiveProgress: [0] },
        },
        flags: [...record.flags, clearanceFlag(1)],
        skills,
        vitals: { integrity: maxIntegrityFor(skills) },
        equipment: { ...record.equipment, primary: 'stun-baton' },
      };
    },
  });
  const { player } = harness;
  const warden = harness.gameplay.world.levelOf(player).creatureByInstance('s2-warden');
  assert.ok(warden);

  harness.approach('s2-warden');
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
  harness.ticksUntil(() => player.heldFireOn === warden.entityId, 2000);
  assert.ok(warden.isAlive, 'a cleared operative pulls their blows before the specimen breaks');

  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 1 });
  harness.ticksUntil(() => !warden.isAlive, 50);
  assert.ok(harness.sink.messages.some((message) => message.type === 'combat.death' && message.containedBy === player.entityId));

  const knocking = player.record.quests['the-knocking'];
  assert.equal(knocking?.status, 'active');
  assert.equal(knocking?.stepIndex, 7);
});
