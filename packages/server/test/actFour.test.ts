import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  CALDER_GATE_FLAG,
  GAME_CONTENT,
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
import { anchor, at, createHarness, districtOf, finishDialogue, inRoom, levelPoint, type Harness, localInRoom } from './support/testHarness.ts';

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
  harness.approach(instanceId);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.fightUntil(() => !creature.isAlive, 8000);
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
    const harness = createHarness({ prepare: veteranAt(at('meridian-atrium', localInRoom('meridian-atrium', 'archives', { x: 8, y: 16 }))) });
    const { player } = harness;

    talk(harness, 'atrium-sel', 'Did every Site reply by relay?', "I'll go and introduce us.");
    assert.equal(stepOf(harness, 'postmarked'), 0);
    assert.equal(countItem(player.record.inventory, 'calder-letter'), 1);

    travel(harness, at('waterworks', localInRoom('waterworks', 'pump-house', { x: 13, y: 20 })));
    talk(harness, 'ww-ngata', "I'll follow the road.");
    assert.equal(stepOf(harness, 'postmarked'), 1);

    travel(harness, anchor('waterworks', 'checkpointGate'));
    walkTo(harness, levelPoint('calder-causeway', localInRoom('calder-causeway', 'causeway', { x: 9, y: 2 })));
    assert.equal(districtOf(player), 'calder-causeway', 'the Waterworks east wall opens onto the causeway on foot');
    assert.equal(stepOf(harness, 'postmarked'), 2);

    travel(harness, at('brine-galleries', localInRoom('brine-galleries', 'brine-pans', { x: 20, y: 29 })));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f']) defeat(harness, `bg-pans-crawler-${suffix}`);
    assert.equal(stepOf(harness, 'postmarked'), 3);

    travel(harness, at('brine-galleries', localInRoom('brine-galleries', 'gate-approach', { x: 28, y: 12 })));
    walkTo(harness, levelPoint('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 2, y: 21 })));
    assert.equal(districtOf(player), 'brine-galleries', 'the gatehouse door stays shut until the intercom is answered');

    use(harness, 'bg-intercom');
    assert.ok(player.hasFlag(CALDER_GATE_FLAG));
    assert.equal(stepOf(harness, 'postmarked'), 4);

    walkTo(harness, levelPoint('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 2, y: 21 })));
    assert.equal(districtOf(player), 'calder-gatehouse');
    talk(harness, 'cg-brandt', 'We are Meridian');
    assert.equal(stepOf(harness, 'postmarked'), 'completed');
    assert.equal(countItem(player.record.inventory, 'calder-letter'), 0);
  });

  test('Salt of the Earth ends the lost shifts and Cathedral of Salt silences the Bishop', () => {
    const harness = createHarness({ prepare: veteranAt(at('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 25, y: 9 })), ['postmarked'], [CALDER_GATE_FLAG]) });
    const { player } = harness;

    talk(harness, 'cg-brandt', 'Is there anything Calder needs?', "I'll end the shift.");
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 0);

    for (const [instanceId, position] of [['bg-tally-a', { x: 5, y: 12 }], ['bg-tally-b', { x: 31, y: 38 }], ['bg-tally-c', { x: 58, y: 26 }]] as const) {
      travel(harness, at('brine-galleries', localInRoom('brine-galleries', 'wight-drifts', position)));
      use(harness, instanceId);
    }
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 1);

    travel(harness, at('brine-galleries', localInRoom('brine-galleries', 'wight-drifts', { x: 25, y: 20 })));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) defeat(harness, `bg-drifts-wight-${suffix}`);
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 2);

    travel(harness, at('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 25, y: 9 })));
    talk(harness, 'cg-brandt', 'Take your time.');
    assert.equal(stepOf(harness, 'salt-of-the-earth'), 'completed');

    talk(harness, 'cg-brandt', 'What is that hymn?', 'I will.');
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 0);
    assert.ok(player.hasFlag(CALDER_NAVE_FLAG));

    travel(harness, at('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 56, y: 17 })));
    walkTo(harness, levelPoint('salt-cathedral', localInRoom('salt-cathedral', 'nave-steps', { x: 8, y: 15 })));
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 1);

    walkTo(harness, levelPoint('salt-cathedral', localInRoom('salt-cathedral', 'the-nave', { x: 2, y: 25 })));
    defeat(harness, 'sc-nave-bishop');
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 2);

    travel(harness, at('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 25, y: 9 })));
    talk(harness, 'cg-brandt', 'We will be expecting you.');
    assert.equal(stepOf(harness, 'cathedral-of-salt'), 'completed');
    assert.ok(player.hasFlag('storyline.act-four-calder-complete'));
  });

  test('the Calder Gatehouse side quests run from the commissary down to the lowest gallery', () => {
    const stocked = (record: CharacterRecord): CharacterRecord => {
      const prepared = veteranAt(at('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 25, y: 9 })), ['postmarked', 'salt-of-the-earth'], [CALDER_GATE_FLAG])(record);
      const withSalt = addItem(prepared.inventory, GAME_CONTENT.items, 'rock-salt', 6).inventory;
      return { ...prepared, inventory: addItem(withSalt, GAME_CONTENT.items, 'crawler-carapace', 4).inventory };
    };
    const harness = createHarness({ prepare: stocked });
    const { player } = harness;
    walkTo(harness, anchor('calder-gatehouse', 'tramPlatform').position);
    assert.ok(harness.sink.last('player.state')?.self.discoveredStations.includes('calder-platform'), 'walking onto the gatehouse platform discovers its tram station');

    talk(harness, 'cg-sorrel', 'What are you short of?', "I'll stock you up.");
    assert.equal(stepOf(harness, 'short-rations'), 1, 'stores already in the pack satisfy the gathering step');
    talk(harness, 'cg-sorrel', 'Enjoy the soup.');
    assert.equal(stepOf(harness, 'short-rations'), 'completed');
    assert.equal(countItem(player.record.inventory, 'rock-salt'), 0);

    talk(harness, 'cg-brandt', 'Why does the lift bell keep ringing?', "I'll go down.");
    use(harness, 'cg-lift/1,0');
    assert.equal(player.levelId, 'calder-deeps');
    assert.equal(stepOf(harness, 'the-lowest-gallery'), 1);

    travel(harness, anchor('calder-deeps', 'workingsFloor'));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f']) defeat(harness, `cd-workings-wight-${suffix}`);
    assert.equal(stepOf(harness, 'the-lowest-gallery'), 2);
    travel(harness, inRoom('calder-deeps', 'foremans-office'));
    defeat(harness, 'cd-office-foreman');
    assert.equal(stepOf(harness, 'the-lowest-gallery'), 3);

    travel(harness, anchor('calder-deeps', 'liftArrival'));
    use(harness, 'cd-lift/1,0');
    assert.equal(districtOf(player), 'calder-gatehouse');
    talk(harness, 'cg-brandt', 'He can rest now.');
    assert.equal(stepOf(harness, 'the-lowest-gallery'), 'completed');

    talk(harness, 'cg-brandt', 'Is the log closed?', "I'll clock him off.");
    assert.equal(countItem(player.record.inventory, 'foremans-card'), 1);
    use(harness, 'cg-lift/1,0');
    travel(harness, inRoom('calder-deeps', 'foremans-office'));
    use(harness, 'cd-time-clock');
    assert.equal(stepOf(harness, 'clocking-off'), 1);
    assert.equal(countItem(player.record.inventory, 'foremans-card'), 0);
    travel(harness, at('calder-gatehouse', localInRoom('calder-gatehouse', 'gatehouse', { x: 25, y: 9 })));
    talk(harness, 'cg-brandt', 'Close the log.');
    assert.equal(stepOf(harness, 'clocking-off'), 'completed');
  });
});
