import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawBlueprint, exit, link, room, type BlueprintStep } from '../src/world/blueprint.ts';
import { MAP_LEGEND } from '../src/world/tiles.ts';

const size = { width: 22, height: 10 };
const steps: BlueprintStep[] = [room('a', 1, 1, 8, 6, 'plating'), room('b', 11, 1, 8, 6, 'plating'), link('a', 'b', 2), exit('west', 'a', 'west', 3)];

const tileAt = (map: readonly string[], x: number, y: number) => MAP_LEGEND[map[y]?.[x] ?? ' '];

test('painted tiles land on floor and on walls after the steps are drawn', () => {
  const plain = drawBlueprint(size, steps);
  assert.equal(tileAt(plain.map, 3, 3), 'plating');
  assert.equal(tileAt(plain.map, 1, 0), 'wall');
  const painted = drawBlueprint(size, steps, [{ x: 3, y: 3, tile: 'hazard' }, { x: 1, y: 0, tile: 'plating' }]);
  assert.equal(tileAt(painted.map, 3, 3), 'hazard');
  assert.equal(tileAt(painted.map, 1, 0), 'plating');
});

test('placements see painted tiles', () => {
  const painted = drawBlueprint(size, steps, [{ x: 3, y: 3, tile: 'void' }]);
  assert.throws(() => painted.at('a', 2, 2), /not floor/);
});

test('painting leaves rooms, exits and links as drawn', () => {
  const plain = drawBlueprint(size, steps);
  const painted = drawBlueprint(size, steps, [{ x: 9, y: 3, tile: 'wall' }, { x: 0, y: 3, tile: 'wall' }]);
  assert.deepEqual(painted.rooms, plain.rooms);
  assert.deepEqual(painted.exits, plain.exits);
  assert.deepEqual(painted.links, plain.links);
});

test('a blueprint remembers its size and steps', () => {
  const plan = drawBlueprint(size, steps);
  assert.deepEqual(plan.size, size);
  assert.deepEqual(plan.steps, steps);
});
