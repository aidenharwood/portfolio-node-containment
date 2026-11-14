import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  clearanceTierOf,
  countItem,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  type CharacterRecord,
  type QuestProgress,
  type WorldLocation,
} from '@containment/shared';
import { PLAYER_RECOVERY_TICKS } from '../src/gameplay/combatController.ts';
import { CONSUMABLE_COOLDOWN_MESSAGE } from '../src/gameplay/gearController.ts';
import { containSpecimen } from './support/containment.ts';
import { anchor, createHarness, finishDialogue, type Harness, at, districtOf, inRoom, levelPoint, localInRoom } from './support/testHarness.ts';

const NEAR_MITE: WorldLocation = inRoom('fx-field', 'lane', { x: 18, y: 4 });
const FAR_FROM_MITE: WorldLocation = inRoom('fx-field', 'lane', { x: 34, y: 4 });
const BY_TRADER: WorldLocation = inRoom('fx-hub', 'plaza', { x: 6, y: 5 });
const leashBreak = () => levelPoint('fx-field', localInRoom('fx-field', 'lane', { x: 1, y: 5 }));
const inSafehouse = (harness: Harness) => harness.gameplay.world.levelOf(harness.player).areasAt(harness.player.position).some((area) => area.id === 'safehouse');

const activeAt = (questId: string, stepIndex = 0, objectiveCount = 1): QuestProgress => ({
  questId,
  status: 'active',
  stepIndex,
  objectiveProgress: Array.from({ length: objectiveCount }, () => 0),
});

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const prepared = (location: WorldLocation, quests: Record<string, QuestProgress>, changes: Partial<CharacterRecord> = {}) =>
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
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance(instanceId);
  assert.ok(creature, `missing creature ${instanceId}`);
  if (!creature.isAlive) return;
  harness.approach(instanceId);
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
  harness.ticksUntil(() => !creature.isAlive, limit);
}

