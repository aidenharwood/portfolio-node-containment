import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addItem, countItem, createDefaultDraft, GAME_CONTENT, type GroundItemSnapshot, type ServerMessageOf } from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { Gameplay } from '../src/gameplay/gameplay.ts';
import { OWNER_PRIVACY_TICKS, GROUND_LIFETIME_TICKS } from '../src/gameplay/groundItemController.ts';
import { RecordingSink, at, levelPoint } from './support/testHarness.ts';

function setup() {
  const gameplay = new Gameplay(GAME_CONTENT, { save: () => undefined }, {
    tickMs: 300,
    autosaveIntervalMs: 60_000,
    random: () => 0.99,
    combatRandom: () => 0.01,
  });
  const join = (name: string, x: number) => {
    const record = createCharacterRecord({ ...createDefaultDraft(), name }, { id: name, accountId: name }, GAME_CONTENT);
    const sink = new RecordingSink();
    const inventory = addItem(record.inventory, GAME_CONTENT.items, 'medgel', 3).inventory;
    const player = gameplay.enterWorld({ ...record, inventory, location: at('meridian-atrium', { x, y: 16 }) }, sink);
    return { player, sink };
  };
  return { gameplay, owner: join('Owner Operative', 12), bystander: join('Other Operative', 13) };
}

const visibleIds = (sink: RecordingSink): Set<string> => {
  const ids = new Set<string>();
  for (const message of sink.messages) {
    if (message.type === 'world.groundItemAdded') ids.add((message as ServerMessageOf<'world.groundItemAdded'>).item.id);
    if (message.type === 'world.groundItemRemoved') ids.delete(message.id);
  }
  return ids;
};

describe('ground items', () => {
  test('dropped items are private to their owner for a minute, then public, then expire', () => {
    const { gameplay, owner, bystander } = setup();
    const slot = owner.player.record.inventory.findIndex((stack) => stack?.itemId === 'medgel');
    gameplay.handle(owner.player, { type: 'inventory.drop', slotIndex: slot });
    assert.equal(countItem(owner.player.record.inventory, 'medgel'), 0);

    const [dropped] = [...gameplay.world.levelOf(owner.player).groundItems.values()];
    assert.ok(dropped);
    assert.ok(visibleIds(owner.sink).has(dropped.id));
    assert.ok(!visibleIds(bystander.sink).has(dropped.id));

    gameplay.handle(bystander.player, { type: 'world.pickup', groundItemId: dropped.id });
    for (let tick = 0; tick < 20; tick++) gameplay.tick();
    assert.equal(countItem(bystander.player.record.inventory, 'medgel'), 3, 'cannot take an item you cannot see');

    for (let tick = 0; tick < OWNER_PRIVACY_TICKS; tick++) gameplay.tick();
    assert.ok(visibleIds(bystander.sink).has(dropped.id), 'items go public after the privacy window');

    for (let tick = 0; tick < GROUND_LIFETIME_TICKS; tick++) gameplay.tick();
    assert.equal(gameplay.world.levelOf(owner.player).groundItems.size, 0);
    assert.ok(!visibleIds(owner.sink).has(dropped.id));
  });

  test('the owner can walk over and pick their item back up', () => {
    const { gameplay, owner } = setup();
    const slot = owner.player.record.inventory.findIndex((stack) => stack?.itemId === 'medgel');
    gameplay.handle(owner.player, { type: 'inventory.drop', slotIndex: slot });
    const [dropped] = [...gameplay.world.levelOf(owner.player).groundItems.values()];
    assert.ok(dropped);
    gameplay.handle(owner.player, { type: 'world.walk', target: levelPoint('meridian-atrium', { x: 16, y: 16 }) });
    for (let tick = 0; tick < 10; tick++) gameplay.tick();
    gameplay.handle(owner.player, { type: 'world.pickup', groundItemId: dropped.id });
    for (let tick = 0; tick < 20 && countItem(owner.player.record.inventory, 'medgel') === 0; tick++) gameplay.tick();
    assert.equal(countItem(owner.player.record.inventory, 'medgel'), 3);
    assert.equal(gameplay.world.levelOf(owner.player).groundItems.size, 0);
  });

  test('a late arrival sees public ground items in the level snapshot', () => {
    const { gameplay, owner } = setup();
    const slot = owner.player.record.inventory.findIndex((stack) => stack?.itemId === 'medgel');
    gameplay.handle(owner.player, { type: 'inventory.drop', slotIndex: slot });
    for (let tick = 0; tick < OWNER_PRIVACY_TICKS + 1; tick++) gameplay.tick();
    const record = createCharacterRecord({ ...createDefaultDraft(), name: 'Late Operative' }, { id: 'late', accountId: 'late' }, GAME_CONTENT);
    const sink = new RecordingSink();
    gameplay.enterWorld({ ...record, location: at('meridian-atrium', { x: 10, y: 16 }) }, sink);
    const entered = sink.last('world.entered');
    assert.ok(entered?.groundItems.some((item: GroundItemSnapshot) => item.itemId === 'medgel' && !item.owned));
  });

  test('quest items cannot be dropped', () => {
    const { gameplay, owner } = setup();
    owner.player.update({ inventory: [{ itemId: 'expedition-log', quantity: 1 }, ...owner.player.record.inventory.slice(1)] });
    gameplay.handle(owner.player, { type: 'inventory.drop', slotIndex: 0 });
    assert.equal(countItem(owner.player.record.inventory, 'expedition-log'), 1);
  });
});
