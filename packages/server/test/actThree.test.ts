import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  countItem,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  visitedLevelFlag,
  type CharacterRecord,
  type EquipmentState,
  type QuestProgress,
  type WorldLocation,
} from '@containment/shared';
import { containSpecimen } from './support/containment.ts';
import { createHarness, finishDialogue, type Harness, at, districtOf } from './support/testHarness.ts';

const active = (questId: string, stepIndex = 0): QuestProgress => ({ questId, status: 'active', stepIndex, objectiveProgress: [0, 0, 0] });
const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const VETERAN = createStartingSkills({ closeQuarters: experienceForLevel(99), fortitude: experienceForLevel(99), containment: experienceForLevel(40) });
const KIT: EquipmentState = { torso: 'threshold-plate', legs: 'threshold-trousers', feet: 'threshold-boots', primary: 'the-knocker' };

const NEAR_SEL: WorldLocation = at('meridian-atrium', { x: 43, y: 5 });
const NEAR_ACHTERBERG: WorldLocation = at('signal-array', { x: 6, y: 5 });
const NEAR_CHUTE: WorldLocation = at('signal-array', { x: 41, y: 3 });
const NEAR_HALVORSEN: WorldLocation = at('sector-three', { x: 10, y: 8 });

const PRIOR_QUESTS = ['orientation-protocol', 'field-fabrication', 'live-fire', 'the-knocking', 'the-far-side', 'a-council-of-one', 'cold-storage', 'dead-air', 'original-contract', 'stoking-the-fire', 'the-answer'];

function veteranAt(location: WorldLocation, quests: Record<string, QuestProgress>, flags: readonly string[] = []) {
  return (record: CharacterRecord): CharacterRecord => ({
    ...record,
    location,
    quests: { ...Object.fromEntries(PRIOR_QUESTS.map((id) => [id, completed(id)])), ...quests },
    flags: [...record.flags, 'storyline.act-two-complete', ...flags],
    skills: VETERAN,
    vitals: { integrity: maxIntegrityFor(VETERAN) },
    equipment: KIT,
  });
}

function stepOf(harness: Harness, questId: string): number | 'completed' | undefined {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
}

function defeat(harness: Harness, instanceId: string): void {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  harness.player.update({ vitals: { integrity: maxIntegrityFor(harness.player.record.skills) } });
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.ticksUntil(() => !creature.isAlive, 8000);
  harness.ticksUntil(() => harness.player.combatTargetId === null, 2000);
}

function use(harness: Harness, instanceId: string, interactionIndex = 0): void {
  harness.interactWithObject(instanceId, interactionIndex);
  harness.ticksUntil(() => harness.player.path.length === 0, 2000);
}

function talk(harness: Harness, instanceId: string, ...choices: string[]): void {
  harness.talkTo(instanceId);
  finishDialogue(harness, choices.length ? (text) => choices.some((choice) => text.startsWith(choice)) : undefined);
}

const travel = (harness: Harness, location: WorldLocation) => harness.gameplay.teleport(harness.player, location);

