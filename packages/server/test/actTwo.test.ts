import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  GAME_CONTENT,
  countItem,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  type CharacterRecord,
  type EquipmentState,
  type QuestProgress,
  type WorldLocation,
} from '@containment/shared';
import { containSpecimen } from './support/containment.ts';
import { anchor, createHarness, finishDialogue, type Harness, at, districtOf, inRoom, levelPoint, localInRoom } from './support/testHarness.ts';

const active = (questId: string, stepIndex = 0): QuestProgress => ({ questId, status: 'active', stepIndex, objectiveProgress: [0, 0, 0] });
const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const VETERAN = createStartingSkills({ closeQuarters: experienceForLevel(99), fortitude: experienceForLevel(99), containment: experienceForLevel(40) });
const KIT: EquipmentState = { torso: 'composite-plate', legs: 'intake-trousers', feet: 'work-boots', primary: 'the-knocker' };

const NEAR_SEL: WorldLocation = at('meridian-atrium', localInRoom('meridian-atrium', 'archives', { x: 8, y: 16 }));
const NEAR_THALE: WorldLocation = inRoom('deepwatch', 'command-post');
const NEAR_HALVORSEN: WorldLocation = inRoom('sector-three', 'threshold');
const CRYOVAULT_DOOR: WorldLocation = anchor('deep-concourse', 'cryovaultDoor');
const ARRAY_DOOR: WorldLocation = anchor('deep-concourse', 'arrayDoor');
const ARCHIVE_DOOR: WorldLocation = anchor('deep-concourse', 'archiveDoor');
const FURNACE_DOOR: WorldLocation = anchor('furnace-causeway', 'furnaceGate');

const PRIOR_QUESTS = ['orientation-protocol', 'field-fabrication', 'live-fire', 'the-knocking', 'the-far-side'];

function veteranAt(location: WorldLocation, quests: Record<string, QuestProgress>, flags: readonly string[] = []) {
  return (record: CharacterRecord): CharacterRecord => ({
    ...record,
    location,
    quests: { ...Object.fromEntries(PRIOR_QUESTS.map((id) => [id, completed(id)])), ...quests },
    flags: [...record.flags, ...flags],
    skills: VETERAN,
    vitals: { integrity: maxIntegrityFor(VETERAN) },
    equipment: KIT,
  });
}

function stepOf(harness: Harness, questId: string): number | 'completed' | undefined {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
}

function heal(harness: Harness): void {
  harness.player.update({ vitals: { integrity: maxIntegrityFor(harness.player.record.skills) } });
}

