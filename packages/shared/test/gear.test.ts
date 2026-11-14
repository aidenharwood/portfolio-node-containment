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
  INVENTORY_CAPACITY,
  removeItem,
  unequipToInventory,
  type Wearer,
} from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const items = FIXTURE_CONTENT.items;
const novice: Wearer = { skills: createStartingSkills() };

describe('inventory', () => {
  test('stacks stackable items into one slot', () => {
    const first = addItem(createEmptyInventory(), items, 'medgel', 3);
    const second = addItem(first.inventory, items, 'medgel', 4);
    assert.equal(countItem(second.inventory, 'medgel'), 7);
    assert.equal(second.inventory.filter(Boolean).length, 1);
  });

  test('reports overflow when the inventory is full', () => {
    const full = addItem(createEmptyInventory(), items, 'work-jumpsuit', INVENTORY_CAPACITY);
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
    const { inventory } = addItem(createEmptyInventory(), items, 'field-vest', 1);
    const result = equipFromInventory({ inventory, equipment: { torso: 'work-jumpsuit' } }, 0, items, novice);
    assert.ok(result.ok);
    assert.equal(result.value.equipment.torso, 'field-vest');
    assert.deepEqual(result.value.inventory[0], { itemId: 'work-jumpsuit', quantity: 1 });
  });

  test('enforces skill requirements', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'long-rifle', 1);
    const result = equipFromInventory({ inventory, equipment: {} }, 0, items, novice);
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.error, /Marksmanship 5/);
  });

  test('unlocks restricted gear once the governing skill is trained', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'heavy-maul', 1);
    const trained: Wearer = { skills: createStartingSkills({ closeQuarters: experienceForLevel(5) }) };
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
    const stats = equipmentStats({ torso: 'field-vest', eyes: 'hazard-visor' }, items);
    assert.equal(stats.armor, 6);
    assert.equal(stats.hazardShielding, 4);
    assert.equal(stats.cognitiveWard, 2);
  });
});
