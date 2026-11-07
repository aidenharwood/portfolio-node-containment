import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  countItem,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  type CharacterRecord,
  type QuestProgress,
  type ZoneLocation,
} from '@containment/shared';
import { createHarness, finishDialogue, type Harness } from './support/testHarness.ts';

const ATRIUM_NEAR_KADE: ZoneLocation = { zoneId: 'meridian-atrium', position: { x: 36, y: 12 } };
const ATRIUM_NEAR_SEL: ZoneLocation = { zoneId: 'meridian-atrium', position: { x: 39, y: 5 } };

const activeAt = (questId: string, stepIndex = 0, objectiveCount = 1): QuestProgress => ({
  questId,
  status: 'active',
  stepIndex,
  objectiveProgress: Array.from({ length: objectiveCount }, () => 0),
});

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const prepared = (location: ZoneLocation, quests: Record<string, QuestProgress>, changes: Partial<CharacterRecord> = {}) =>
  (record: CharacterRecord): CharacterRecord => ({ ...record, location, quests, ...changes });

const veteranSkills = () => {
  const skills = createStartingSkills({
    closeQuarters: experienceForLevel(30),
    fortitude: experienceForLevel(40),
  });
  return { skills, vitals: { integrity: maxIntegrityFor(skills) } };
};

function stepOf(harness: Harness, questId: string): number | 'completed' | undefined {
  const progress = harness.player.record.quests[questId];
  return progress?.status === 'completed' ? 'completed' : progress?.stepIndex;
}