function defeat(harness: Harness, instanceId: string): void {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  heal(harness);
  harness.approach(instanceId);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.fightUntil(() => !creature.isAlive, 8000);
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

function standsIn(harness: Harness, districtId: string, roomId: string): boolean {
  const rect = GAME_CONTENT.districts.get(districtId)?.rooms?.[roomId];
  assert.ok(rect, `missing room ${districtId}/${roomId}`);
  const corner = levelPoint(districtId, { x: rect.x, y: rect.y });
  const { x, y } = harness.player.position;
  return x >= corner.x && x < corner.x + rect.width && y >= corner.y && y < corner.y + rect.height;
}

function walkInto(harness: Harness, location: WorldLocation): void {
  harness.send({ type: 'world.walk', target: location.position });
  harness.ticksUntil(() => harness.player.path.length === 0, 2000);
}

describe('act two: the answer', () => {
  test('A Council of One opens Deepwatch, visits the Knock and hands over to Cold Storage', () => {
    const harness = createHarness({ prepare: veteranAt(NEAR_SEL, {}) });
    const { player } = harness;

    talk(harness, 'atrium-sel', "I'm ready");
    assert.equal(stepOf(harness, 'a-council-of-one'), 0);
    assert.ok(player.hasFlag('clearance.deepwatch'));

    travel(harness, at('meridian-atrium', localInRoom('meridian-atrium', 'lift-bay', { x: 2, y: 2 })));
    use(harness, 'atrium-deep-line/1,0');
    assert.equal(districtOf(player), 'deepwatch');
    assert.equal(stepOf(harness, 'a-council-of-one'), 1);

    travel(harness, NEAR_THALE);
    talk(harness, 'dw-thale');
    assert.equal(stepOf(harness, 'a-council-of-one'), 2);

    travel(harness, anchor('deepwatch', 'thresholdLanding'));
    use(harness, 'dw-threshold/0,0');
    assert.equal(districtOf(player), 'sector-three');
    talk(harness, 's3-halvorsen');
    assert.equal(stepOf(harness, 'a-council-of-one'), 3);

    use(harness, 's3-deepwatch/0,0');
    assert.equal(districtOf(player), 'deepwatch');
    travel(harness, NEAR_THALE);
    talk(harness, 'dw-thale', "It isn't");
    assert.equal(stepOf(harness, 'a-council-of-one'), 'completed');
    assert.equal(stepOf(harness, 'cold-storage'), 0);
    assert.ok(player.hasFlag('clearance.cryovault'));
  });

  test('Cold Storage: pods, moths, the Curator and the stasis core', () => {
    const harness = createHarness({ prepare: veteranAt(CRYOVAULT_DOOR, { 'a-council-of-one': completed('a-council-of-one'), 'cold-storage': active('cold-storage') }, ['clearance.cryovault']) });
    const { player } = harness;

    use(harness, 'dc-cryovault-door/0,0');
    assert.equal(districtOf(player), 'cryovault');
    walkInto(harness, anchor('cryovault', 'entrance'));
    assert.equal(stepOf(harness, 'cold-storage'), 1);

    for (const pod of ['cv-pod-a', 'cv-pod-b', 'cv-pod-c', 'cv-pod-d']) use(harness, pod);
    assert.equal(stepOf(harness, 'cold-storage'), 2);

    for (const moth of ['cv-moth-hall-a', 'cv-moth-hall-b', 'cv-moth-hall-c', 'cv-moth-corridor-a', 'cv-moth-corridor-b', 'cv-moth-corridor-c']) defeat(harness, moth);
    assert.equal(stepOf(harness, 'cold-storage'), 3);

    containSpecimen(harness, 'cv-curator');
    assert.equal(stepOf(harness, 'cold-storage'), 4);

    use(harness, 'cv-ledger');
    assert.equal(countItem(player.record.inventory, 'stasis-core'), 1);
    assert.equal(stepOf(harness, 'cold-storage'), 5);

    travel(harness, NEAR_THALE);
    talk(harness, 'dw-thale', 'Hand over');
    assert.equal(stepOf(harness, 'cold-storage'), 'completed');
    assert.equal(countItem(player.record.inventory, 'rimeguard-helm'), 1);
    assert.equal(stepOf(harness, 'dead-air'), 0);
    assert.ok(player.hasFlag('clearance.signal-array'));
  });

  test('Dead Air: the Array replies were coming from below', () => {
    const harness = createHarness({ prepare: veteranAt(NEAR_SEL, { 'cold-storage': completed('cold-storage'), 'dead-air': active('dead-air') }, ['clearance.signal-array']) });
    const { player } = harness;

    talk(harness, 'atrium-sel');
    assert.equal(stepOf(harness, 'dead-air'), 1);

    travel(harness, ARRAY_DOOR);
    use(harness, 'dc-array-door/0,0');
    assert.equal(districtOf(player), 'signal-array');
    walkInto(harness, anchor('signal-array', 'entrance'));
    assert.equal(stepOf(harness, 'dead-air'), 2);

    talk(harness, 'sa-achterberg');
    assert.equal(stepOf(harness, 'dead-air'), 3);

    for (const console of ['sa-console-a', 'sa-console-b', 'sa-console-c']) use(harness, console);
    assert.equal(stepOf(harness, 'dead-air'), 4);

    use(harness, 'sa-outbox');
    assert.equal(stepOf(harness, 'dead-air'), 5);

    containSpecimen(harness, 'sa-choir');
    assert.equal(stepOf(harness, 'dead-air'), 6);

    use(harness, 'sa-array-core');
    assert.equal(stepOf(harness, 'dead-air'), 7);

    travel(harness, NEAR_SEL);
    talk(harness, 'atrium-sel', 'Hand over');
    assert.equal(stepOf(harness, 'dead-air'), 'completed');
    assert.equal(stepOf(harness, 'original-contract'), 0);
    assert.ok(player.hasFlag('clearance.drowned-archive'));
  });

  test('The Original Contract: drain the stacks and recover the charter', () => {
    const harness = createHarness({
      prepare: veteranAt(at('meridian-atrium', localInRoom('meridian-atrium', 'engineering', { x: 8, y: 11 })), { 'dead-air': completed('dead-air'), 'original-contract': active('original-contract') }, ['clearance.drowned-archive']),
    });
    const { player } = harness;

    talk(harness, 'atrium-lund');
    assert.equal(countItem(player.record.inventory, 'sluice-key'), 1);
    assert.equal(stepOf(harness, 'original-contract'), 1);

    travel(harness, ARCHIVE_DOOR);
    use(harness, 'dc-archive-door/0,0');
    assert.equal(districtOf(player), 'drowned-archive');
    walkInto(harness, anchor('drowned-archive', 'entrance'));
    assert.equal(stepOf(harness, 'original-contract'), 2);

    talk(harness, 'da-pim');
    assert.equal(stepOf(harness, 'original-contract'), 3);

    travel(harness, anchor('drowned-archive', 'sealedApproach'));
    use(harness, 'da-sealed-door/0,0');
    assert.ok(!standsIn(harness, 'drowned-archive', 'sealed-room'), 'the reading room stays sealed until the sluices are open');

    for (const valve of ['da-sluice-a', 'da-sluice-b', 'da-sluice-c']) use(harness, valve);
    assert.equal(stepOf(harness, 'original-contract'), 4);
    assert.ok(player.hasFlag('archive.drained'));

    travel(harness, anchor('drowned-archive', 'sealedApproach'));
    use(harness, 'da-sealed-door/0,0');
    assert.ok(standsIn(harness, 'drowned-archive', 'sealed-room'), 'the drained door opens into the reading room');

    containSpecimen(harness, 'da-last-archivist');
    assert.equal(stepOf(harness, 'original-contract'), 5);

    use(harness, 'da-lectern');
    assert.equal(stepOf(harness, 'original-contract'), 6);

    travel(harness, NEAR_THALE);
    talk(harness, 'dw-thale', 'Hand over');
    assert.equal(stepOf(harness, 'original-contract'), 'completed');
    assert.equal(stepOf(harness, 'stoking-the-fire'), 0);
    assert.ok(player.hasFlag('clearance.furnace'));
  });

  test('Stoking the Fire: the reactor has been feeding the door', () => {
    const harness = createHarness({ prepare: veteranAt(NEAR_HALVORSEN, { 'original-contract': completed('original-contract'), 'stoking-the-fire': active('stoking-the-fire') }, ['clearance.furnace']) });
    const { player } = harness;

    talk(harness, 's3-halvorsen');
    assert.equal(stepOf(harness, 'stoking-the-fire'), 1);

    travel(harness, FURNACE_DOOR);
    use(harness, 'fu-blast-door/0,0');
    assert.equal(districtOf(player), 'furnace');
    talk(harness, 'fu-brann');
    assert.equal(stepOf(harness, 'stoking-the-fire'), 3);

    for (const golem of ['fu-golem-a', 'fu-golem-b', 'fu-golem-c', 'fu-golem-d', 'fu-golem-e']) defeat(harness, golem);
    assert.equal(stepOf(harness, 'stoking-the-fire'), 4);

    for (const valve of ['fu-valve-a', 'fu-valve-b', 'fu-valve-c']) use(harness, valve);
    assert.equal(stepOf(harness, 'stoking-the-fire'), 5);
    assert.ok(player.hasFlag('furnace.vented'));

    travel(harness, anchor('furnace', 'reactorApproach'));
    use(harness, 'fu-reactor-door/0,0');
    assert.ok(standsIn(harness, 'furnace', 'reactor-heart'), 'the vented door opens into the reactor heart');

    containSpecimen(harness, 'fu-stoker');
    assert.equal(stepOf(harness, 'stoking-the-fire'), 6);

    use(harness, 'fu-reactor-console');
    assert.equal(stepOf(harness, 'stoking-the-fire'), 7);

    travel(harness, NEAR_THALE);
    talk(harness, 'dw-thale', 'Read the reactor');
    assert.equal(stepOf(harness, 'stoking-the-fire'), 'completed');
    assert.equal(stepOf(harness, 'the-answer'), 0);
  });

  test('The Answer: through the Knock, past the Host, and home to Sel', () => {
    const harness = createHarness({ prepare: veteranAt(NEAR_HALVORSEN, { 'stoking-the-fire': completed('stoking-the-fire'), 'the-answer': active('the-answer') }) });
    const { player } = harness;

    use(harness, 's3-knock/1,0', 1);
    assert.equal(districtOf(player), 'sector-three', 'the Knock stays shut until Halvorsen opens it');

    talk(harness, 's3-halvorsen', 'Open it');
    assert.ok(player.hasFlag('farside.door-open'));
    assert.equal(stepOf(harness, 'the-answer'), 1);

    use(harness, 's3-knock/1,0', 1);
    assert.equal(districtOf(player), 'meridian-below');
    assert.equal(stepOf(harness, 'the-answer'), 2);

    talk(harness, 'mb-kessler');
    assert.equal(stepOf(harness, 'the-answer'), 3);

    for (const hollow of ['mb-hollow-workshop-a', 'mb-hollow-workshop-b', 'mb-hollow-plaza-a', 'mb-hollow-plaza-b', 'mb-hollow-plaza-c', 'mb-hollow-workshop-c']) defeat(harness, hollow);
    assert.equal(stepOf(harness, 'the-answer'), 4);

    for (const lantern of ['mb-lantern-medbay', 'mb-lantern-workshop', 'mb-lantern-plaza']) use(harness, lantern);
    assert.equal(stepOf(harness, 'the-answer'), 5);

    containSpecimen(harness, 'mb-host');
    assert.equal(stepOf(harness, 'the-answer'), 6);

    talk(harness, 'mb-guest', 'Yes. Come in');
    assert.ok(player.hasFlag('ending.welcomed'));
    assert.equal(stepOf(harness, 'the-answer'), 7);

    travel(harness, NEAR_SEL);
    talk(harness, 'atrium-sel', 'I let it in');
    assert.equal(stepOf(harness, 'the-answer'), 'completed');
    assert.equal(countItem(player.record.inventory, 'meridian-sigil'), 1);
    assert.ok(player.hasFlag('storyline.act-two-complete'));
  });

  test('Fenn hands out a side quest and pays for six samples of cryo gel', () => {
    const harness = createHarness({ prepare: veteranAt(at('cryovault', localInRoom('cryovault', 'fenn-nook', { x: 3, y: 12 })), { 'cold-storage': active('cold-storage', 2) }) });
    const { player } = harness;

    talk(harness, 'cv-fenn', 'Can I help', "I'll do it");
    assert.equal(stepOf(harness, 'fenns-inventory'), 0);

    for (const husk of ['cv-husk-ward-a', 'cv-husk-ward-b', 'cv-husk-ward-c', 'cv-husk-ward-d', 'cv-husk-ward-e', 'cv-husk-office-a', 'cv-husk-office-b']) defeat(harness, husk);
    defeat(harness, 'cv-husk-ward-a');
    assert.equal(stepOf(harness, 'fenns-inventory'), 1);

    player.update({ inventory: [{ itemId: 'cryo-gel', quantity: 6 }, ...player.record.inventory.slice(1)] });
    harness.gameplay.raiseQuestEvent(player, { type: 'loadoutChanged' });
    travel(harness, at('cryovault', localInRoom('cryovault', 'fenn-nook', { x: 3, y: 12 })));
    talk(harness, 'cv-fenn', 'Hand over');
    assert.equal(stepOf(harness, 'fenns-inventory'), 'completed');
    assert.equal(countItem(player.record.inventory, 'rimeguard-gauntlets'), 1);
    assert.equal(countItem(player.record.inventory, 'cryo-gel'), 0);
  });
});
