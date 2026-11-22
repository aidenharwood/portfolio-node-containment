import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CURRENCY_ITEM_ID, GAME_CONTENT, npcIdsForObjective, offeredListings, purchase, type InventoryState } from '../src/index.ts';

const mess = GAME_CONTENT.shops.get('kestrel-mess')!;
const wallet: InventoryState = [{ itemId: CURRENCY_ITEM_ID, quantity: 500 }, ...Array.from({ length: 27 }, () => null)];

test("the Mess only serves broth once Dace's names are settled", () => {
  assert.equal(offeredListings(mess, {}).some((listing) => listing.itemId === 'tide-broth'), false);
  const done = { 'names-in-the-bunks': { questId: 'names-in-the-bunks', status: 'completed' as const, stepIndex: 0, objectiveProgress: [] } };
  assert.equal(offeredListings(mess, done).some((listing) => listing.itemId === 'tide-broth'), true);
  assert.equal(purchase(wallet, GAME_CONTENT.items, mess, 'tide-broth', 1, {}).ok, false);
  assert.equal(purchase(wallet, GAME_CONTENT.items, mess, 'tide-broth', 1, done).ok, true);
});

test('the quest helper points at a shopkeeper who stocks the item', () => {
  const objective = { type: 'obtainItem' as const, itemId: 'day-old-loaf', count: 1, label: 'Get a day-old loaf' };
  const keepers = npcIdsForObjective(objective, GAME_CONTENT.npcs, GAME_CONTENT.dialogues, GAME_CONTENT.shops);
  const bakers = [...GAME_CONTENT.npcs.values()].filter((npc) => npc.shopId === 'ostrowski-bakery').map((npc) => npc.id);
  assert.ok(bakers.length > 0);
  for (const baker of bakers) assert.ok(keepers.has(baker));
});

test('quest guidance skips shops whose listing of the item is still locked', () => {
  const objective = { type: 'obtainItem', itemId: 'smoked-eel', count: 1, label: 'Buy a smoked eel' } as const;
  const locked = npcIdsForObjective(objective, GAME_CONTENT.npcs, GAME_CONTENT.dialogues, GAME_CONTENT.shops, {});
  assert.ok(locked.has('quartermaster-okonkwo'));
  assert.ok(!locked.has('cook-tavi'));
  const unlocked = npcIdsForObjective(objective, GAME_CONTENT.npcs, GAME_CONTENT.dialogues, GAME_CONTENT.shops, { 'names-in-the-bunks': { status: 'completed' } } as never);
  assert.ok(unlocked.has('cook-tavi'));
});
