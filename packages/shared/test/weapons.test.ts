import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  createEmptyInventory,
  createStartingSkills,
  equipFromInventory,
  experienceForLevel,
  GAME_CONTENT,
  hasLineOfSight,
  INVENTORY_CAPACITY,
  isWithinAttackRange,
  parseZoneLayout,
  playerAttackProfile,
  WEAPON_KIND_INFO,
  WEAPON_KINDS,
  type Wearer,
} from '../src/index.ts';

const items = GAME_CONTENT.items;
const veteran: Wearer = {
  skills: createStartingSkills({ closeQuarters: experienceForLevel(40), marksmanship: experienceForLevel(40) }),
};

const layout = parseZoneLayout([
  '#######',
  '#.....#',
  '#.#...#',
  '#.....#',
  '#######',
]);
const sightline = (from: { x: number; y: number }, to: { x: number; y: number }) => hasLineOfSight(layout, from, to);

const weapons = [...items.values()].filter((item) => item.equipment?.weapon);

describe('weapon kinds', () => {
  test('every held weapon kind is stocked, with both one- and two-handed options for each style', () => {
    for (const kind of WEAPON_KINDS.filter((kind) => kind !== 'unarmed')) {
      assert.ok(weapons.some((item) => item.equipment?.weapon?.kind === kind), `no ${kind} in the catalogue`);
    }
    for (const style of ['melee', 'ranged'] as const) {
      for (const grip of ['oneHanded', 'twoHanded'] as const) {
        const matching = weapons.filter((item) => {
          const info = WEAPON_KIND_INFO[item.equipment!.weapon!.kind];
          return info.style === style && info.grip === grip;
        });
        assert.ok(matching.length >= 2, `${grip} ${style} has ${matching.length} weapons`);
      }
    }
  });

  test('every ranged kind fires a projectile and no melee kind does', () => {
    for (const kind of WEAPON_KINDS) {
      const info = WEAPON_KIND_INFO[kind];
      assert.equal(info.projectile !== null, info.style === 'ranged', kind);
    }
  });

  test('faster kinds hit lighter, so damage per tick stays close across kinds', () => {
    const rating = 40;
    const reference = (1 + Math.floor(rating / 4) + 1) / 2 / 5;
    const typicalSpeed = { unarmed: 4, knife: 3, baton: 4, blade: 4, maul: 5, polearm: 5, pistol: 4, carbine: 5, rifle: 7, scattergun: 5 } as const;
    for (const kind of WEAPON_KINDS) {
      const maxHit = 1 + Math.floor((rating * WEAPON_KIND_INFO[kind].damageScale) / 4);
      const perTick = (maxHit + 1) / 2 / typicalSpeed[kind];
      assert.ok(perTick / reference > 0.75 && perTick / reference < 1.35, `${kind} deals ${(perTick / reference).toFixed(2)}× the reference`);
    }
  });

  test('the attack profile carries the weapon kind and its damage scale', () => {
    const skills = createStartingSkills({ closeQuarters: experienceForLevel(20) });
    const knife = playerAttackProfile(skills, { primary: 'quill-knife' }, items);
    const unarmed = playerAttackProfile(skills, {}, items);
    assert.equal(knife.weapon, 'knife');
    assert.equal(knife.speedTicks, 3);
    assert.equal(unarmed.weapon, 'unarmed');
    assert.equal(knife.maxHit, 1 + Math.floor((knife.accuracy * 0.75) / 4));
    const rifle = playerAttackProfile(createStartingSkills({ marksmanship: experienceForLevel(20) }), { primary: 'redaction-rifle' }, items);
    assert.equal(rifle.style, 'ranged');
    assert.equal(rifle.range, 9);
  });
});

describe('polearm reach', () => {
  const pike = { style: 'melee' as const, range: 2 };

  test('reaches two tiles in a straight line', () => {
    assert.ok(isWithinAttackRange(pike, { x: 3, y: 1 }, { x: 5, y: 1 }, sightline));
    assert.ok(isWithinAttackRange(pike, { x: 3, y: 1 }, { x: 4, y: 1 }, sightline));
  });

  test('cannot reach diagonally, past its length or through a wall', () => {
    assert.ok(!isWithinAttackRange(pike, { x: 3, y: 1 }, { x: 4, y: 2 }, sightline));
    assert.ok(!isWithinAttackRange(pike, { x: 1, y: 1 }, { x: 4, y: 1 }, sightline));
    assert.ok(!isWithinAttackRange(pike, { x: 2, y: 1 }, { x: 2, y: 3 }, sightline), 'the wall at 2,2 blocks the thrust');
  });
});

describe('two-handed weapons', () => {
  test('wielding a two-handed weapon returns the secondary item to the inventory', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'marksman-carbine', 1);
    const result = equipFromInventory({ inventory, equipment: { primary: 'stun-baton', secondary: 'research-datapad' } }, 0, items, veteran);
    assert.ok(result.ok);
    assert.equal(result.value.equipment.primary, 'marksman-carbine');
    assert.equal(result.value.equipment.secondary, undefined);
    const held = result.value.inventory.flatMap((slot) => (slot ? [slot.itemId] : []));
    assert.deepEqual(held.sort(), ['research-datapad', 'stun-baton']);
  });

  test('taking up a secondary item lowers a two-handed weapon', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'research-datapad', 1);
    const result = equipFromInventory({ inventory, equipment: { primary: 'shock-maul' } }, 0, items, veteran);
    assert.ok(result.ok);
    assert.equal(result.value.equipment.secondary, 'research-datapad');
    assert.equal(result.value.equipment.primary, undefined);
    assert.equal(result.value.inventory[0]?.itemId, 'shock-maul');
  });

  test('a one-handed weapon leaves the secondary hand alone', () => {
    const { inventory } = addItem(createEmptyInventory(), items, 'breaching-machete', 1);
    const result = equipFromInventory({ inventory, equipment: { secondary: 'research-datapad' } }, 0, items, veteran);
    assert.ok(result.ok);
    assert.equal(result.value.equipment.primary, 'breaching-machete');
    assert.equal(result.value.equipment.secondary, 'research-datapad');
  });

  test('refuses the swap when both displaced items will not fit', () => {
    const packed = addItem(createEmptyInventory(), items, 'intake-jumpsuit', INVENTORY_CAPACITY - 1).inventory;
    const { inventory } = addItem(packed, items, 'riot-pike', 1);
    const slotIndex = inventory.findIndex((slot) => slot?.itemId === 'riot-pike');
    const result = equipFromInventory({ inventory, equipment: { primary: 'stun-baton', secondary: 'research-datapad' } }, slotIndex, items, veteran);
    assert.equal(result.ok, false);
  });
});
