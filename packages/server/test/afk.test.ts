import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  clearanceFlag,
  clearanceTierOf,
  countItem,
  createStartingSkills,
  CURRENCY_ITEM_ID,
  experienceForLevel,
  GAME_CONTENT,
  maxIntegrityFor,
  type CharacterRecord,
  type MarketOrder,
  type QuestProgress,
  type WorldLocation,
} from '@containment/shared';
import { retireContainmentSeals, retireSealOrder } from '../src/characters/retiredSeals.ts';
import { anchor, createHarness, at, inRoom, type Harness, localInRoom } from './support/testHarness.ts';

const DIAGNOSTICS: WorldLocation = inRoom('intake-wing', 'diagnostics');
const COLD_STORE_RESIN: WorldLocation = anchor('service-yards', 'coldStoreResin');
const WORKSHOP: WorldLocation = anchor('intake-wing', 'workshopFloor');

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const notices = (harness: Harness) => harness.sink.messages.flatMap((message) => (message.type === 'notice' ? [message.text] : []));

function veteran(location: WorldLocation, extra: Partial<CharacterRecord> = {}) {
  return (record: CharacterRecord): CharacterRecord => {
    const skills = createStartingSkills({
      closeQuarters: experienceForLevel(40),
      fortitude: experienceForLevel(40),
      salvage: experienceForLevel(10),
      containment: experienceForLevel(5),
    });
    return {
      ...record,
      location,
      quests: { 'live-fire': completed('live-fire') },
      skills,
      vitals: { integrity: maxIntegrityFor(skills) },
      equipment: { ...record.equipment, primary: 'stun-baton' },
      ...extra,
    };
  };
}

const chooseOption = (harness: Harness, prefix: string) => {
  const option = harness.sink.last('dialogue.opened')?.view.options?.find((candidate) => candidate.text.startsWith(prefix));
  assert.ok(option, `no dialogue option starting "${prefix}"`);
  harness.send({ type: 'dialogue.choose', optionIndex: option.index });
};

describe('containment clearance', () => {
  test('the Registrar sells the next clearance and refuses one the operative is not qualified for', () => {
    const harness = createHarness({
      prepare: (record) => {
        const prepared = veteran(DIAGNOSTICS, { flags: [clearanceFlag(1)] })(record);
        return { ...prepared, inventory: addItem(prepared.inventory, GAME_CONTENT.items, CURRENCY_ITEM_ID, 300).inventory };
      },
    });
    const scripBefore = countItem(harness.player.record.inventory, CURRENCY_ITEM_ID);

    harness.talkTo('intake-registrar');
    assert.match(harness.sink.last('dialogue.opened')?.view.options?.[0]?.text ?? '', /Clearance II\. \(100 scrip, Containment 5\)/);
    chooseOption(harness, 'Apply for');
    assert.equal(clearanceTierOf(harness.player.record.flags), 2);
    assert.equal(countItem(harness.player.record.inventory, CURRENCY_ITEM_ID), scripBefore - 100);

    chooseOption(harness, 'Apply for');
    assert.equal(clearanceTierOf(harness.player.record.flags), 2, 'Clearance III needs Containment 8');
    assert.equal(countItem(harness.player.record.inventory, CURRENCY_ITEM_ID), scripBefore - 100);
    assert.ok(notices(harness).some((text) => text.includes('Containment level 8')));
  });

  test('old saves trade carried and stored seals for scrip and keep their first clearance', () => {
    const record = createHarness().player.record;
    const inventory = [{ itemId: 'containment-seal-2', quantity: 3 }, { itemId: CURRENCY_ITEM_ID, quantity: 10 }, ...record.inventory.slice(2)];
    const migrated = retireContainmentSeals(
      { ...record, inventory, storage: [{ itemId: 'containment-seal-1', quantity: 4 }], quests: { 'live-fire': completed('live-fire') } },
      GAME_CONTENT,
    );
    assert.equal(countItem(migrated.inventory, 'containment-seal-2'), 0);
    assert.equal(countItem(migrated.inventory, CURRENCY_ITEM_ID), 10 + 3 * 14);
    assert.deepEqual(migrated.storage, [{ itemId: CURRENCY_ITEM_ID, quantity: 4 * 5 }]);
    assert.equal(clearanceTierOf(migrated.flags), 1);
    assert.equal(retireContainmentSeals(migrated, GAME_CONTENT), migrated, 'the migration runs once');
  });

  test('open market orders for seals close and pay out in scrip', () => {
    const order: MarketOrder = {
      id: 'order-1',
      ownerId: 'character-1',
      side: 'sell',
      itemId: 'containment-seal-3',
      price: 40,
      quantity: 5,
      filled: 2,
      sequence: 1,
      open: true,
      uncollectedItems: 0,
      uncollectedScrip: 80,
    };
    const retired = retireSealOrder(order);
    assert.equal(retired.open, false);
    assert.equal(retired.uncollectedScrip, 80 + 3 * 29);
    assert.equal(retireSealOrder(retired), retired);
  });
});

describe('relentless training creatures and gathering', () => {
  test('a lint mite attacks an operative far above its level, who fights back', () => {
    const harness = createHarness({ prepare: veteran(COLD_STORE_RESIN) });
    const level = harness.gameplay.world.levelOf(harness.player);
    const mites = [...level.creatures.values()].filter((creature) => creature.definition.id === 'lint-mite');
    assert.ok(mites.length >= 4);
    harness.ticksUntil(() => mites.some((mite) => mite.targetId === harness.player.entityId), 100);
    harness.ticksUntil(() => harness.player.combatTargetId !== null, 100);
    harness.ticksUntil(() => mites.some((mite) => !mite.isAlive), 600);
    const ground = [...level.groundItems.values()].filter((item) => item.ownerId === harness.player.entityId);
    assert.equal(ground.length, 0, 'training creatures drop nothing');
  });

  test('an attack interrupts gathering', () => {
    const harness = createHarness({ prepare: veteran(COLD_STORE_RESIN) });
    harness.interactWithObject('yd-cold-resin-a');
    harness.ticksUntil(() => harness.player.activity?.kind === 'gather', 20);
    harness.ticksUntil(() => notices(harness).some((text) => text.includes('stopped gathering')), 200);
    assert.notEqual(harness.player.activity?.kind, 'gather');
  });

  test('a tier one node yields well past its charges before it runs dry', () => {
    const harness = createHarness({
      gatheringRandom: () => 0.4,
      prepare: (record) => ({ ...record, location: WORKSHOP, quests: { 'orientation-protocol': completed('orientation-protocol') } }),
    });
    harness.interactWithObject('intake-scrap-b');
    harness.ticksUntil(() => countItem(harness.player.record.inventory, 'scrap-alloy') >= 12, 400);
    assert.equal(harness.player.activity?.kind, 'gather');
    assert.ok(!harness.sink.messages.some((message) => message.type === 'world.objectDepleted' && message.depleted));
  });
});