describe('act three: return to sender', () => {
  test('The Ninth Letter opens the return chute into the Dead Letter Office', () => {
    const harness = createHarness({ prepare: veteranAt(NEAR_SEL, {}, ['ending.closed']) });
    const { player } = harness;

    talk(harness, 'atrium-sel', 'Let me see it');
    assert.equal(stepOf(harness, 'the-ninth-letter'), 0);
    assert.equal(countItem(player.record.inventory, 'ninth-letter'), 1);

    travel(harness, NEAR_CHUTE);
    use(harness, 'sa-return-chute');
    assert.equal(districtOf(player), 'signal-array', 'the chute stays shut until Achterberg traces the letter');

    travel(harness, NEAR_ACHTERBERG);
    talk(harness, 'sa-achterberg', 'Hand over the ninth letter');
    assert.equal(stepOf(harness, 'the-ninth-letter'), 1);
    assert.equal(countItem(player.record.inventory, 'ninth-letter'), 0);
    assert.ok(player.hasFlag('returns.chute-open'));

    travel(harness, NEAR_CHUTE);
    use(harness, 'sa-return-chute');
    assert.equal(player.levelId, 'dead-letter-office');
    assert.ok(player.hasFlag(visitedLevelFlag('dead-letter-office')));
    assert.equal(stepOf(harness, 'the-ninth-letter'), 2);

    talk(harness, 'dlo-oduya');
    assert.equal(stepOf(harness, 'the-ninth-letter'), 'completed');
    assert.equal(stepOf(harness, 'dead-letter-office'), 0);

    use(harness, 'dlo-return');
    assert.equal(districtOf(player), 'signal-array');
  });

  test('The Dead Letter Office: clerks, pigeonholes, the Postmaster and the founder\'s letter', () => {
    const harness = createHarness({
      prepare: veteranAt(at('dead-letter-office', { x: 4, y: 5 }), { 'the-ninth-letter': completed('the-ninth-letter'), 'dead-letter-office': active('dead-letter-office') }),
    });
    const { player } = harness;

    use(harness, 'dlo-sorting-pigeonhole-a');
    assert.equal(stepOf(harness, 'dead-letter-office'), 0, 'the pigeonholes wait for the clerks');

    for (const clerk of ['dlo-clerk-a', 'dlo-clerk-b', 'dlo-clerk-c', 'dlo-clerk-d', 'dlo-clerk-e', 'dlo-clerk-f']) defeat(harness, clerk);
    assert.equal(stepOf(harness, 'dead-letter-office'), 1);

    const research = player.record.skills.research;
    for (const hole of ['dlo-sorting-pigeonhole-a', 'dlo-sorting-pigeonhole-b', 'dlo-stacks-pigeonhole-a', 'dlo-stacks-pigeonhole-b']) use(harness, hole);
    assert.equal(stepOf(harness, 'dead-letter-office'), 2);
    assert.equal(player.record.skills.research, research + 4 * 700);

    use(harness, 'dlo-engine');
    assert.equal(stepOf(harness, 'dead-letter-office'), 2, 'the engine keeps stamping while the Postmaster signs');

    containSpecimen(harness, 'dlo-postmaster');
    assert.equal(stepOf(harness, 'dead-letter-office'), 3);

    use(harness, 'dlo-engine');
    assert.equal(stepOf(harness, 'dead-letter-office'), 4);

    talk(harness, 'dlo-oduya', "I'll carry it");
    assert.equal(stepOf(harness, 'dead-letter-office'), 'completed');
    assert.equal(countItem(player.record.inventory, 'founders-letter'), 1);
    assert.equal(stepOf(harness, 'return-to-sender'), 0);
  });

  test('Return to Sender: Halvorsen countersigns, Achterberg sends, Sel files it', () => {
    const harness = createHarness({
      prepare: (record) => {
        const prepared = veteranAt(NEAR_HALVORSEN, { 'the-ninth-letter': completed('the-ninth-letter'), 'dead-letter-office': completed('dead-letter-office'), 'return-to-sender': active('return-to-sender') }, ['ending.welcomed'])(record);
        return { ...prepared, inventory: [{ itemId: 'founders-letter', quantity: 1 }, ...prepared.inventory] };
      },
    });
    const { player } = harness;

    talk(harness, 's3-halvorsen', 'It needs the signature');
    assert.equal(stepOf(harness, 'return-to-sender'), 1);
    assert.equal(countItem(player.record.inventory, 'founders-letter'), 0);
    assert.equal(countItem(player.record.inventory, 'countersigned-letter'), 1);

    travel(harness, NEAR_ACHTERBERG);
    talk(harness, 'sa-achterberg', 'Hand over the countersigned letter');
    assert.equal(stepOf(harness, 'return-to-sender'), 2);
    assert.equal(countItem(player.record.inventory, 'countersigned-letter'), 0);

    travel(harness, NEAR_SEL);
    talk(harness, 'atrium-sel', "It's sent");
    assert.equal(stepOf(harness, 'return-to-sender'), 'completed');
    assert.ok(player.hasFlag('storyline.act-three-complete'));
  });
});
