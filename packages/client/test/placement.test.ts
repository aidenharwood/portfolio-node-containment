import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { WorldObjectDefinition } from '@containment/shared';
import { objectModelOrigin } from '../src/render/world/chunkView.ts';
import { clampToViewport } from '../src/ui/placement.ts';

const viewport = { width: 400, height: 300 };
const box = { width: 180, height: 120 };

test('a box that already fits stays where it was asked to go', () => {
  assert.deepEqual(clampToViewport({ x: 100, y: 90 }, box, viewport), { x: 100, y: 90 });
});

test('a box is pulled back from every edge of the viewport', () => {
  assert.deepEqual(clampToViewport({ x: -60, y: -40 }, box, viewport), { x: 8, y: 8 });
  assert.deepEqual(clampToViewport({ x: 390, y: 290 }, box, viewport), { x: 212, y: 172 });
});

test('a box larger than the viewport keeps its top left corner on screen', () => {
  assert.deepEqual(clampToViewport({ x: 200, y: 200 }, { width: 500, height: 400 }, viewport), { x: 8, y: 8 });
});

const plinth: WorldObjectDefinition = {
  id: 'test-plinth',
  name: 'Test plinth',
  examine: '',
  model: 'crate',
  blocksMovement: true,
  footprint: { width: 3, height: 2 },
  interactions: [],
};

test('a wide object is centred over its footprint', () => {
  assert.deepEqual(objectModelOrigin({ instanceId: 'a', objectId: plinth.id, position: { x: 4, y: 4 }, facing: 'south' }, plinth), { x: 5, z: 4.5 });
  assert.deepEqual(objectModelOrigin({ instanceId: 'a', objectId: plinth.id, position: { x: 4, y: 4 }, facing: 'east' }, plinth), { x: 4.5, z: 5 });
});

test('a one tile object stays on its own tile', () => {
  const crate = { ...plinth, footprint: undefined };
  assert.deepEqual(objectModelOrigin({ instanceId: 'a', objectId: plinth.id, position: { x: 4, y: 4 } }, crate), { x: 4, z: 4 });
});
