import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findFootprintIssues, type GameContent } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

describe('footprint integrity', () => {
  test('the shipped world has no footprint issues', () => {
    assert.deepEqual(findFootprintIssues(FIXTURE_CONTENT), []);
  });

  test('a 2×2 creature placed against a wall is reported', () => {
    const level = FIXTURE_CONTENT.levels.get('fx-floor')!;
    const grid = (point: { x: number; y: number }) => level.layout.tileAt(point);
    const placement = level.creatures.find((creature) => FIXTURE_CONTENT.creatures.get(creature.creatureId)?.size !== 2)!;
    let wedged = placement.position;
    while (grid({ x: wedged.x + 1, y: wedged.y }) !== 'wall' && wedged.x < placement.position.x + 80) wedged = { x: wedged.x + 1, y: wedged.y };
    const creatures = new Map(FIXTURE_CONTENT.creatures);
    creatures.set(placement.creatureId, { ...FIXTURE_CONTENT.creatures.get(placement.creatureId)!, size: 2 });
    const levels = new Map(FIXTURE_CONTENT.levels);
    levels.set(level.id, { ...level, creatures: level.creatures.map((creature) => (creature === placement ? { ...creature, position: wedged } : creature)) });
    const issues = findFootprintIssues({ ...FIXTURE_CONTENT, creatures, levels } as GameContent);
    assert.ok(issues.some((issue) => issue.includes(`"${placement.instanceId}" footprint does not fit;`)), issues.join('\n'));
  });
});
