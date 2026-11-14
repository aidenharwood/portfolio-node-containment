import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, tierForLevel, type ItemDefinition } from '../src/index.ts';
import { gatheringSourcesOf } from '../src/content/craftingIntegrity.ts';
import { MATERIAL_LADDER } from '../src/content/ward/items.ts';

const statTotal = (item: ItemDefinition | undefined): number => Object.values(item?.equipment?.stats ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);

test('creatures never outrank the tier of the ground they live on', () => {
  for (const district of GAME_CONTENT.districts.values()) {
    for (const placement of district.creatures ?? []) {
      const creature = GAME_CONTENT.creatures.get(placement.creatureId);
      assert.ok(creature);
      assert.ok(tierForLevel(creature.level) <= district.tier, `${creature.id} (level ${creature.level}) is too strong for ${district.id} (tier ${district.tier})`);
    }
  }
});

test('every weapon and armour piece gets stronger at each rung of the material ladder', () => {
  const kinds = ['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator'];
  for (let rung = 1; rung < MATERIAL_LADDER.length; rung++) {
    const lower = MATERIAL_LADDER[rung - 1]!;
    const upper = MATERIAL_LADDER[rung]!;
    assert.ok(upper.level > lower.level);
    for (const kind of kinds) {
      assert.ok(statTotal(GAME_CONTENT.items.get(`${upper.key}-${kind}`)) > statTotal(GAME_CONTENT.items.get(`${lower.key}-${kind}`)), `${upper.key}-${kind} beats ${lower.key}-${kind}`);
    }
    for (const noun of ['helm', 'plate', 'gauntlets', 'greaves', 'boots']) {
      const upperId = `${upper.key}-${noun}`;
      const lowerId = `${lower.key}-${noun}`;
      assert.ok(statTotal(GAME_CONTENT.items.get(upperId)) > statTotal(GAME_CONTENT.items.get(lowerId)), `${upperId} beats ${lowerId}`);
    }
  }
});

test('gathering pays more experience the higher the spot', () => {
  const bySkill = new Map<string, { level: number; experience: number }[]>();
  for (const object of GAME_CONTENT.worldObjects.values()) {
    for (const source of gatheringSourcesOf(GAME_CONTENT, object.id)) {
      bySkill.set(source.skill, [...(bySkill.get(source.skill) ?? []), { level: source.level, experience: source.experience }]);
    }
  }
  for (const [skill, sources] of bySkill) {
    const sorted = [...sources].sort((a, b) => a.level - b.level);
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1]!;
      const current = sorted[index]!;
      if (current.level > previous.level) assert.ok(current.experience > previous.experience, `${skill} level ${current.level} pays more than level ${previous.level}`);
    }
  }
});

test('higher medicine heals more', () => {
  const healing = [...GAME_CONTENT.recipes.values()]
    .map((recipe) => ({ level: recipe.level, heal: GAME_CONTENT.items.get(recipe.output.itemId)?.consumable?.heal }))
    .filter((entry): entry is { level: number; heal: number } => entry.heal !== undefined)
    .sort((a, b) => a.level - b.level);
  for (let index = 1; index < healing.length; index++) assert.ok(healing[index]!.heal >= healing[index - 1]!.heal, `level ${healing[index]!.level} heals at least as much as level ${healing[index - 1]!.level}`);
});

test('creatures give more experience the stronger they are', () => {
  const creatures = [...GAME_CONTENT.creatures.values()].sort((a, b) => a.level - b.level);
  for (let index = 1; index < creatures.length; index++) {
    const previous = creatures[index - 1]!;
    const current = creatures[index]!;
    if (current.level > previous.level) assert.ok(current.experience > previous.experience, `${current.id} rewards more than ${previous.id}`);
  }
});

test('the Ward offers enough quest points to reach The Heart', () => {
  const heart = GAME_CONTENT.quests.get('the-heart');
  assert.ok(heart);
  const available = [...GAME_CONTENT.quests.values()].filter((quest) => quest.id !== 'the-heart').reduce((sum, quest) => sum + (quest.questPoints ?? (quest.category === 'tutorial' ? 0 : 1)), 0);
  assert.ok(available >= 12, `${available} quest points are on offer before The Heart`);
});
