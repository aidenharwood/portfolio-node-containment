import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  countItem,
  createStartingSkills,
  experienceForLevel,
  GAME_CONTENT,
  maxIntegrityFor,
  VESPER_GATE_FLAG,
  VESPER_SURGERY_FLAG,
  type CharacterRecord,
  type EquipmentState,
  type QuestProgress,
  type TilePoint,
  type WorldLocation,
} from '@containment/shared';
import { anchor, at, createHarness, districtOf, finishDialogue, inRoom, levelPoint, type Harness, localInRoom } from './support/testHarness.ts';

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const VETERAN = createStartingSkills({ closeQuarters: experienceForLevel(99), fortitude: experienceForLevel(99), containment: experienceForLevel(60) });
const KIT: EquipmentState = { head: 'physician-helm', torso: 'physician-plate', hands: 'physician-gloves', legs: 'physician-trousers', feet: 'physician-boots', primary: 'amputation-maul' };

const PRIOR_QUESTS = [
  'orientation-protocol', 'field-fabrication', 'live-fire', 'the-knocking', 'the-far-side', 'a-council-of-one', 'cold-storage', 'dead-air',
  'original-contract', 'stoking-the-fire', 'the-answer', 'the-ninth-letter', 'dead-letter-office', 'return-to-sender',
  'postmarked', 'salt-of-the-earth', 'cathedral-of-salt',
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
  const keepFighting = () => harness.player.update({ vitals: { integrity: maxIntegrityFor(harness.player.record.skills) } });
  keepFighting();
  harness.approach(instanceId);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.ticksUntil(() => {
    keepFighting();
    return !creature.isAlive;
  }, 8000);
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
const LODGE = at('vesper-lodge', localInRoom('vesper-lodge', 'lodge'));

describe('act four: the Vesper Wing', () => {
  test('Referral leads from the Medbay through the seed vault to the Porter\'s Lodge', () => {
    const harness = createHarness({ prepare: veteranAt(anchor('meridian-atrium', 'deepLineArrival')) });
    const { player } = harness;

    talk(harness, 'atrium-anand', 'You look worried, Doc.', "I'll attend.");
    assert.equal(stepOf(harness, 'referral'), 0);
    assert.equal(countItem(player.record.inventory, 'vesper-referral'), 1);

    travel(harness, inRoom('hydroponics', 'platform'));
    talk(harness, 'hydro-oyelaran', "I'll open it.");
    assert.equal(stepOf(harness, 'referral'), 1);

    travel(harness, inRoom('hydroponics', 'seed-vault'));
    walkTo(harness, levelPoint('vesper-causeway', localInRoom('vesper-causeway', 'walk')));
    assert.equal(districtOf(player), 'vesper-causeway', 'the seed vault opens west onto the Sanatorium Walk on foot');
    assert.equal(stepOf(harness, 'referral'), 2);

    travel(harness, at('vesper-wards', localInRoom('vesper-wards', 'north-ward')));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f']) defeat(harness, `vw-north-orderly-${suffix}`);
    assert.equal(stepOf(harness, 'referral'), 3);

    travel(harness, anchor('vesper-wards', 'gateApproach'));
    walkTo(harness, anchor('vesper-lodge', 'gateInside').position);
    assert.equal(districtOf(player), 'vesper-wards', 'the lodge door stays shut until the bell is answered');
    use(harness, 'vw-bell');
    assert.ok(player.hasFlag(VESPER_GATE_FLAG));
    walkTo(harness, anchor('vesper-lodge', 'gateInside').position);
    assert.equal(districtOf(player), 'vesper-lodge');

    talk(harness, 'vl-ashby', 'Meridian, reporting');
    assert.equal(stepOf(harness, 'referral'), 'completed');
    assert.equal(countItem(player.record.inventory, 'vesper-referral'), 0);
  });

  test('Night Rounds relieves the night nurses and Second Opinion ends the Chief Physician\'s surgery', () => {
    const harness = createHarness({ prepare: veteranAt(LODGE, ['referral'], [VESPER_GATE_FLAG]) });
    const { player } = harness;

    talk(harness, 'vl-ashby', 'What do the patients need?', "I'll do the rounds.");
    for (const [instanceId, anchorId] of [['vw-chart-a', 'chartA'], ['vw-chart-b', 'chartB'], ['vw-chart-c', 'chartC']] as const) {
      travel(harness, anchor('vesper-wards', anchorId));
      use(harness, instanceId);
    }
    assert.equal(stepOf(harness, 'night-rounds'), 1);
    travel(harness, at('vesper-wards', localInRoom('vesper-wards', 'south-ward')));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) defeat(harness, `vw-south-nurse-${suffix}`);
    assert.equal(stepOf(harness, 'night-rounds'), 2);
    travel(harness, LODGE);
    talk(harness, 'vl-ashby', 'They will want to hear it.');
    assert.equal(stepOf(harness, 'night-rounds'), 'completed');

    talk(harness, 'vl-ashby', 'Who wrote the charts?', "I'll give him one.");
    assert.ok(player.hasFlag(VESPER_SURGERY_FLAG));
    travel(harness, anchor('vesper-lodge', 'liftArrival'));
    walkTo(harness, anchor('vesper-pharmacy', 'dispensaryFloor').position);
    assert.equal(stepOf(harness, 'second-opinion'), 1);
    walkTo(harness, anchor('vesper-pharmacy', 'surgeryEntry').position);
    defeat(harness, 'vp-surgery-physician');
    assert.equal(stepOf(harness, 'second-opinion'), 2);

    travel(harness, LODGE);
    talk(harness, 'vl-ashby', 'We will write back.');
    assert.equal(stepOf(harness, 'second-opinion'), 'completed');
    assert.ok(player.hasFlag('storyline.act-four-complete'));
  });

  test("the Porter's Lodge side quests run from the dispensary down to the cold ward", () => {
    const stocked = (record: CharacterRecord): CharacterRecord => {
      const prepared = veteranAt(LODGE, ['referral', 'night-rounds'], [VESPER_GATE_FLAG])(record);
      const withHerbs = addItem(prepared.inventory, GAME_CONTENT.items, 'physic-herb', 6).inventory;
      return { ...prepared, inventory: addItem(withHerbs, GAME_CONTENT.items, 'starched-linen', 4).inventory };
    };
    const harness = createHarness({ prepare: stocked });
    const { player } = harness;
    walkTo(harness, anchor('vesper-lodge', 'tramPlatform').position);
    assert.ok(harness.sink.last('player.state')?.self.discoveredStations.includes('vesper-platform'), 'walking onto the lodge platform discovers its tram station');

    talk(harness, 'vl-lowe', 'Are you short of anything?', "I'll bring it.");
    assert.equal(stepOf(harness, 'prescription-for-one'), 1);
    talk(harness, 'vl-lowe', 'Glad to help.');
    assert.equal(stepOf(harness, 'prescription-for-one'), 'completed');

    talk(harness, 'vl-ashby', 'What is down the bed lift?', "I'll go down.");
    use(harness, 'vl-lift/1,0');
    assert.equal(player.levelId, 'vesper-cellars');
    assert.equal(stepOf(harness, 'the-cold-ward'), 1);
    travel(harness, anchor('vesper-cellars', 'mortuaryFloor'));
    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f']) defeat(harness, `vcl-mortuary-attendant-${suffix}`);
    assert.equal(stepOf(harness, 'the-cold-ward'), 2);
    travel(harness, inRoom('vesper-cellars', 'almoners-office'));
    defeat(harness, 'vcl-office-almoner');
    assert.equal(stepOf(harness, 'the-cold-ward'), 3);
    travel(harness, anchor('vesper-cellars', 'liftArrival'));
    use(harness, 'vcl-lift/1,0');
    assert.equal(districtOf(player), 'vesper-lodge');
    talk(harness, 'vl-ashby', 'They can.');
    assert.equal(stepOf(harness, 'the-cold-ward'), 'completed');

    talk(harness, 'vl-ashby', 'Is anyone still admitted?', "I'll file them.");
    assert.equal(countItem(player.record.inventory, 'discharge-papers'), 1);
    use(harness, 'vl-lift/1,0');
    travel(harness, inRoom('vesper-cellars', 'almoners-office'));
    use(harness, 'vcl-ledger');
    assert.equal(stepOf(harness, 'discharged'), 1);
    travel(harness, LODGE);
    talk(harness, 'vl-ashby', 'Leave it on.');
    assert.equal(stepOf(harness, 'discharged'), 'completed');
  });
});
