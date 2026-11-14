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
  maxIntegrityFor,
  type CharacterRecord,
  type QuestProgress,
  type WorldLocation,
} from '@containment/shared';
import { anchor, createHarness, at, inRoom, type Harness, localInRoom, CONTENT } from './support/testHarness.ts';

const DIAGNOSTICS: WorldLocation = inRoom('fx-hub', 'plaza');
const COLD_STORE_RESIN: WorldLocation = inRoom('fx-field', 'range', { x: 8, y: 7 });
const WORKSHOP: WorldLocation = anchor('fx-field', 'laneByNode');

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
        return { ...prepared, inventory: addItem(prepared.inventory, CONTENT.items, CURRENCY_ITEM_ID, 300).inventory };
      },
    });
    const scripBefore = countItem(harness.player.record.inventory, CURRENCY_ITEM_ID);

    harness.talkTo('hub-registrar');
    assert.match(harness.sink.last('dialogue.opened')?.view.options?.[0]?.text ?? '', /Clearance II\. \(100 scrip, Containment 5\)/);
    chooseOption(harness, 'Apply for');
    assert.equal(clearanceTierOf(harness.player.record.flags), 2);
    assert.equal(countItem(harness.player.record.inventory, CURRENCY_ITEM_ID), scripBefore - 100);

    chooseOption(harness, 'Apply for');
    assert.equal(clearanceTierOf(harness.player.record.flags), 2, 'Clearance III needs Containment 8');
    assert.equal(countItem(harness.player.record.inventory, CURRENCY_ITEM_ID), scripBefore - 100);
    assert.ok(notices(harness).some((text) => text.includes('Containment level 8')));
  });
});

describe('relentless training creatures and gathering', () => {
  test('a lint mite attacks an operative far above its level, who fights back', () => {
    const harness = createHarness({ prepare: veteran(COLD_STORE_RESIN) });
    const level = harness.gameplay.world.levelOf(harness.player);
    const mites = [...level.creatures.values()].filter((creature) => creature.definition.id === 'lint-mite');
    assert.ok(mites.length >= 1);
    harness.ticksUntil(() => mites.some((mite) => mite.targetId === harness.player.entityId), 100);
    harness.ticksUntil(() => harness.player.combatTargetId !== null, 100);
    harness.ticksUntil(() => mites.some((mite) => !mite.isAlive), 600);
    const ground = [...level.groundItems.values()].filter((item) => item.ownerId === harness.player.entityId);
    assert.equal(ground.length, 0, 'training creatures drop nothing');
  });

  test('an attack interrupts gathering', () => {
    const harness = createHarness({ prepare: veteran(COLD_STORE_RESIN) });
    harness.interactWithObject('range-scrap');
    harness.ticksUntil(() => harness.player.activity?.kind === 'gather', 20);
    harness.ticksUntil(() => notices(harness).some((text) => text.includes('stopped gathering')), 200);
    assert.notEqual(harness.player.activity?.kind, 'gather');
  });

  test('a tier one node yields well past its charges before it runs dry', () => {
    const harness = createHarness({
      gatheringRandom: () => 0.4,
      prepare: (record) => ({ ...record, location: WORKSHOP }),
    });
    harness.interactWithObject('field-scrap-b');
    harness.ticksUntil(() => countItem(harness.player.record.inventory, 'scrap-alloy') >= 12, 400);
    assert.equal(harness.player.activity?.kind, 'gather');
    assert.ok(!harness.sink.messages.some((message) => message.type === 'world.objectDepleted' && message.depleted));
  });
});
