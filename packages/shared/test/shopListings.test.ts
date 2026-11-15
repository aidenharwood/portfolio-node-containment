import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CURRENCY_ITEM_ID, GAME_CONTENT, offeredListings, purchase, type InventoryState } from '../src/index.ts';

const vance = GAME_CONTENT.shops.get('vance-noodles')!;
const wallet: InventoryState = [{ itemId: CURRENCY_ITEM_ID, quantity: 500 }, ...Array.from({ length: 27 }, () => null)];

test("Vance's broth is only on the menu after Noodle Run", () => {
  assert.equal(offeredListings(vance, {}).some((listing) => listing.itemId === 'tide-broth'), false);
  const done = { 'noodle-run': { questId: 'noodle-run', status: 'completed' as const, stepIndex: 0, objectiveProgress: [] } };
  assert.equal(offeredListings(vance, done).some((listing) => listing.itemId === 'tide-broth'), true);
  assert.equal(purchase(wallet, GAME_CONTENT.items, vance, 'tide-broth', 1, {}).ok, false);
  assert.equal(purchase(wallet, GAME_CONTENT.items, vance, 'tide-broth', 1, done).ok, true);
});
