import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CALDER_GATE_FLAG,
  CALDER_NAVE_FLAG,
  countItem,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  type CharacterRecord,
  type EquipmentState,
  type QuestProgress,
  type TilePoint,
  type WorldLocation,
} from '@containment/shared';
import { at, createHarness, districtOf, finishDialogue, levelPoint, type Harness } from './support/testHarness.ts';

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const VETERAN = createStartingSkills({ closeQuarters: experienceForLevel(99), fortitude: experienceForLevel(99), containment: experienceForLevel(50) });
const KIT: EquipmentState = { torso: 'threshold-plate', legs: 'threshold-trousers', feet: 'threshold-boots', primary: 'the-knocker' };

const PRIOR_QUESTS = [
  'orientation-protocol', 'field-fabrication', 'live-fire', 'the-knocking', 'the-far-side', 'a-council-of-one', 'cold-storage', 'dead-air',
  'original-contract', 'stoking-the-fire', 'the-answer', 'the-ninth-letter', 'dead-letter-office', 'return-to-sender',
];

function veteranAt(location: WorldLocation, extraCompleted: readonly string[] = [], flags: readonly string[] = []) {
  return (record: CharacterRecord): CharacterRecord => ({
    ...record,
    location,
    quests: Object.fromEntries([...PRIOR_QUESTS, ...extraCompleted].map((id) => [id, completed(id)])),
    flags: [...record.flags, 'storyline.act-two-complete', 'storyline.act-three-complete', 'ending.closed', ...flags],
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

function use(harness: Harness, instanceId: string): void {
  harness.interactWithObject(instanceId);
  harness.ticksUntil(() => harness.player.path.length === 0, 2000);
}

function talk(harness: Harness, instanceId: string, ...choices: string[]): void {
  harness.talkTo(instanceId);
  finishDialogue(harness, choices.length ? (text) => choices.some((choice) => text.startsWith(choice)) : undefined);
}

function walkTo(harness: Harness, target: TilePoint): void {
  harness.send({ type: 'world.walk', target });
  harness.ticksUntil(() => harness.player.path.length === 0, 2000);
}

const travel = (harness: Harness, location: WorldLocation) => harness.gameplay.teleport(harness.player, location);

describe('act four: postmarked', () => {
  test('Postmarked leads from Sel through the Waterworks wall to the Calder gatehouse', () => {
    const harness = createHarness({ prepare: veteranAt(at('meridian-atrium', { x: 43, y: 5 })) });
    const { player } = harness;

    talk(harness, 'atrium-sel', 'Did every Site reply by relay?', "I'll go and introduce us.");
    assert.equal(stepOf(harness, 'postmarked'), 0);
    assert.equal(countItem(player.record.inventory, 'calder-letter'), 1);

    travel(harness, at('waterworks', { x: 5, y: 17 }));
    talk(harness, 'ww-ngata', "I'll follow the road.");
    assert.equal(stepOf(harness, 'postmarked'), 1);

    travel(harness, at('waterworks', { x: 36, y: 7 }));
    walkTo(harness, levelPoint('calder-causeway', { x: 5, y: 3 }));
    assert.equal(districtOf(player), 'calder-causeway', 'the Waterworks east wall opens onto the causeway on foot');
    assert.equal(stepOf(harness, 'postmarked'), 2);

    travel(harness, at('brine-galleries', { x: 8, y: 6 }));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f']) defeat(harness, `bg-pans-crawler-${suffix}`);
    assert.equal(stepOf(harness, 'postmarked'), 3);

    travel(harness, at('brine-galleries', { x: 40, y: 16 }));
    walkTo(harness, levelPoint('calder-gatehouse', { x: 3, y: 9 }));
    assert.equal(districtOf(player), 'brine-galleries', 'the gatehouse door stays shut until the intercom is answered');

    use(harness, 'bg-intercom');
    assert.ok(player.hasFlag(CALDER_GATE_FLAG));
    assert.equal(stepOf(harness, 'postmarked'), 4);

    walkTo(harness, levelPoint('calder-gatehouse', { x: 3, y: 9 }));
    assert.equal(districtOf(player), 'calder-gatehouse');
    talk(harness, 'cg-brandt', 'We are Meridian');
    assert.equal(stepOf(harness, 'postmarked'), 'completed');
    assert.equal(countItem(player.record.inventory, 'calder-letter'), 0);
  });

  test('Salt of the Earth ends the lost shifts and Cathedral of Salt silences the Bishop', () => {
    const harness = createHarness({ prepare: veteranAt(at('calder-gatehouse', { x: 7, y: 6 }), ['postmarked'], [CALDER_GATE_FLAG]) });
    const { player } = harness;

    talk(harness, 'cg-brandt', 'Is there anything Calder needs?', "I'll end the shift.");
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 0);

    for (const [instanceId, position] of [['bg-tally-a', { x: 5, y: 26 }], ['bg-tally-b', { x: 22, y: 29 }], ['bg-tally-c', { x: 37, y: 26 }]] as const) {
      travel(harness, at('brine-galleries', position));
      use(harness, instanceId);
    }
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 1);

    travel(harness, at('brine-galleries', { x: 16, y: 27 }));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) defeat(harness, `bg-drifts-wight-${suffix}`);
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 2);

    travel(harness, at('calder-gatehouse', { x: 7, y: 6 }));
    talk(harness, 'cg-brandt', 'Take your time.');
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 'completed');

    talk(harness, 'cg-brandt', 'What is that hymn?', 'I will.');
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 0);
    assert.ok(player.hasFlag(CALDER_NAVE_FLAG));

    travel(harness, at('calder-gatehouse', { x: 13, y: 9 }));
    walkTo(harness, levelPoint('salt-cathedral', { x: 5, y: 18 }));
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 1);

    walkTo(harness, levelPoint('salt-cathedral', { x: 16, y: 18 }));
    defeat(harness, 'sc-nave-bishop');
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 2);

    travel(harness, at('calder-gatehouse', { x: 7, y: 6 }));
    talk(harness, 'cg-brandt', 'We will be expecting you.');
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 'completed');
    assert.ok(player.hasFlag('storyline.act-four-calder-complete'));
  });
});