function defeat(harness: Harness, instanceId: string, limit = 2000): void {
  const creature = harness.gameplay.world.zoneOf(harness.player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  if (!creature.isAlive) return;
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.ticksUntil(() => !creature.isAlive, limit);
}

describe('combat', () => {
  test('Live Fire teaches wielding, fighting and healing, then opens the storyline', () => {
    const harness = createHarness({
      prepare: prepared(ATRIUM_NEAR_KADE, { 'orientation-protocol': completed('orientation-protocol'), 'live-fire': activeAt('live-fire') }),
    });
    const { player } = harness;

    harness.talkTo('atrium-kade');
    finishDialogue(harness);
    assert.equal(countItem(player.record.inventory, 'stun-baton'), 1);
    assert.equal(stepOf(harness, 'live-fire'), 1);

    harness.equipItem('stun-baton');
    assert.equal(player.record.equipment.primary, 'stun-baton');
    assert.equal(stepOf(harness, 'live-fire'), 2);

    const closeQuartersBefore = player.record.skills.closeQuarters;
    for (const drone of ['range-drone-a', 'range-drone-b', 'range-drone-c']) defeat(harness, drone);
    assert.ok(player.record.skills.closeQuarters > closeQuartersBefore);
    assert.ok(player.integrity < player.maxIntegrity, 'drones should land at least one hit');
    assert.equal(stepOf(harness, 'live-fire'), 3);

    const integrityBefore = player.integrity;
    const medgelSlot = player.record.inventory.findIndex((slot) => slot?.itemId === 'medgel');
    harness.send({ type: 'inventory.use', slotIndex: medgelSlot });
    assert.ok(player.integrity > integrityBefore);
    assert.equal(stepOf(harness, 'live-fire'), 4);

    harness.talkTo('atrium-kade');
    finishDialogue(harness);
    assert.equal(stepOf(harness, 'live-fire'), 'completed');
    assert.equal(stepOf(harness, 'the-knocking'), 0);
  });

  test('The Knocking can be completed end to end through Sector 2', () => {
    const harness = createHarness({
      prepare: prepared(ATRIUM_NEAR_SEL, { 'live-fire': completed('live-fire'), 'the-knocking': activeAt('the-knocking') }, {
        ...veteranSkills(),
        equipment: { torso: 'intake-jumpsuit', legs: 'intake-trousers', feet: 'work-boots', primary: 'stun-baton' },
      }),
    });
    const { player } = harness;

    harness.talkTo('atrium-sel');
    finishDialogue(harness);
    assert.equal(stepOf(harness, 'the-knocking'), 1);

    harness.talkTo('atrium-lund');
    finishDialogue(harness, (text) => text.includes('override key'));
    assert.equal(countItem(player.record.inventory, 'quarantine-override-key'), 1);
    assert.equal(stepOf(harness, 'the-knocking'), 2);

    harness.interactWithObject('sector2-bulkhead-b');
    assert.equal(player.zoneId, 'sector-two');
    assert.equal(stepOf(harness, 'the-knocking'), 3);

    for (const mite of ['s2-mite-corridor-a', 's2-mite-corridor-b', 's2-mite-corridor-c', 's2-mite-corridor-d']) {
      if (stepOf(harness, 'the-knocking') !== 3) break;
      defeat(harness, mite);
    }
    assert.equal(stepOf(harness, 'the-knocking'), 4);
    const zoneLoot = [...harness.gameplay.world.zoneOf(player).groundItems.values()];
    assert.ok(zoneLoot.some((item) => item.itemId === 'gloam-chitin' && item.ownerId === player.entityId), 'mite loot should land on the floor, reserved for the killer');

    harness.interactWithObject('s2-lab-terminal');
    harness.ticksUntil(() => countItem(player.record.inventory, 'expedition-log') === 1, 400);
    assert.equal(stepOf(harness, 'the-knocking'), 5);

    defeat(harness, 's2-warden', 4000);
    assert.equal(stepOf(harness, 'the-knocking'), 6);

    harness.ticksUntil(() => player.combatTargetId === null, 600);
    harness.interactWithObject('s2-exit-a');
    assert.equal(player.zoneId, 'meridian-atrium');

    harness.talkTo('atrium-sel');
    finishDialogue(harness, (text) => text.startsWith('Hand over'));
    assert.equal(stepOf(harness, 'the-knocking'), 'completed');
    assert.ok(player.hasFlag('storyline.sector-three-revealed'));
    assert.equal(countItem(player.record.inventory, 'response-helmet'), 1);
  });

  test('an incapacitated operative is recovered to safety at full integrity', () => {
    const harness = createHarness({
      prepare: prepared({ zoneId: 'sector-two', position: { x: 9, y: 11 } }, {}, { vitals: { integrity: 1 } }),
    });
    const { player } = harness;
    harness.ticksUntil(() => player.zoneId === 'meridian-atrium', 200);
    assert.ok(harness.gameplay.world.zoneOf(player).areasAt(player.position).some((area) => area.id === 'medbay'), 'recovery wakes operatives in the medbay');
    assert.equal(player.integrity, player.maxIntegrity);
    assert.equal(player.combatTargetId, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /incapacitated/);
  });

  test('creatures give up the chase beyond their leash and heal', () => {
    const harness = createHarness({
      prepare: prepared({ zoneId: 'sector-two', position: { x: 9, y: 11 } }, {}, veteranSkills()),
      combatRandom: () => 0.99,
    });
    const { player, gameplay } = harness;
    const mite = gameplay.world.zoneOf(player).creatureByInstance('s2-mite-corridor-a');
    assert.ok(mite);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-mite-corridor-a', interactionIndex: 0 });
    harness.ticksUntil(() => mite.targetId === player.entityId, 50);
    harness.send({ type: 'world.walk', target: { x: 29, y: 11 } });
    harness.ticksUntil(() => mite.targetId === null && mite.returningHome === false, 400);
    assert.equal(mite.integrity, mite.definition.integrity);
  });

  test('aggressive creatures ignore operatives far above their level, but not fresh ones', () => {
    const veteran = createHarness({ prepare: prepared({ zoneId: 'sector-two', position: { x: 9, y: 11 } }, {}, veteranSkills()) });
    const ignoring = veteran.gameplay.world.zoneOf(veteran.player).creatureByInstance('s2-mite-corridor-a');
    for (let tick = 0; tick < 30; tick++) veteran.gameplay.tick();
    assert.equal(ignoring?.targetId, null);

    const fresh = createHarness({ prepare: prepared({ zoneId: 'sector-two', position: { x: 9, y: 11 } }, {}) });
    const hunting = fresh.gameplay.world.zoneOf(fresh.player).creatureByInstance('s2-mite-corridor-a');
    fresh.ticksUntil(() => hunting?.targetId === fresh.player.entityId, 50);
  });

  test('medgel cannot raise integrity above the maximum', () => {
    const harness = createHarness();
    const { player } = harness;
    const medgelSlot = player.record.inventory.findIndex((slot) => slot?.itemId === 'medgel');
    harness.send({ type: 'inventory.use', slotIndex: medgelSlot });
    assert.equal(player.integrity, player.maxIntegrity);
    assert.equal(countItem(player.record.inventory, 'medgel'), 2);
  });
});

describe('storyline continuity', () => {
  test('operatives who finished orientation earlier are handed the follow-up quest on login', () => {
    const harness = createHarness({
      prepare: prepared(ATRIUM_NEAR_KADE, { 'orientation-protocol': completed('orientation-protocol') }),
    });
    assert.equal(stepOf(harness, 'field-fabrication'), 0);
  });
});

describe('economy', () => {
  test('requisitions sells medgel for scrip and buys back loot', () => {
    const harness = createHarness({
      prepare: prepared({ zoneId: 'meridian-atrium', position: { x: 5, y: 4 } }, {}),
    });
    const { player } = harness;
    harness.gameplay.openShop(player, 'requisitions', 'atrium-okafor');
    const scripFor = () => countItem(player.record.inventory, 'meridian-scrip');
    harness.send({ type: 'shop.buy', itemId: 'medgel', quantity: 2 });
    assert.equal(countItem(player.record.inventory, 'medgel'), 3, 'cannot afford without scrip');

    player.update({ inventory: [{ itemId: 'meridian-scrip', quantity: 20 }, { itemId: 'gloam-chitin', quantity: 4 }, ...player.record.inventory.slice(2)] });
    harness.send({ type: 'shop.buy', itemId: 'medgel', quantity: 2 });
    assert.equal(scripFor(), 8);
    assert.ok(countItem(player.record.inventory, 'medgel') >= 2);

    const chitinSlot = player.record.inventory.findIndex((slot) => slot?.itemId === 'gloam-chitin');
    harness.send({ type: 'shop.sell', slotIndex: chitinSlot, quantity: 4 });
    assert.equal(countItem(player.record.inventory, 'gloam-chitin'), 0);
    assert.equal(scripFor(), 8 + 4 * 3);
  });

  test('walking away closes the shop', () => {
    const harness = createHarness({ prepare: prepared({ zoneId: 'meridian-atrium', position: { x: 5, y: 4 } }, {}) });
    harness.gameplay.openShop(harness.player, 'requisitions', 'atrium-okafor');
    harness.send({ type: 'world.walk', target: { x: 12, y: 16 } });
    assert.equal(harness.player.shopSession, null);
  });
});

describe('marksmanship path', () => {
  test('Kade issues one dart pistol, and shooting with it trains marksmanship from level 1', () => {
    const harness = createHarness({
      prepare: prepared(ATRIUM_NEAR_KADE, { 'live-fire': completed('live-fire'), 'the-knocking': completed('the-knocking') }),
    });
    const { player } = harness;
    harness.talkTo('atrium-kade');
    finishDialogue(harness, (text) => text.includes('sidearm'));
    assert.equal(countItem(player.record.inventory, 'dart-pistol'), 1);
    harness.talkTo('atrium-kade');
    finishDialogue(harness, (text) => text.includes('sidearm'));
    assert.equal(countItem(player.record.inventory, 'dart-pistol'), 1, 'only issued once');

    harness.equipItem('dart-pistol');
    assert.equal(player.record.equipment.primary, 'dart-pistol');
    const before = player.record.skills.marksmanship;
    defeat(harness, 'range-drone-a');
    assert.ok(player.record.skills.marksmanship > before);
    assert.equal(player.record.skills.closeQuarters, 0);
  });
});

describe('the far side', () => {
  test('The Far Side runs from Varga, through the Undercroft, to Halvorsen and back to Sel', () => {
    const skills = createStartingSkills({ closeQuarters: experienceForLevel(40), fortitude: experienceForLevel(45) });
    const harness = createHarness({
      prepare: prepared({ zoneId: 'intake-wing', position: { x: 25, y: 5 } }, { 'the-knocking': completed('the-knocking'), 'the-far-side': activeAt('the-far-side') }, {
        skills,
        vitals: { integrity: maxIntegrityFor(skills) },
        equipment: { torso: 'composite-plate', legs: 'intake-trousers', feet: 'work-boots', primary: 'shock-maul' },
      }),
    });
    const { player } = harness;

    harness.talkTo('intake-varga');
    finishDialogue(harness);
    assert.equal(countItem(player.record.inventory, 'lantern-lens'), 1);
    assert.ok(player.hasFlag('clearance.undercroft'));
    assert.equal(stepOf(harness, 'the-far-side'), 1);

    harness.gameplay.teleport(player, { zoneId: 'meridian-atrium', position: { x: 42, y: 28 } });
    harness.interactWithObject('atrium-service-lift');
    assert.equal(player.zoneId, 'undercroft');
    assert.equal(stepOf(harness, 'the-far-side'), 2);

    harness.interactWithObject('uc-junction-a');
    harness.ticksUntil(() => player.combatTargetId === null && player.path.length === 0, 2000);
    harness.interactWithObject('uc-junction-c');
    harness.ticksUntil(() => player.combatTargetId === null && player.path.length === 0, 2000);
    harness.interactWithObject('uc-junction-b');
    harness.ticksUntil(() => stepOf(harness, 'the-far-side') === 3, 2000);
    assert.ok(player.hasFlag('undercroft.power-restored'));

    harness.interactWithObject('uc-sector-three-seal-a');
    assert.equal(player.zoneId, 'undercroft', 'the seal stays shut while the Foreman stands');

    defeat(harness, 'uc-foreman', 6000);
    assert.equal(stepOf(harness, 'the-far-side'), 4);
    harness.ticksUntil(() => player.combatTargetId === null, 2000);

    harness.interactWithObject('uc-sector-three-seal-a');
    assert.equal(player.zoneId, 'sector-three');
    assert.equal(stepOf(harness, 'the-far-side'), 5);

    harness.talkTo('s3-halvorsen');
    finishDialogue(harness);
    assert.equal(stepOf(harness, 'the-far-side'), 6);

    harness.gameplay.teleport(player, ATRIUM_NEAR_SEL);
    harness.talkTo('atrium-sel');
    finishDialogue(harness, (text) => text.startsWith('Halvorsen is alive'));
    assert.equal(stepOf(harness, 'the-far-side'), 'completed');
    assert.ok(player.hasFlag('storyline.halvorsen-found'));
  });

  test('Mags trades, and Leech Season pays out a respirator for five sacs', () => {
    const harness = createHarness({ prepare: prepared({ zoneId: 'undercroft', position: { x: 7, y: 12 } }, {}) });
    const { player } = harness;
    harness.talkTo('undercroft-mags');
    finishDialogue(harness, (text) => text.startsWith('Need any work') || text.startsWith("I'll get"));
    assert.equal(stepOf(harness, 'leech-season'), 0);

    player.update({ inventory: [{ itemId: 'leech-sac', quantity: 5 }, ...player.record.inventory.slice(1)] });
    harness.gameplay.raiseQuestEvent(player, { type: 'loadoutChanged' });
    harness.talkTo('undercroft-mags');
    finishDialogue(harness, (text) => text.startsWith('Hand over'));
    assert.equal(stepOf(harness, 'leech-season'), 'completed');
    assert.equal(countItem(player.record.inventory, 'filter-respirator'), 1);
    assert.equal(countItem(player.record.inventory, 'leech-sac'), 0);
  });
});
