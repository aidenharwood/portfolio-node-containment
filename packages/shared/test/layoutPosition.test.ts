import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { drawBlueprint, exit, link, room } from '../src/world/blueprint.ts';
import { resolvePosition } from '../src/world/layoutPosition.ts';
import { DISTRICT_LAYOUT_SCHEMA } from '../src/world/layoutSchema.ts';

const plan = drawBlueprint({ width: 22, height: 10 }, [
  room('a', 1, 1, 8, 6, 'plating'),
  room('b', 11, 1, 8, 6, 'plating'),
  link('a', 'b', 2),
  exit('west', 'a', 'west', 3),
]);

describe('layout positions', () => {
  test('a room position is an offset from the room corner', () => {
    assert.deepEqual(resolvePosition(plan, { room: 'b', dx: 2, dy: 3 }, 'objects[0].at'), { x: 13, y: 4 });
  });

  test('an exit position is one of the exit tiles', () => {
    assert.deepEqual(resolvePosition(plan, { exit: 'west', index: 1 }, 'objects[0].at'), plan.exits.west?.tiles[1]);
  });

  test('a link position is one of the link tiles', () => {
    assert.deepEqual(resolvePosition(plan, { link: ['a', 'b'], index: 1 }, 'objects[0].at'), plan.linkTile('a', 'b', 1));
  });

  test('an absolute position is itself', () => {
    assert.deepEqual(resolvePosition(plan, { x: 20, y: 9 }, 'objects[0].at'), { x: 20, y: 9 });
  });

  test('an unknown room names the path and the room', () => {
    assert.throws(() => resolvePosition(plan, { room: 'plazza', dx: 0, dy: 0 }, 'objects[3].at'), (error: Error) => error.message.includes('objects[3].at') && error.message.includes('"plazza"'));
  });

  test('an offset past the room edge is outside the room', () => {
    assert.throws(() => resolvePosition(plan, { room: 'a', dx: 8, dy: 0 }, 'npcs[0].at'), (error: Error) => error.message.includes('npcs[0].at') && error.message.includes('outside room'));
  });

  test('an unknown exit or an exit index past its tiles names the path', () => {
    assert.throws(() => resolvePosition(plan, { exit: 'east', index: 0 }, 'anchors.gate'), /anchors\.gate/);
    assert.throws(() => resolvePosition(plan, { exit: 'west', index: 9 }, 'anchors.gate'), /anchors\.gate/);
  });

  test('a link index past its tiles names the path', () => {
    assert.throws(() => resolvePosition(plan, { link: ['a', 'b'], index: 9 }, 'lights[2].at'), /lights\[2\]\.at/);
  });
});

describe('layout schema', () => {
  test('rejects an unknown key and reports where it is', () => {
    const result = DISTRICT_LAYOUT_SCHEMA.safeParse({
      id: 'sample',
      name: 'Sample',
      subtitle: '',
      tier: 1,
      region: 'r',
      ambience: { darkness: 0, tint: '#000000', fog: '#000000' },
      size: { width: 4, height: 4 },
      steps: [],
      tiles: [],
      areas: [],
      anchors: {},
      objects: [{ id: 'o', object: 'planter', at: { x: 1, y: 1 }, colour: 'red' }],
      assemblies: [],
      npcs: [],
      creatures: [],
      lights: [],
      decals: [],
      setPieces: [],
      dressing: {},
      furnish: {},
    });
    assert.equal(result.success, false);
    assert.ok(!result.success && result.error.issues.some((issue) => issue.path.join('.') === 'objects.0' && issue.message.includes('colour')), JSON.stringify(!result.success && result.error.issues));
  });
});
