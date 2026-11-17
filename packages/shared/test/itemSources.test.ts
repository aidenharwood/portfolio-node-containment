import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, ITEM_SOURCE_KINDS, itemSources, salvageGuide, type GameContent } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const kindsOf = (content: GameContent, itemId: string) => (itemSources(content).get(itemId) ?? []).map((source) => source.kind);

describe('item sources', () => {
  test('every creature loot entry is listed as a drop', () => {
    const sources = itemSources(FIXTURE_CONTENT);
    for (const creature of FIXTURE_CONTENT.creatures.values()) {
      for (const entry of creature.loot) {
        const drop = sources.get(entry.itemId)?.find((source) => source.kind === 'drop' && source.creatureId === creature.id);
        assert.ok(drop, `${creature.id} drop of ${entry.itemId}`);
        assert.equal(drop.kind === 'drop' && drop.chance, entry.chance);
      }
    }
  });

  test('every recipe output and shop listing is a source', () => {
    for (const recipe of FIXTURE_CONTENT.recipes.values()) assert.ok(kindsOf(FIXTURE_CONTENT, recipe.output.itemId).includes('recipe'), recipe.id);
    for (const shop of FIXTURE_CONTENT.shops.values()) {
      for (const listing of shop.listings) assert.ok(kindsOf(FIXTURE_CONTENT, listing.itemId).includes('shop'), `${shop.id} ${listing.itemId}`);
    }
  });

  test('gathering sources share the salvage guide locations', () => {
    const sources = itemSources(FIXTURE_CONTENT);
    for (const entry of salvageGuide(FIXTURE_CONTENT)) {
      const gather = sources.get(entry.itemId)?.find((source) => source.kind === 'gather' && source.objectId === entry.objectId);
      assert.ok(gather && gather.kind === 'gather', entry.objectId);
      assert.deepEqual(gather.locations, entry.locations);
    }
  });

  test('sources are grouped in display order', () => {
    for (const list of itemSources(FIXTURE_CONTENT).values()) {
      const order = list.map((source) => ITEM_SOURCE_KINDS.indexOf(source.kind));
      assert.deepEqual(order, [...order].sort((a, b) => a - b));
    }
  });

  test('every item in the game has at least one source', () => {
    const sources = itemSources(GAME_CONTENT);
    assert.deepEqual([...GAME_CONTENT.items.keys()].filter((itemId) => (sources.get(itemId) ?? []).length === 0), []);
  });

  test('quest step rewards and quest-only grants are captured', () => {
    const sources = itemSources(GAME_CONTENT);
    const stepGrant = [...GAME_CONTENT.quests.values()].flatMap((quest) =>
      quest.steps.flatMap((step) => (step.onComplete ?? []).flatMap((effect) => (effect.type === 'giveItem' ? [{ questId: quest.id, itemId: effect.itemId }] : []))))[0];
    if (stepGrant) assert.ok(sources.get(stepGrant.itemId)?.some((source) => source.kind === 'quest' && source.questId === stepGrant.questId));
    const gated = [...GAME_CONTENT.worldObjects.values()].flatMap((object) =>
      object.interactions.filter((interaction) => interaction.conditions?.some((condition) => condition.type === 'questActive')).flatMap((interaction) =>
        interaction.effects.flatMap((effect) => (effect.type === 'giveItem' ? [{ objectId: object.id, itemId: effect.itemId }] : []))))[0];
    if (gated) assert.ok(sources.get(gated.itemId)?.some((source) => source.kind === 'object' && source.objectId === gated.objectId && source.onlyDuring !== null));
  });
});
