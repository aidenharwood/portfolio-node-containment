import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MathUtils, Vector3 } from 'three';
import { CAMERA_LIMITS, CameraRig, clearedEyeHeight, nearPlaneFor, type GroundProbe } from '../src/render/cameraRig.ts';

const settle = (rig: CameraRig, ground?: GroundProbe): void => {
  for (let frame = 0; frame < 240; frame++) rig.update(1 / 30, ground);
};

const pitchOf = (rig: CameraRig): number => {
  const offset = rig.camera.position.clone().sub(rig.focusPoint);
  return Math.asin(offset.y / offset.length());
};

test('the camera can tilt down to a low ten degrees and pull back to thirty tiles, no further', () => {
  const rig = new CameraRig();
  rig.follow(new Vector3(10, 1, 10));
  rig.orbit(0, -3);
  rig.zoom(100);
  settle(rig);
  assert.ok(Math.abs(MathUtils.radToDeg(pitchOf(rig)) - 10) < 0.05);
  assert.ok(Math.abs(rig.camera.position.distanceTo(rig.focusPoint) - 30) < 0.01);
  rig.orbit(0, 5);
  rig.zoom(0.001);
  settle(rig);
  assert.ok(Math.abs(MathUtils.radToDeg(pitchOf(rig)) - 82) < 0.05);
  assert.ok(Math.abs(rig.camera.position.distanceTo(rig.focusPoint) - CAMERA_LIMITS.distance.minimum) < 0.01);
});

test('the eye rises over ground that climbs toward it instead of sinking into the slope', () => {
  const focus = new Vector3(0, 0.8, 0);
  const ramp: GroundProbe = (_x, z) => Math.max(0, z * 0.6);
  assert.equal(clearedEyeHeight(focus, new Vector3(0, 40, 30), () => 0), 40);
  const eye = new Vector3(0, 5, 30);
  const height = clearedEyeHeight(focus, eye, ramp);
  assert.ok(height >= ramp(0, 30) + CAMERA_LIMITS.clearance - 1e-9);
  assert.ok((height + focus.y) / 2 >= ramp(0, 15) + CAMERA_LIMITS.clearance - 1e-9);

  const rig = new CameraRig();
  rig.follow(focus);
  rig.orbit(-Math.PI / 4, -3);
  rig.zoom(100);
  settle(rig, ramp);
  const { x, y, z } = rig.camera.position;
  assert.ok(y >= ramp(x, z) + CAMERA_LIMITS.clearance - 1e-6);
  assert.ok((y + focus.y) / 2 >= ramp(x / 2, z / 2) + CAMERA_LIMITS.clearance - 1e-6);
  settle(rig, () => 0);
  assert.ok(Math.abs(MathUtils.radToDeg(pitchOf(rig)) - 10) < 0.1);
});

test('the near plane follows the zoom for depth precision and the far plane the view distance', () => {
  assert.equal(nearPlaneFor(3.5), 0.3);
  assert.ok(nearPlaneFor(30) > nearPlaneFor(11));
  assert.ok(nearPlaneFor(30) <= 0.9);
  const rig = new CameraRig();
  rig.follow(new Vector3());
  rig.zoom(100);
  settle(rig);
  assert.ok(Math.abs(rig.camera.near - nearPlaneFor(30)) < 0.01);
  rig.setFar(1300);
  assert.equal(rig.camera.far, 1300);
});
