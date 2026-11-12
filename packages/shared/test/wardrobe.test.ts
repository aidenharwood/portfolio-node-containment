import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  appearanceItemIds,
  createEmptyInventory,
  GAME_CONTENT,
  recipeGroupOf,
  removeCosmetic,
  wearCosmetic,
  WEAPON_VARIANT_SPECS,
  type ItemDefinition,
  type StatBlock,
} from '../src/index.ts';

const items = GAME_CONTENT.items;
const inventoryWith = (...itemIds: string[]) => itemIds.reduce((inventory, itemId) => addItem(inventory, items, itemId, 1).inventory, createEmptyInventory());

describe('wardrobe', () => {
  test('wearing a cosmetic moves it from the inventory into its wardrobe slot', () => {
    const result = wearCosmetic({ inventory: inventoryWith('night-shift-hood'), wardrobe: {} }, 0, items);
    assert.ok(result.ok);
    assert.equal(result.value.wardrobe.head, 'night-shift-hood');
    assert.equal(result.value.inventory[0], null);
  });

  test('wearing over a worn cosmetic swaps the old one back into the same slot', () => {
    const result = wearCosmetic({ inventory: inventoryWith('parade-dress-helm'), wardrobe: { head: 'night-shift-hood' } }, 0, items);
    assert.ok(result.ok);
    assert.equal(result.value.wardrobe.head, 'parade-dress-helm');
    assert.equal(result.value.inventory[0]?.itemId, 'night-shift-hood');
  });

  test('refuses to wear gear or materials as cosmetics', () => {
    assert.equal(wearCosmetic({ inventory: inventoryWith('rimeguard-helm'), wardrobe: {} }, 0, items).ok, false);
    assert.equal(wearCosmetic({ inventory: inventoryWith('alloy-plate'), wardrobe: {} }, 0, items).ok, false);
  });

  test('removing a cosmetic returns it to the inventory', () => {
    const result = removeCosmetic({ inventory: createEmptyInventory(), wardrobe: { torso: 'hazmat-suit' } }, 'torso', items);
    assert.ok(result.ok);
    assert.equal(result.value.wardrobe.torso, undefined);
    assert.equal(result.value.inventory[0]?.itemId, 'hazmat-suit');
  });

  test('cosmetics show in place of gear in the same slot and leave other slots alone', () => {
    const shown = appearanceItemIds({ head: 'rimeguard-helm', torso: 'rimeguard-plate', primary: 'cryo-maul' }, { head: 'mourning-veil' });
    assert.deepEqual(shown, ['mourning-veil', 'rimeguard-plate', 'cryo-maul']);
  });
});

describe('armour lines', () => {
  const byLine = (motif: string) => [...items.values()].filter((item) => !item.equipment?.weapon && item.equipment?.slot !== 'implant' && item.equipment?.visual.motif === motif);
  const total = (item: ItemDefinition) => Object.values(item.equipment?.stats ?? {}).reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const stat = (item: ItemDefinition, id: keyof StatBlock) => item.equipment?.stats[id] ?? 0;

  test('every tier offers a marksman line and a psionic line beside its heavy set', () => {
    assert.equal(byLine('skirmisher').length, byLine('warden').length);
    assert.ok(byLine('skirmisher').length >= 50);
    assert.ok(byLine('skirmisher').every((item) => item.equipment?.requirements?.skills?.marksmanship));
    assert.ok(byLine('warden').every((item) => item.equipment?.requirements?.skills?.psionics));
  });

  test('the lines trade armour for their specialty rather than outclassing the heavy set', () => {
    const heavy = items.get('cathedral-plate')!;
    const skirmisher = items.get('pilgrim-harness')!;
    const warden = items.get('chorister-vestments')!;
    assert.ok(stat(skirmisher, 'armor') < stat(heavy, 'armor'));
    assert.ok(stat(warden, 'armor') < stat(heavy, 'armor'));
    assert.ok(stat(skirmisher, 'accuracy') > stat(heavy, 'accuracy'));
    assert.ok(stat(warden, 'cognitiveWard') > stat(heavy, 'cognitiveWard'));
    for (const piece of [skirmisher, warden]) assert.ok(Math.abs(total(piece) - total(heavy)) <= total(heavy) * 0.2, `${piece.id} budget ${total(piece)} vs ${total(heavy)}`);
  });
});

describe('crafting groups', () => {
  test('sorts recipes into armour, weapons, kit, wardrobe, parts and medicine', () => {
    const group = (id: string) => recipeGroupOf(GAME_CONTENT.recipes.get(id)!, items);
    assert.equal(group('fabricator:rimeguard-helm'), 'armour');
    assert.equal(group('fabricator:frostline-hood'), 'armour');
    assert.equal(group('fabricator:cryo-maul'), 'weapons');
    assert.equal(group('fabricator:stasis-implant'), 'kit');
    assert.equal(group('fabricator:hazmat-suit'), 'cosmetics');
    assert.equal(group('refinery:alloy-plate'), 'parts');
    assert.equal(group('synthesiser:medgel'), 'medicine');
  });
});

describe('back slot', () => {
  test('every armour tier offers a pack or cape for each line, and outfits can dress the back too', () => {
    const backs = [...items.values()].filter((item) => item.equipment?.slot === 'back');
    for (const skill of ['fortitude', 'marksmanship', 'psionics'] as const) {
      assert.equal(backs.filter((item) => item.equipment?.requirements?.skills?.[skill]).length, 11, skill);
    }
    assert.ok([...items.values()].some((item) => item.cosmetic?.slot === 'back' && item.icon === 'cape'));
    const result = wearCosmetic({ inventory: inventoryWith('mourning-shroud'), wardrobe: {} }, 0, items);
    assert.ok(result.ok);
    assert.equal(result.value.wardrobe.back, 'mourning-shroud');
  });
});

describe('weapon variants', () => {
  test('every variant changes pace, keeps its kind and requirement, and is crafted like its base', () => {
    for (const spec of WEAPON_VARIANT_SPECS) {
      const base = items.get(spec.base)?.equipment;
      const variant = items.get(spec.id)?.equipment;
      assert.ok(base?.weapon && variant?.weapon, spec.id);
      assert.equal(variant.weapon.kind, base.weapon.kind);
      assert.notEqual(variant.weapon.speedTicks, base.weapon.speedTicks);
      assert.deepEqual(variant.requirements, base.requirements);
      assert.ok(variant.visual.motif, spec.id);
      const recipe = GAME_CONTENT.recipes.get(`fabricator:${spec.id}`);
      assert.deepEqual(recipe?.inputs, GAME_CONTENT.recipes.get(`fabricator:${spec.base}`)?.inputs);
    }
  });
});
