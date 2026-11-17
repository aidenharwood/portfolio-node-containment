import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Vector3 } from 'three';
import type { AttackMotion, CharacterAppearance } from '@containment/shared';
import { CharacterRig } from '../src/render/models/characterModel.ts';
import { ATTACK_CONTACT } from '../src/state/attackTiming.ts';

const APPEARANCE = { physique: 'male', bodyType: 'average', height: 1, skinTone: '#c48a62', hairStyle: 'crop', hairColor: '#3b2618', eyeColor: '#3d6e9c', faceMark: 'none', augment: 'none' } as CharacterAppearance;
const MOTIONS: readonly AttackMotion[] = ['jab', 'stab', 'strike', 'slash', 'slam', 'lunge', 'snapShot', 'shoulderShot', 'heavyShot', 'blast', 'channel', 'invoke'];
const VOXEL = 0.05;

const lowestFoot = (rig: CharacterRig): number => {
  rig.root.updateMatrixWorld(true);
  const left = new Box3().setFromObject(rig.part('legLeft')!, true);
  const right = new Box3().setFromObject(rig.part('legRight')!, true);
  return Math.min(left.min.y, right.min.y);
};

test('a planted foot stays on the ground through every attack motion', () => {
  const rig = new CharacterRig(APPEARANCE, []);
  for (const motion of MOTIONS) {
    for (let progress = 0; progress <= 1.0001; progress += 0.05) {
      rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: progress, attackMotion: motion });
      const foot = lowestFoot(rig);
      assert.ok(Math.abs(foot) <= VOXEL, `${motion} at ${progress.toFixed(2)}: lowest foot at ${foot.toFixed(3)}`);
    }
  }
});

test('a walking operative keeps one foot on the ground', () => {
  const rig = new CharacterRig(APPEARANCE, []);
  for (let phase = 0; phase <= Math.PI * 2; phase += 0.1) {
    rig.animate({ moving: true, walkPhase: phase, time: 0 });
    const foot = lowestFoot(rig);
    assert.ok(Math.abs(foot) <= VOXEL / 2, `phase ${phase.toFixed(1)}: lowest foot at ${foot.toFixed(3)}`);
  }
});

test('the torso stays seated on the hips through every attack motion', () => {
  const rig = new CharacterRig(APPEARANCE, []);
  for (const motion of MOTIONS) {
    for (let progress = 0; progress <= 1.0001; progress += 0.05) {
      rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: progress, attackMotion: motion });
      rig.root.updateMatrixWorld(true);
      const torso = new Box3().setFromObject(rig.part('torso')!, true);
      const legs = new Box3().setFromObject(rig.part('legLeft')!, true).union(new Box3().setFromObject(rig.part('legRight')!, true));
      assert.ok(torso.min.y <= legs.max.y + VOXEL, `${motion} at ${progress.toFixed(2)}: torso floats ${(torso.min.y - legs.max.y).toFixed(3)} above the legs`);
      const gap = Math.max(0, torso.min.z - legs.max.z, legs.min.z - torso.max.z);
      assert.ok(gap <= VOXEL, `${motion} at ${progress.toFixed(2)}: torso slid ${gap.toFixed(3)} off the legs`);
    }
  }
});

const ARMED: readonly [AttackMotion, string][] = [['strike', 'iron-baton'], ['slash', 'iron-blade'], ['slam', 'iron-maul'], ['snapShot', 'iron-pistol'], ['shoulderShot', 'iron-carbine'], ['heavyShot', 'iron-rifle']];

const posed = (gear: string, motion: AttackMotion, progress: number | null): CharacterRig => {
  const rig = new CharacterRig(APPEARANCE, [gear]);
  rig.root.rotation.y = 0;
  rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: progress, attackMotion: motion });
  return rig;
};

const tipAndGrip = (rig: CharacterRig): { tip: Vector3; grip: Vector3 } => {
  const tip = new Vector3();
  const grip = new Vector3();
  assert.ok(rig.muzzle(tip) && rig.grip(grip));
  return { tip, grip };
};

test('melee weapons meet the target forward and downward at contact', () => {
  for (const [motion, gear] of ARMED.slice(0, 3)) {
    const { tip, grip } = tipAndGrip(posed(gear, motion, ATTACK_CONTACT[motion]));
    const reach = tip.clone().sub(grip);
    if (motion === 'slash') assert.ok(reach.z > 0.6 * reach.length(), `${motion} sweeps forward (${reach.z.toFixed(3)} of ${reach.length().toFixed(3)})`);
    else assert.ok(reach.y < 0 && reach.z > 0, `${motion} comes down in front (dy ${reach.y.toFixed(3)}, dz ${reach.z.toFixed(3)})`);
  }
});

test('guns are level when they fire', () => {
  for (const [motion, gear] of ARMED.slice(3)) {
    const { tip, grip } = tipAndGrip(posed(gear, motion, ATTACK_CONTACT[motion]));
    const reach = tip.clone().sub(grip);
    const pitch = Math.atan2(reach.y, Math.hypot(reach.x, reach.z));
    assert.ok(Math.abs(pitch) <= 0.12, `${motion} fires at a pitch of ${pitch.toFixed(3)}`);
  }
});

const distanceToSegment = (point: Vector3, a: Vector3, b: Vector3): number => {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, point.clone().sub(a).dot(ab) / ab.lengthSq()));
  return point.distanceTo(a.clone().addScaledVector(ab, t));
};

test('the left hand rests on the barrel of a two-handed gun', () => {
  for (const [motion, gear] of ARMED.slice(4)) {
    for (const progress of [null, ATTACK_CONTACT[motion]]) {
      const rig = posed(gear, motion, progress);
      const { tip, grip } = tipAndGrip(rig);
      const hand = new Vector3();
      assert.ok(rig.hand('left', hand));
      const gap = distanceToSegment(hand, grip, tip);
      assert.ok(gap <= 1.5 * VOXEL, `${gear} ${progress === null ? 'at rest' : 'firing'}: left hand is ${(gap / VOXEL).toFixed(1)} voxels off the barrel`);
    }
  }
});

test('gathering puts a gun away and keeps a melee tool in hand', () => {
  const rifle = new CharacterRig(APPEARANCE, ['iron-rifle']);
  rifle.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: 0.45, attackMotion: 'work' });
  assert.equal(rifle.weaponShown, false);
  rifle.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null });
  assert.equal(rifle.weaponShown, true);
  const baton = new CharacterRig(APPEARANCE, ['iron-baton']);
  baton.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: 0.45, attackMotion: 'work' });
  assert.equal(baton.weaponShown, true);
});
