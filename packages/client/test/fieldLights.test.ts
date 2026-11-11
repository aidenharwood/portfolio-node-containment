import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, Vector3 } from 'three';
import { buildFieldLightGrid, FIELD_LIGHTS_PER_CELL, fieldLightsAt, LIGHT_CONE_ANGLE, type FieldLight } from '../src/render/voxel/fieldLights.ts';

const random = (() => {
  let state = 7;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
})();

const reaches = (light: FieldLight, point: Vector3): boolean => {
  const toLight = light.position.clone().sub(point);
  const distance = toLight.length();
  return distance < light.reach && toLight.normalize().y > Math.cos(LIGHT_CONE_ANGLE);
};

test('the light grid lists every field light that can reach a point', () => {
  const centre = new Vector3(200, 0, 140);
  const lights: FieldLight[] = Array.from({ length: 96 }, () => ({
    position: new Vector3(centre.x + (random() - 0.5) * 80, 1 + random() * 3, centre.z + (random() - 0.5) * 80),
    color: new Color(1, 1, 1),
    reach: 6 + random() * 6,
  }));
  buildFieldLightGrid(lights, centre);
  let checked = 0;
  for (let sample = 0; sample < 20000; sample++) {
    const point = new Vector3(centre.x + (random() - 0.5) * 100, random() * 2.5, centre.z + (random() - 0.5) * 100);
    const listed = fieldLightsAt(point.x, point.z);
    if (listed.length === FIELD_LIGHTS_PER_CELL) continue;
    lights.forEach((light, index) => {
      if (!reaches(light, point)) return;
      checked++;
      assert.ok(listed.includes(index), `light ${index} reaches ${point.toArray()} but is missing from its cell`);
    });
  }
  assert.ok(checked > 1000);
});

test('a cell lists only lights whose footprint touches it', () => {
  const centre = new Vector3(0, 0, 0);
  const light: FieldLight = { position: new Vector3(10, 3, 10), color: new Color(1, 1, 1), reach: 9 };
  buildFieldLightGrid([light], centre);
  assert.deepEqual(fieldLightsAt(10, 10), [0]);
  assert.deepEqual(fieldLightsAt(25, 10), []);
  assert.deepEqual(fieldLightsAt(-20, -20), []);
});
