import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { assignLights } from '../src/render/lightAssignment.ts';

const SPACING = 4;

const lamps = Array.from({ length: 81 }, (_, index) => ({
  position: new Vector3((index % 9) * SPACING, 1.5, Math.floor(index / 9) * SPACING),
}));

const distanceTo = (focus: Vector3) => (light: { position: Vector3 }) => light.position.distanceTo(focus);

test('the nearest lights fill the limit and the edge sits at the farthest one kept', () => {
  const focus = new Vector3(17, 0.8, 17);
  const { lights, edge } = assignLights(lamps, focus, 20);
  assert.equal(lights.length, 20);
  const farthestKept = Math.max(...lights.map(distanceTo(focus)));
  assert.equal(edge, farthestKept);
  assert.ok(lamps.filter((lamp) => !lights.includes(lamp)).every((lamp) => distanceTo(focus)(lamp) >= farthestKept));
});

test('a zone with fewer lights than the limit keeps them all with no fade edge', () => {
  const { lights, edge } = assignLights(lamps.slice(0, 5), new Vector3(0, 0.8, 0), 96);
  assert.equal(lights.length, 5);
  assert.equal(edge, Infinity);
});
