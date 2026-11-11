import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { assignLights, shadowStrength } from '../src/render/lightAssignment.ts';

const SPACING = 4;
const limits = { shadowed: 4, field: 96 };

const fixtures = Array.from({ length: 81 }, (_, index) => ({
  position: new Vector3((index % 9) * SPACING, 2.9, Math.floor(index / 9) * SPACING),
  shadow: true,
}));

const distanceTo = (focus: Vector3) => (light: { position: Vector3 }) => light.position.distanceTo(focus);

test('the nearest shadow-casting lights take the shadow pool and the rest become field lights', () => {
  const focus = new Vector3(17, 0.8, 17);
  const { shadowed, field } = assignLights(fixtures, focus, limits);
  assert.equal(shadowed.length, 4);
  assert.equal(field.length, fixtures.length - 4);
  const farthestShadowed = Math.max(...shadowed.map(distanceTo(focus)));
  assert.ok(field.every((light) => distanceTo(focus)(light) >= farthestShadowed));
});

test('lights that never cast shadows stay out of the shadow pool however close they are', () => {
  const focus = new Vector3(16, 0.8, 16);
  const lamp = { position: new Vector3(16, 1, 16), shadow: false };
  const { shadowed, field } = assignLights([lamp, ...fixtures], focus, limits);
  assert.ok(!shadowed.includes(lamp));
  assert.ok(field.includes(lamp));
});

test('a light swaps in or out of the shadow pool only while its shadow is invisible', () => {
  let previous = assignLights(fixtures, new Vector3(12, 0.8, 14), limits);
  let swaps = 0;
  for (let step = 1; step <= 400; step++) {
    const focus = new Vector3(12 + step * 0.03, 0.8, 14 + step * 0.021);
    const next = assignLights(fixtures, focus, limits);
    const strength = (light: { position: Vector3 }) => shadowStrength(distanceTo(focus)(light), next.shadowEdge);
    const changed = [
      ...next.shadowed.filter((light) => !previous.shadowed.includes(light)),
      ...previous.shadowed.filter((light) => !next.shadowed.includes(light)),
    ];
    swaps += changed.length;
    for (const light of changed) assert.ok(strength(light) < 0.05, `step ${step} swapped a light at strength ${strength(light)}`);
    previous = next;
  }
  assert.ok(swaps > 0);
});

test('the light overhead keeps its full shadow', () => {
  const focus = new Vector3(16.5, 0.8, 16.5);
  const { shadowed, shadowEdge } = assignLights(fixtures, focus, limits);
  assert.equal(shadowStrength(distanceTo(focus)(shadowed[0]!), shadowEdge), 1);
});

test('a zone with no more shadow lights than the pool holds shadows them all fully', () => {
  const focus = new Vector3(0, 0.8, 0);
  const { shadowed, shadowEdge } = assignLights(fixtures.slice(0, 3), focus, limits);
  assert.equal(shadowed.length, 3);
  assert.ok(shadowed.every((light) => shadowStrength(distanceTo(focus)(light), shadowEdge) === 1));
});