describe('combat', () => {
  test('an incapacitated operative is recovered to safety at full integrity', () => {
    const harness = createHarness({
      prepare: prepared(NEAR_MITE, {}, { vitals: { integrity: 1 } }),
    });
    const { player } = harness;
    harness.ticksUntil(() => inSafehouse(harness), 200);
    assert.equal(player.integrity, player.maxIntegrity);
    assert.equal(player.combatTargetId, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /incapacitated/);
  });

  test('an incapacitated operative lies where they fell before medical recovers them', () => {
    const harness = createHarness({
      prepare: prepared(NEAR_MITE, {}, { vitals: { integrity: 1 } }),
    });
    const { player, sink } = harness;
    const fell = () => sink.messages.some((message) => message.type === 'combat.death' && message.entityId === player.entityId);
    harness.ticksUntil(fell, 200);
    const fallenAt = player.position;
    assert.equal(districtOf(player), 'fx-field');
    assert.equal(player.integrity, 0);

    harness.send({ type: 'world.walk', target: leashBreak() });
    let ticks = 0;
    while (!inSafehouse(harness) && ticks < 50) {
      assert.deepEqual(player.position, fallenAt);
      harness.gameplay.tick();
      ticks++;
    }
    assert.equal(ticks, PLAYER_RECOVERY_TICKS);
    assert.ok(inSafehouse(harness));
    assert.equal(player.integrity, player.maxIntegrity);
  });

  test('an operative who disconnects while incapacitated is saved recovered', () => {
    const harness = createHarness({
      prepare: prepared(NEAR_MITE, {}, { vitals: { integrity: 1 } }),
    });
    const { player, sink } = harness;
    harness.ticksUntil(() => sink.messages.some((message) => message.type === 'combat.death' && message.entityId === player.entityId), 200);
    harness.gameplay.leaveWorld(player);
    const saved = harness.saved.at(-1);
    assert.ok(saved);
    assert.equal(saved.vitals.integrity, player.maxIntegrity);
    assert.deepEqual(saved.location, anchor('fx-field', 'recovery'));
  });

  test('creatures give up the chase beyond their leash and heal', () => {
    const harness = createHarness({
      prepare: prepared(NEAR_MITE, {}, veteranSkills()),
      combatRandom: () => 0.99,
    });
    const { player, gameplay } = harness;
    const mite = gameplay.world.levelOf(player).creatureByInstance('field-mite-a');
    assert.ok(mite);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'field-mite-a', interactionIndex: 0 });
    harness.ticksUntil(() => mite.targetId === player.entityId, 50);
    harness.send({ type: 'world.walk', target: leashBreak() });
    harness.ticksUntil(() => mite.targetId === null && mite.returningHome === false, 400);
    assert.equal(mite.integrity, mite.definition.integrity);
  });

  test('creatures under ranged fire chase past their leash instead of fleeing home to heal', () => {
    const skills = createStartingSkills({ marksmanship: experienceForLevel(40), fortitude: experienceForLevel(40) });
    const harness = createHarness({
      prepare: prepared(FAR_FROM_MITE, {}, {
        skills,
        vitals: { integrity: maxIntegrityFor(skills) },
        equipment: { primary: 'long-rifle' },
      }),
      combatRandom: () => 0.99,
    });
    const { player, gameplay } = harness;
    const mite = gameplay.world.levelOf(player).creatureByInstance('field-mite-a');
    assert.ok(mite);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'field-mite-a', interactionIndex: 0 });
    let fled = false;
    let farthest = 0;
    for (let tick = 0; tick < 120; tick++) {
      gameplay.tick();
      fled ||= mite.returningHome;
      farthest = Math.max(farthest, Math.abs(mite.position.x - mite.home.x), Math.abs(mite.position.y - mite.home.y));
    }
    assert.ok(farthest > mite.definition.leashRadius, 'the mite has to cross its leash to reach a rifle at range');
    assert.equal(fled, false);
    assert.equal(mite.targetId, player.entityId);
  });

  test('aggressive creatures ignore operatives far above their level, but not fresh ones', () => {
    const veteran = createHarness({ prepare: prepared(NEAR_MITE, {}, veteranSkills()) });
    const ignoring = veteran.gameplay.world.levelOf(veteran.player).creatureByInstance('field-mite-a');
    for (let tick = 0; tick < 30; tick++) veteran.gameplay.tick();
    assert.equal(ignoring?.targetId, null);

    const fresh = createHarness({ prepare: prepared(NEAR_MITE, {}) });
    const hunting = fresh.gameplay.world.levelOf(fresh.player).creatureByInstance('field-mite-a');
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

  test('healing items can only be used once every three ticks', () => {
    const harness = createHarness();
    const { player } = harness;
    const useMedgel = () => {
      const slotIndex = player.record.inventory.findIndex((slot) => slot?.itemId === 'medgel');
      harness.send({ type: 'inventory.use', slotIndex });
    };

    const noticesBefore = harness.sink.messages.filter((message) => message.type === 'notice').length;
    useMedgel();
    assert.equal(countItem(player.record.inventory, 'medgel'), 2);
    useMedgel();
    assert.equal(countItem(player.record.inventory, 'medgel'), 2);
    assert.equal(harness.sink.messages.filter((message) => message.type === 'notice').length, noticesBefore);
    assert.equal(harness.sink.last('chat.message')?.text, CONSUMABLE_COOLDOWN_MESSAGE);

    harness.gameplay.tick();
    harness.gameplay.tick();
    useMedgel();
    assert.equal(countItem(player.record.inventory, 'medgel'), 2);

    harness.gameplay.tick();
    useMedgel();
    assert.equal(countItem(player.record.inventory, 'medgel'), 1);
  });
});

describe('shops', () => {
  test('a trader sells medgel for scrip and buys back loot', () => {
    const harness = createHarness({
      prepare: prepared(BY_TRADER, {}),
    });
    const { player } = harness;
    harness.approach('hub-trader');
    harness.gameplay.openShop(player, 'supplies', 'hub-trader');
    const scripFor = () => countItem(player.record.inventory, 'meridian-scrip');
    harness.send({ type: 'shop.buy', itemId: 'medgel', quantity: 2 });
    assert.equal(countItem(player.record.inventory, 'medgel'), 3, 'cannot afford without scrip');

    player.update({ inventory: [{ itemId: 'meridian-scrip', quantity: 20 }, { itemId: 'gel-sac', quantity: 4 }, ...player.record.inventory.slice(2)] });
    harness.send({ type: 'shop.buy', itemId: 'medgel', quantity: 2 });
    assert.equal(scripFor(), 8);
    assert.ok(countItem(player.record.inventory, 'medgel') >= 2);

    const chitinSlot = player.record.inventory.findIndex((slot) => slot?.itemId === 'gel-sac');
    harness.send({ type: 'shop.sell', slotIndex: chitinSlot, quantity: 4 });
    assert.equal(countItem(player.record.inventory, 'gel-sac'), 0);
    assert.equal(scripFor(), 8 + 4 * 3);
  });

  test('walking away closes the shop', () => {
    const harness = createHarness({ prepare: prepared(BY_TRADER, {}) });
    harness.gameplay.openShop(harness.player, 'supplies', 'hub-trader');
    harness.send({ type: 'world.walk', target: levelPoint('fx-hub', localInRoom('fx-hub', 'hall')) });
    assert.equal(harness.player.shopSession, null);
  });
});

describe('marksmanship path', () => {
});
