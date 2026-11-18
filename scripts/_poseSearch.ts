import { Vector3 } from 'three';
import { CharacterRig } from '../packages/client/src/render/models/characterModel.ts';
import * as poses from '../packages/client/src/render/models/weaponPoses.ts';
const A = { physique: 'male', bodyType: 'average', height: 1, skinTone: '#c48a62', hairStyle: 'crop', hairColor: '#3b2618', eyeColor: '#3d6e9c', faceMark: 'none', augment: 'none' } as never;
const mode = process.argv[2];
const v = new Vector3(), g = new Vector3(), h = new Vector3();
const seg = (p: Vector3, a: Vector3, b: Vector3) => { const ab = b.clone().sub(a); const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
if (mode === 'slash') {
  let best: any = null;
  const rig = new CharacterRig(A, ['iron-blade' as never]);
  const orig = poses.gripFor;
  for (const rightX of [-1.6, -1.3, -1.0, -0.7, -0.4]) for (const weaponX of [0.6, 1.0, 1.4, 1.8, 2.2]) for (const rightZ of [-0.85, -0.5, -0.2]) for (const twist of [-0.6, -0.3, 0]) {
    const pose = { ...poses.REST_POSE, ...poses.gripFor('blade' as never) };
    const p = { ...pose, rightX: pose.rightX + rightX, weaponX: pose.weaponX + weaponX, rightZ: pose.rightZ + rightZ, twist: pose.twist + twist, lean: 0.12 };
    (rig as any).animateAction = null;
    rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null });
    const parts = (rig as any).parts; (rig as any).upper.rotation.set(p.lean, p.twist, 0);
    parts.get('armRight').rotation.set(p.rightX, 0, p.rightZ);
    (rig as any).orientWeapon((rig as any).weapon, parts.get('armRight'), p.weaponX, p.aim, p.level);
    rig.muzzle(v); rig.grip(g);
    const r = v.clone().sub(g); const pitch = Math.atan2(r.y, Math.hypot(r.x, r.z));
    const score = r.z / r.length() - Math.abs(pitch) * 0.5;
    if (!best || score > best.score) best = { score, rightX, weaponX, rightZ, twist, z: (r.z / r.length()).toFixed(2), pitch: pitch.toFixed(2) };
  }
  console.log(best);
}
if (mode === 'hand') {
  for (const kind of ['carbine', 'rifle']) {
    let best: any = null;
    for (const leftX of [-1.6, -1.4, -1.2, -1.0, -0.8, -0.6]) for (const leftZ of [0.2, 0.4, 0.6, 0.8, 1.0, 1.2]) {
      const rig = new CharacterRig(A, [`iron-${kind}` as never]);
      const grip = poses.gripFor(kind as never);
      const parts = (rig as any).parts;
      rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null });
      parts.get('armLeft').rotation.set(leftX, 0, -0.05 + leftZ);
      rig.muzzle(v); rig.grip(g); rig.hand('left', h);
      const d = seg(h, g, v) / 0.05;
      if (!best || d < best.d) best = { d: d.toFixed(2), leftX, leftZ, base: [grip.leftX, grip.leftZ] };
    }
    console.log(kind, best);
  }
}
if (mode === 'hand2') {
  const rz = [-0.75, -0.65, -0.55, -0.45];
  const kind = process.argv[3] ?? 'carbine';
  const aim = Number(process.argv[4] ?? 0.4);
  let best: any = null;
  const rig = new CharacterRig(A, [`iron-${kind}` as never]);
  rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null });
  const parts = (rig as any).parts; const upper = (rig as any).upper;
  for (const twist of [0, 0.3, 0.6]) for (const rightX of [-1.2, -0.9, -0.6]) for (const rightZ of rz) for (const leftX of [-1.0, -0.85, -0.7, -0.55, -0.4]) for (const leftZ of [0.4, 0.5, 0.6, 0.7]) {
    upper.rotation.set(0, twist, 0);
    parts.get('armRight').rotation.set(rightX, 0, 0.05 + rightZ);
    parts.get('armLeft').rotation.set(leftX, 0, -0.05 + leftZ);
    (rig as any).orientWeapon((rig as any).weapon, parts.get('armRight'), 0, aim, 1);
    rig.muzzle(v); rig.grip(g); rig.hand('left', h);
    const d = seg(h, g, v) / 0.05;
    const r = v.clone().sub(g); const pitch = Math.atan2(r.y, Math.hypot(r.x, r.z));
    const sc = Math.max(0, d - 1.5) * 10 + twist * 2 + Math.abs(rightZ + 0.55) + Math.abs(leftZ - 0.5);
    if (!best || sc < best.sc) best = { sc, d, twist, rightX, rightZ, leftX, leftZ, pitch: pitch.toFixed(2), gripY: g.y.toFixed(2) };
  }
  console.log(kind, best);
}
if (mode === 'shoulder') {
  const kind = process.argv[3] ?? 'carbine';
  let best: any = null;
  const rig = new CharacterRig(A, [`iron-${kind}` as never]);
  rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null });
  const parts = (rig as any).parts; const upper = (rig as any).upper;
  for (const twist of [0]) for (const rightX of [-1.5, -1.3, -1.1, -0.9]) for (const rightZ of [-1.0, -0.85, -0.7, -0.5, -0.3]) for (const leftX of [-1.6, -1.4, -1.2, -1.0, -0.8]) for (const leftZ of [0.5, 0.7, 0.9, 1.1, 1.3]) {
    upper.rotation.set(0, twist, 0);
    parts.get('armRight').rotation.set(rightX, 0, 0.05 + rightZ);
    parts.get('armLeft').rotation.set(leftX, 0, -0.05 + leftZ);
    (rig as any).orientWeapon((rig as any).weapon, parts.get('armRight'), 0, 0, 1);
    rig.muzzle(v); rig.grip(g); rig.hand('left', h);
    const d = seg(h, g, v) / 0.05;
    const r = v.clone().sub(g); const pitch = Math.atan2(r.y, Math.hypot(r.x, r.z));
    const score = d + Math.max(0, 0.95 - g.y) * 10 + twist * 2;
    if (!best || score < best.score) best = { score, d: d.toFixed(2), twist, rightX, rightZ, leftX, leftZ, pitch: pitch.toFixed(2), gripY: g.y.toFixed(2) };
  }
  console.log(kind, best);
}
