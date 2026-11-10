import assert from 'node:assert/strict';
import { clearanceFlag, clearanceTierFor, containmentLevelFor, experienceForLevel, levelForExperience, maxIntegrityFor } from '@containment/shared';
import type { Harness } from './testHarness.ts';

export function equipForContainment(harness: Harness, instanceId: string): void {
  const { player } = harness;
  const creature = harness.gameplay.world.levelOf(player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  const required = containmentLevelFor(creature.definition);
  const skills =
    levelForExperience(player.record.skills.containment) < required ? { ...player.record.skills, containment: experienceForLevel(required) } : player.record.skills;
  const flags = [...player.record.flags, ...Array.from({ length: clearanceTierFor(creature.definition) }, (_, index) => clearanceFlag(index + 1))];
  player.update({ skills, flags: [...new Set(flags)] });
}

export function containSpecimen(harness: Harness, instanceId: string, limit = 8000): void {
  const { player } = harness;
  const creature = harness.gameplay.world.levelOf(player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  equipForContainment(harness, instanceId);
  player.update({ vitals: { integrity: maxIntegrityFor(player.record.skills) } });
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.ticksUntil(() => player.heldFireOn === creature.entityId, limit);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 1 });
  harness.ticksUntil(() => !creature.isAlive, 200);
  harness.ticksUntil(() => player.combatTargetId === null, 2000);
}
