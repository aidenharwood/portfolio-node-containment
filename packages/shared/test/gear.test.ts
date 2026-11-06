import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  countItem,
  createEmptyInventory,
  createStartingSkills,
  equipFromInventory,
  equipmentStats,
  experienceForLevel,
  GAME_CONTENT,
  INVENTORY_CAPACITY,
  removeItem,
  unequipToInventory,
  type Wearer,
} from '../src/index.ts';

const items = GAME_CONTENT.items;
const novice: Wearer = { skills: createStartingSkills() };

describe('inventory', () => {
  test('stacks stackable items into one slot', () => {
    const first = addItem(createEmptyInventory(), items, 'medgel', 3);
    const second = addItem(first.inventory, items, 'medgel', 4);
    assert.equal(countItem(second.inventory, 'medgel'), 7);
    assert.equal(second.inventory.filter(Boolean).length, 1);
  });

  test('reports overflow when the inventory is full', () => {
    const full = addItem(createEmptyInventory(), items, 'intake-jumpsuit', INVENTORY_CAPACITY);
    const outcome = addItem(full.inventory, items, 'hazard-visor', 1);
    assert.equal(outcome.added, 0);
    assert.equal(outcome.overflow, 1);
  });

  test('refuses to remove more than is held', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'scrap-alloy', 2);
    assert.equal(removeItem(inventory, 'scrap-alloy', 3).ok, false);
    const removed = removeItem(inventory, 'scrap-alloy', 2);
    assert.ok(removed.ok);
    assert.equal(countItem(removed.value, 'scrap-alloy'), 0);
  });
});

describe('equipment', () => {
  test('equipping swaps the previous item back into the same inventory slot', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'field-vest-mk1', 1);
    const result = equipFromInventory({ inventory, equipment: { torso: 'intake-jumpsuit' } }, 0, items, novice);
    assert.ok(result.ok);
    assert.equal(result.value.equipment.torso, 'field-vest-mk1');
    assert.deepEqual(result.value.inventory[0], { itemId: 'intake-jumpsuit', quantity: 1 });
  });

  test('enforces skill requirements', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'kestrel-sidearm', 1);
    const result = equipFromInventory({ inventory, equipment: {} }, 0, items, novice);
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.error, /Marksmanship 5/);
  });

  test('unlocks restricted gear once the governing skill is trained', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'ward-lattice', 1);
    const trained: Wearer = { skills: createStartingSkills({ containment: experienceForLevel(10) }) };
    assert.equal(equipFromInventory({ inventory, equipment: {} }, 0, items, novice).ok, false);
    assert.equal(equipFromInventory({ inventory, equipment: {} }, 0, items, trained).ok, true);
  });

  test('unequipping returns the item to the inventory', () => {
    const result = unequipToInventory({ inventory: createEmptyInventory(), equipment: { eyes: 'hazard-visor' } }, 'eyes', items);
    assert.ok(result.ok);
    assert.equal(result.value.equipment.eyes, undefined);
    assert.equal(countItem(result.value.inventory, 'hazard-visor'), 1);
  });

  test('aggregates stats across equipped items', () => {
    const stats = equipmentStats({ torso: 'field-vest-mk1', eyes: 'hazard-visor' }, items);
    assert.equal(stats.armor, 6);
    assert.equal(stats.hazardShielding, 4);
    assert.equal(stats.cognitiveWard, 2);
  });
});
