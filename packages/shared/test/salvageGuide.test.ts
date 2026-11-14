import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { salvageGuide, type WorldObjectDefinition } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const salvageIds = [...FIXTURE_CONTENT.worldObjects.values()]
  .filter((definition) => definition.interactions.some((interaction) => interaction.gather?.skill === 'salvage'))
  .map((definition) => definition.id);

const placementCount = (objectId: string): number =>
  [...FIXTURE_CONTENT.levels.values()].reduce((sum, level) => sum + level.objects.filter((placement) => placement.objectId === objectId).length, 0);

describe('salvage guide', () => {
  test('lists every salvage node exactly once', () => {
    const entries = salvageGuide(FIXTURE_CONTENT);
    assert.equal(entries.length, salvageIds.length);
    assert.deepEqual(new Set(entries.map((entry) => entry.objectId)), new Set(salvageIds));
  });

  test('orders entries by level then name', () => {
    const entries = salvageGuide(FIXTURE_CONTENT);
    entries.slice(1).forEach((entry, index) => {
      const previous = entries[index];
      assert.ok(previous && (previous.level < entry.level || (previous.level === entry.level && previous.name <= entry.name)));
    });
    assert.equal(entries[0]?.level, 1);
    const deep = entries.find((entry) => entry.objectId === 'deep-scrap-heap');
    assert.equal(deep?.level, 3);
    assert.equal(deep?.itemId, 'scrap-alloy');
    assert.equal(deep?.experience, 16);
  });

  test('location counts add up to the placements', () => {
    for (const entry of salvageGuide(FIXTURE_CONTENT)) {
      const total = entry.locations.reduce((sum, location) => sum + location.count, 0);
      assert.equal(total, placementCount(entry.objectId), entry.objectId);
    }
  });

  test('keeps nodes with no placements', () => {
    const extra: WorldObjectDefinition = {
      id: 'test-node',
      name: 'Test Node',
      examine: '',
      model: 'placeholder',
      blocksMovement: true,
      interactions: [{ verb: 'Salvage', effects: [], gather: { skill: 'salvage', level: 2, itemId: 'scrap-alloy', experience: 1, attemptTicks: 3, charges: 1, respawnTicks: 10, progressVerb: 'Salvaging' } }],
    };
    const worldObjects = new Map(FIXTURE_CONTENT.worldObjects);
    worldObjects.set(extra.id, extra);
    const entry = salvageGuide({ ...FIXTURE_CONTENT, worldObjects }).find((candidate) => candidate.objectId === 'test-node');
    assert.deepEqual(entry?.locations, []);
  });
});
