import type { GearForm, GearMotif } from '@containment/shared';
import { darken, hex, lighten } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, type VoxelKind } from '../voxel/voxelKinds.ts';
import type { VoxelModel } from '../voxel/voxelModel.ts';
import { HEAD_SHAPES, heldWeaponHead, type WeaponHeadShape } from '../items/weaponHeads.ts';

export interface FormPaint {
  readonly form: GearForm;
  readonly motif: GearMotif | null;
  readonly base: number;
  readonly trim: number;
  readonly glow: number | null;
}

export const formPaintOf = (visual: { readonly primary: string; readonly secondary: string; readonly emissive?: string; readonly motif?: GearMotif; readonly form?: GearForm }): FormPaint | null =>
  visual.form ? { form: visual.form, motif: visual.motif ?? null, base: hex(visual.primary), trim: hex(visual.secondary), glow: visual.emissive ? hex(visual.emissive) : null } : null;

export const ROPE = 0x8a7a5a;
export const HAZARD = 0xe86a1c;
const VOID = 0x07090c;

const ring = (model: VoxelModel, y: number, radius: number, color: number, kind?: VoxelKind, step = 1): void => {
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      if (Math.max(Math.abs(x), Math.abs(z)) !== radius) continue;
      if (Math.abs(x) === radius && Math.abs(z) === radius && radius > 2) continue;
      if ((x + z) % step !== 0) continue;
      model.set(x, y, z, color, kind);
    }
  }
};

const glowOr = (paint: FormPaint, fallback: number): number => paint.glow ?? fallback;

export type HeadShape = 'helmet' | 'hood' | 'cowl';

export function headForm(model: VoxelModel, shape: HeadShape, paint: FormPaint): void {
  const { base, trim } = paint;
  switch (paint.form) {
    case 'scrap':
      if (shape === 'helmet') {
        model.fill(2, 26, 4, 3, 28, 4, darken(base, 0.1));
        model.remove(3, 31, 4).remove(4, 31, 4).remove(3, 32, 4).remove(4, 32, 4).remove(4, 31, 3).remove(4, 32, 3);
        model.fill(-5, 28, -2, -5, 31, 1, lighten(base, 0.12));
        model.fill(3, 34, -2, 3, 35, -2, darken(base, 0.25)).set(3, 35, -1, darken(base, 0.25));
      } else if (shape === 'hood') {
        for (let x = -4; x <= 4; x += 2) for (const z of [-4, 0, 3]) model.remove(x, 24, z);
        model.fill(-3, 24, 5, 3, 25, 5, darken(trim, 0.1)).set(4, 23, 5, darken(trim, 0.1)).set(4, 22, 5, darken(trim, 0.15));
      } else {
        model.fill(-3, 24, 5, 3, 30, 5, (x, y) => ((x === -2 || x === 2) && y === 28 ? VOID : lighten(base, 0.05)));
        ring(model, 23, 4, ROPE);
        model.fill(0, 21, 5, 0, 22, 5, ROPE);
      }
      return;
    case 'iron':
      if (shape === 'helmet') {
        for (let x = -3; x <= 3; x++) for (let y = 25; y <= 28; y++) model.remove(x, y, 4);
        model.fill(0, 26, 5, 0, 29, 5, lighten(base, 0.1));
        ring(model, 30, 5, darken(base, 0.1));
        for (let x = -4; x <= 4; x += 2) model.set(x, 32, 5, lighten(base, 0.3));
      } else if (shape === 'hood') {
        ring(model, 30, 5, darken(base, 0.08));
        model.fill(-3, 30, 6, 3, 30, 6, darken(base, 0.12));
        model.fill(-3, 20, -5, 3, 24, -5, darken(base, 0.05));
      } else {
        ring(model, 32, 5, darken(base, 0.1));
        [3, 3, 2, 1, 0].forEach((half, index) => model.fill(-half, 33 + index, -half, half, 33 + index, half, index === 4 ? lighten(base, 0.1) : base));
        if (paint.glow) model.set(4, 31, 4, paint.glow, VOXEL_EMISSIVE);
      }
      return;
    case 'steel':
      if (shape === 'helmet') {
        model.fill(-3, 26, 4, 3, 28, 4, base);
        model.fill(-3, 28, 4, 3, 28, 4, VOID).fill(0, 25, 4, 0, 27, 4, VOID);
        model.fill(0, 34, -4, 0, 35, 3, lighten(base, 0.18));
        model.fill(-5, 23, -3, -5, 24, 3, darken(base, 0.1)).fill(5, 23, -3, 5, 24, 3, darken(base, 0.1)).fill(-4, 23, 5, 4, 23, 5, darken(base, 0.15));
      } else if (shape === 'hood') {
        ring(model, 29, 5, darken(trim, 0.2), undefined);
        model.fill(-3, 29, 5, -2, 30, 6, 0x6a8a9a, VOXEL_GLASS).fill(2, 29, 5, 3, 30, 6, 0x6a8a9a, VOXEL_GLASS);
        model.set(5, 27, 0, trim).set(5, 26, 1, trim).set(5, 26, 2, trim).set(4, 26, 3, lighten(trim, 0.2));
      } else {
        [2, 2, 1, 1, 0].forEach((half, index) => model.fill(-half, 33 + index, 3, half, 33 + index, 4, index === 4 ? trim : base));
        const sigil = glowOr(paint, lighten(trim, 0.3));
        model.set(0, 31, 6, sigil, VOXEL_EMISSIVE).set(-1, 31, 6, sigil, VOXEL_EMISSIVE).set(1, 31, 6, sigil, VOXEL_EMISSIVE).set(0, 32, 6, sigil, VOXEL_EMISSIVE).set(0, 30, 6, sigil, VOXEL_EMISSIVE);
      }
      return;
    case 'alloy':
      if (shape === 'helmet') {
        for (let y = 24; y <= 33; y++) for (const x of [-4, 4]) for (const z of [-4, 4]) model.remove(x, y, z);
        for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (Math.abs(x) + Math.abs(z) >= 6) model.remove(x, 33, z);
        model.fill(-3, 25, 4, 3, 29, 4, base);
        model.fill(-2, 25, 5, 2, 29, 5, (x, y) => (Math.abs(x) === 2 || y === 25 || y === 29 ? lighten(base, 0.2) : null));
        model.fill(-1, 26, 4, 1, 28, 4, 0x5fa8c8, VOXEL_GLASS);
        for (const [x, z] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-4, -3], [4, -3]] as const) model.set(x, 24, z, lighten(trim, 0.2));
      } else if (shape === 'hood') {
        for (let x = -3; x <= 3; x++) for (let y = 30; y <= 32; y++) for (let z = 4; z <= 6; z++) model.remove(x, y, z);
        ring(model, 29, 5, darken(base, 0.15));
        ring(model, 23, 5, darken(base, 0.1));
        model.fill(-1, 33, -1, 1, 33, 1, base);
      } else {
        for (const [x, z, length] of [[-4, -2, 5], [-4, 2, 3], [4, -1, 6], [4, 3, 4], [-2, -4, 4], [2, -4, 6], [0, -4, 3]] as const) model.fill(x, 24 - length, z, x, 23, z, darken(base, 0.12));
        for (const x of [-3, 0, 3]) model.fill(x, 33, 0, x, x === 0 ? 36 : 35, 0, lighten(trim, 0.25));
      }
      return;
    case 'sinter':
      if (shape === 'helmet') {
        model.fill(-4, 25, 5, 4, 31, 5, (_x, y) => (y >= 27 && y <= 28 ? 0x1a1e24 : base));
        if (paint.glow) model.fill(-3, 27, 6, 3, 27, 6, paint.glow, VOXEL_EMISSIVE);
        model.fill(-5, 25, 1, -5, 27, 3, trim).fill(5, 25, 1, 5, 27, 3, trim);
        ring(model, 33, 4, HAZARD);
      } else if (shape === 'hood') {
        model.fill(-5, 26, -1, -5, 28, 1, darken(trim, 0.2)).fill(5, 26, -1, 5, 28, 1, darken(trim, 0.2));
        model.set(2, 27, 5, 0x1a1e24).fill(2, 27, 6, 2, 28, 6, darken(trim, 0.3)).set(2, 28, 7, glowOr(paint, HAZARD), VOXEL_EMISSIVE);
        model.fill(-4, 32, 4, 4, 32, 4, HAZARD);
      } else {
        for (let step = 0; step < 32; step++) if (step % 4 !== 3) model.set(Math.round(Math.cos((step * Math.PI) / 16) * 7), 29 + Math.round(Math.sin((step * Math.PI) / 16) * 7), -5, glowOr(paint, HAZARD), VOXEL_EMISSIVE);
        model.fill(-2, 24, 5, 2, 29, 5, base);
      }
      return;
    case 'vaultGlass':
      if (shape === 'helmet') {
        for (const [x, z, top] of [[-3, -1, 36], [-1, 0, 38], [2, -1, 37]] as const) model.fill(x, 34, z, x + 1, top, z + 1, (_x, y) => (y === top ? lighten(base, 0.4) : lighten(base, 0.2)), VOXEL_GLASS);
        for (const x of [-4, 4]) for (const z of [-4, 4]) model.remove(x, 33, z).remove(x, 32, z);
        model.fill(-3, 27, 4, 3, 27, 4, glowOr(paint, 0x7fd8ff), VOXEL_EMISSIVE);
      } else {
        model.fill(-3, 24, 4, 3, shape === 'cowl' ? 30 : 29, 4, VOID);
        const eye = glowOr(paint, 0x7fd8ff);
        model.set(-1, 27, 4, eye, VOXEL_EMISSIVE).set(1, 27, 4, eye, VOXEL_EMISSIVE);
        if (shape === 'hood') for (const [x, top] of [[-2, 33], [0, 34], [2, 33]] as const) model.fill(x, 32, 5, x, top, 5, lighten(base, 0.35), VOXEL_GLASS);
        else for (const [x, z] of [[-4, 0], [4, 0], [0, -4], [-3, 3], [3, 3], [-3, -3], [3, -3]] as const) model.set(x, 35, z, lighten(base, 0.3), VOXEL_GLASS);
      }
      return;
  }
}

export interface TorsoFrame {
  readonly half: (y: number) => number;
  readonly front: (y: number, x: number) => number;
  readonly shoulderHalf: number;
  readonly hipHalf: number;
}

export function torsoForm(model: VoxelModel, frame: TorsoFrame, paint: FormPaint): void {
  const { base, trim, motif } = paint;
  const front = (y: number, x: number) => frame.front(y, x) + (motif === 'bulwark' || motif === 'skirmisher' ? 2 : 1);
  const sh = frame.shoulderHalf;
  const hip = frame.hipHalf;
  switch (paint.form) {
    case 'scrap': {
      for (let x = -3; x <= -1; x++) for (let y = 18; y <= 20; y++) model.set(x, y, front(y, x) + 1, lighten(base, 0.12));
      for (let x = -hip; x <= hip; x++) model.set(x, 14, front(14, x), ROPE);
      model.fill(2, 11, front(14, 2), 2, 13, front(14, 2), ROPE);
      if (motif !== 'bulwark') for (const [x, drop] of [[-3, 3], [-1, 1], [1, 4], [3, 2]] as const) model.fill(x, 13 - drop, front(14, x) - 1, x, 12, front(14, x) - 1, darken(base, 0.1));
      if (motif === 'bulwark') for (let x = -sh; x <= sh; x += 3) model.remove(x, 17, front(17, x) - 2);
      if (motif === 'warden') for (let x = -1; x <= 1; x++) for (let y = 7; y <= 9; y++) if ((x + y) % 2 === 0) model.remove(x, y, Math.max(front(16, 0), 3));
      return;
    }
    case 'iron':
      ring(model, 23, 3, darken(base, 0.1));
      for (let x = -sh + 1; x <= sh - 1; x += 2) model.set(x, 19, front(19, x), lighten(base, 0.3)).set(x, 16, front(16, x), lighten(base, 0.3));
      model.fill(-1, 13, front(14, 0), 1, 14, front(14, 0), lighten(trim, 0.3));
      if (motif === 'skirmisher') for (let y = 9; y <= 12; y++) for (let x = -hip - 1; x <= hip + 1; x++) for (let z = -3; z <= 3; z++) if (Math.abs(x) === hip + 1 || Math.abs(z) === 3) model.set(x, y, z, y === 9 ? darken(base, 0.2) : base);
      if (motif === 'warden') {
        for (let y = 14; y <= 21; y++) model.fill(Math.round(-2 + (y - 14) * 0.6), y, front(y, 0) + 1, Math.round(-1 + (y - 14) * 0.6), y, front(y, 0) + 1, trim);
        model.fill(-hip - 1, 9, -4, hip + 1, 10, 4, (x, _y, z) => (Math.abs(x) === hip + 1 || Math.abs(z) === 4 ? darken(base, 0.08) : null));
        model.fill(-2, 11, front(14, -2) + 1, -2, 13, front(14, -2) + 1, ROPE).set(-2, 10, front(14, -2) + 1, glowOr(paint, 0x3fe0b0), VOXEL_EMISSIVE);
        model.fill(2, 11, front(14, 2) + 1, 2, 12, front(14, 2) + 1, ROPE).set(2, 10, front(14, 2) + 1, glowOr(paint, 0x3fe0b0), VOXEL_EMISSIVE);
      }
      return;
    case 'steel':
      if (motif === 'bulwark') {
        for (const y of [15, 17, 19]) for (let x = -frame.half(y) + 1; x <= frame.half(y) - 1; x++) model.set(x, y, front(y, x) + 1, lighten(base, 0.1));
        for (let x = -2; x <= 2; x++) model.set(x, 21 - Math.abs(x), front(21, x) + 2, lighten(base, 0.3));
        for (const [x0, x1] of [[-hip, -1], [1, hip]] as const) model.fill(x0, 9, 3, x1, 12, 3, (_x, y) => (y === 9 ? darken(base, 0.25) : y % 2 === 0 ? base : darken(base, 0.08)));
      } else if (motif === 'skirmisher') {
        for (const x of [-2, 2]) for (let y = 13; y <= 22; y++) model.set(x, y, front(y, x) + 1, darken(trim, 0.2));
        for (let x = -2; x <= 2; x++) model.set(x, 17, front(17, x) + 1, darken(trim, 0.2));
        model.set(-2, 15, front(15, -2) + 2, 0xc8ccd0).set(2, 15, front(15, 2) + 2, 0xc8ccd0);
        for (const [x, z] of [[sh - 2, -1], [sh - 1, -1], [sh, 0], [sh - 1, 1], [sh - 2, 1], [sh - 3, 0]] as const) model.set(x, 23, z, ROPE).set(x, 24, z, darken(ROPE, 0.1));
      } else {
        for (const x of [-3, -2, 2, 3]) model.fill(x, 5, front(16, x), x, 22, front(16, x), (_x, y) => (y === 5 ? glowOr(paint, trim) : trim));
        for (const x of [-sh, sh]) model.fill(x, 22, -2, x, 23, 2, trim);
      }
      return;
    case 'alloy':
      for (let y = 14; y <= 22; y++) model.set(0, y, front(y, 0) + 1, lighten(base, 0.2));
      for (const y of [22]) for (const x of [-frame.half(y), frame.half(y)]) model.remove(x, y, front(y, x) - 1).remove(x, y, -3);
      if (motif === 'bulwark') {
        model.fill(2, 17, front(17, 3) + 1, 4, 19, front(17, 3) + 1, (x, y) => (x === 3 && y === 18 ? null : lighten(trim, 0.25)));
        model.set(3, 18, front(18, 3), 0x5fa8c8, VOXEL_GLASS);
      } else if (motif === 'skirmisher') {
        for (const x of [-2, 2]) for (let y = 14; y <= 20; y += 2) model.set(x, y, front(y, x) + 1, lighten(trim, 0.4));
        for (let y = 19; y <= 22; y++) for (const side of [-1, 1]) model.set(side * (y - 18), y, front(y, 0) + 1, darken(base, 0.15));
      } else {
        for (let x = -sh; x <= -1; x++) for (let y = 18; y <= 22; y++) if ((x + y) % 2 === 0) model.set(x, y, front(y, x) + 1, darken(trim, 0.2));
        for (let x = -hip - 1; x <= hip + 1; x++) model.fill(x, 8 + ((x + 9) % 3), 4, x, 12, 4, darken(base, 0.1));
        for (let y = 16; y <= 23; y++) model.set(-sh - 1, y, 0, darken(trim, 0.2));
      }
      return;
    case 'sinter':
      for (const x of [-2, 2]) for (let y = 14; y <= 21; y++) model.set(x, y, front(y, x) - 1, 0x22262c).remove(x, y, front(y, x));
      ring(model, 23, 3, base);
      ring(model, 24, 3, motif === 'warden' ? glowOr(paint, HAZARD) : HAZARD, motif === 'warden' ? VOXEL_EMISSIVE : undefined);
      if (motif !== 'warden') model.set(0, 19, front(19, 0) + 1, glowOr(paint, HAZARD), VOXEL_EMISSIVE);
      if (motif === 'bulwark') for (const x of [-4, 4]) for (let y = 14; y <= 21; y++) model.set(x, y, front(y, x) - 1, 0x22262c).remove(x, y, front(y, x));
      if (motif === 'skirmisher') for (let x = -3; x <= 3; x += 2) model.fill(x, 14, front(14, x) + 1, x, 15, front(14, x) + 1, darken(base, 0.2));
      if (motif === 'warden') for (const x of [-sh, sh]) model.fill(x, 21, -1, x, 23, 1, (_vx, vy) => (vy === 22 ? glowOr(paint, HAZARD) : trim));
      return;
    case 'vaultGlass': {
      const glass = lighten(base, 0.25);
      for (let x = -2; x <= 2; x++) for (let y = 16; y <= 20; y++) model.set(x, y, front(y, x), x === 0 ? glowOr(paint, glass) : glass, x === 0 ? VOXEL_EMISSIVE : VOXEL_GLASS);
      if (motif === 'bulwark') {
        for (const x of [-sh, sh]) model.fill(x, 23, 0, x, 25, 0, glass, VOXEL_GLASS);
        for (let y = 14; y <= 22; y++) model.set(Math.round(Math.sin(y) * 2) + 3, y, front(y, 3) + 1, glowOr(paint, glass), VOXEL_EMISSIVE);
      } else if (motif === 'warden') {
        for (let x = -hip; x <= hip; x++) for (let y = 7; y <= 9; y++) for (const z of [-3, 3]) if ((x + y) % 2 === 0) model.remove(x, y, z);
        for (const [x, y] of [[-3, 5], [1, 5], [-1, 3]] as const) model.fill(x, y, 3, x + 1, y + 1, 4, glass, VOXEL_GLASS);
      } else {
        for (const x of [-3, 1]) model.fill(x, 11, front(14, x), x + 1, 13, front(14, x), glowOr(paint, glass), VOXEL_EMISSIVE);
      }
      return;
    }
  }
}

export interface ArmFrame {
  readonly x0: number;
  readonly x1: number;
  readonly outer: number;
  readonly side: -1 | 1;
}

export function gloveForm(model: VoxelModel, arm: ArmFrame, paint: FormPaint): void {
  const { x0, x1, outer, side } = arm;
  const { base } = paint;
  const lo = Math.min(x0, outer);
  const hi = Math.max(x1, outer);
  switch (paint.form) {
    case 'scrap':
      if (paint.motif === 'bulwark' && side < 0) model.fill(lo, 12, -2, hi, 14, 1, (x, y, z) => (x === outer || z === -2 || z === 1 ? (y === 14 ? darken(base, 0.2) : lighten(base, 0.1)) : null));
      else if (paint.motif === 'skirmisher') {
        for (let x = x0; x <= x1; x++) model.remove(x, 12, -1).remove(x, 12, 0);
        model.set(outer, 14, 0, ROPE).set(outer, 13, 1, ROPE);
      } else model.fill(x0, 14, -1, x1, 14, 0, lighten(ROPE, 0.25)).fill(outer, 11, 0, outer, 13, 0, lighten(ROPE, 0.25));
      return;
    case 'iron':
      model.fill(x0 - 1, 14, -2, x1 + 1, 15, 1, (x, _y, z) => (x < x0 || x > x1 || z < -1 || z > 0 ? darken(base, 0.1) : null));
      return;
    case 'steel':
      model.fill(outer, 14, -1, outer, 17, 0, (_x, y) => (y === 17 ? lighten(base, 0.2) : base)).set(outer, 18, 0, lighten(base, 0.25));
      return;
    case 'alloy':
      model.fill(x0 - 1, 14, -2, x1 + 1, 14, 1, (x, _y, z) => (x < x0 || x > x1 || z < -1 || z > 0 ? lighten(paint.trim, 0.25) : null));
      model.fill(x0, 11, -1, x1, 11, 0, base);
      return;
    case 'sinter':
      model.fill(lo, 13, -2, hi, 15, 1, (x, y, z) => (x === outer || z === -2 || z === 1 || x === x0 - side ? (y === 15 ? HAZARD : base) : null));
      return;
    case 'vaultGlass': {
      const glass = lighten(base, 0.25);
      for (let x = x0; x <= x1; x++) model.set(x, 12, 1, glass, VOXEL_GLASS);
      model.fill(outer + side, 14, -1, outer + side, 17, -1, (_x, y) => (y === 17 ? glowOr(paint, glass) : glass), VOXEL_GLASS);
      return;
    }
  }
}

export function shoulderForm(model: VoxelModel, arm: ArmFrame, paint: FormPaint, shoulderTop: number): void {
  const { x0, x1, outer, side } = arm;
  const { base } = paint;
  const lo = Math.min(x0, outer);
  const hi = Math.max(x1, outer);
  switch (paint.form) {
    case 'scrap':
      if (side < 0) model.fill(Math.min(lo, outer + side), shoulderTop, -2, Math.max(hi, outer + side), shoulderTop + 1, 1, (x) => (x === outer + side ? darken(base, 0.1) : lighten(base, 0.05)));
      else model.remove(outer, shoulderTop, -2).remove(outer, shoulderTop, 1);
      return;
    case 'iron':
      model.fill(lo, shoulderTop, -2, hi, shoulderTop + 1, 1, (x, y, z) => ((x + z) % 2 === 0 && y === shoulderTop ? lighten(base, 0.3) : base));
      return;
    case 'steel':
      model.fill(Math.min(lo, outer + side), 18, -3, Math.max(hi, outer + side), 18, 2, darken(base, 0.15));
      model.fill(lo, shoulderTop + 1, -1, hi, shoulderTop + 1, 0, lighten(base, 0.15));
      return;
    case 'alloy':
      model.fill(lo, 21, -5, hi, 22, -3, (_x, _y, z) => (z === -5 ? darken(base, 0.2) : base));
      return;
    case 'sinter':
      model.fill(lo, shoulderTop, -2, hi, shoulderTop, 1, (x) => (x === outer ? HAZARD : base));
      model.remove(outer, 20, -2).remove(outer, 20, 1);
      return;
    case 'vaultGlass':
      for (let x = lo; x <= hi; x++) for (let y = 19; y <= shoulderTop + 1; y++) for (let z = -2; z <= 1; z++) if (model.has(x, y, z) && (x === outer || z === -2 || z === 1 || y > shoulderTop)) model.remove(x, y, z);
      model.fill(Math.min(x0, x1), shoulderTop + 1, -2, Math.max(x0, x1) + side, shoulderTop + 3, 1, (x, y) => (y === shoulderTop + 3 && x !== x0 ? null : lighten(base, 0.25)), VOXEL_GLASS);
      model.fill(outer + side, 20, -1, outer + side, shoulderTop + 2, 0, lighten(base, 0.35), VOXEL_GLASS);
      return;
  }
}

export interface LegFrame {
  readonly inner: number;
  readonly outer: number;
  readonly outside: number;
  readonly side: -1 | 1;
}

export function legForm(model: VoxelModel, leg: LegFrame, paint: FormPaint): void {
  const { inner, outer, outside, side } = leg;
  const { base } = paint;
  const mid = Math.round((inner + outer) / 2);
  switch (paint.form) {
    case 'scrap':
      model.fill(mid - 1, 7, 3, mid + 1, 9, 3, (x, y) => (x === mid && y === 8 ? lighten(base, 0.3) : darken(base, 0.05)));
      model.paintExisting(inner, 5, -1, outer, 5, 2, ROPE);
      return;
    case 'iron':
      model.fill(inner, 7, 3, outer, 9, 3, (x, y) => (x === mid && y === 8 ? lighten(base, 0.35) : base));
      model.fill(inner, 1, 2, outer, 6, 2, darken(base, 0.05));
      if (paint.motif !== 'bulwark') model.fill(inner - 1, 6, -2, outer + 1, 7, 2, (x, _y, z) => (x < inner || x > outer || Math.abs(z) === 2 ? lighten(base, 0.05) : null));
      return;
    case 'steel':
      model.fill(mid, 8, 3, mid, 9, 3, lighten(base, 0.2)).set(mid, 8, 4, lighten(base, 0.3));
      model.fill(outside + side, 9, -1, outside + side, 10, 1, darken(paint.trim, 0.1));
      model.fill(outside, 8, -1, outside, 10, 1, (_x, y) => (y === 10 ? lighten(base, 0.2) : base)).set(outside + side, 9, 0, lighten(base, 0.15));
      return;
    case 'alloy':
      for (let x = inner - 1; x <= outer + 1; x++) for (let z = -2; z <= 2; z++) if (x < inner || x > outer || Math.abs(z) === 2) model.set(x, 8, z, lighten(paint.trim, 0.25));
      return;
    case 'sinter':
      model.fill(inner, 9, 2, outer, 12, 2, base).fill(inner, 4, 2, outer, 7, 2, base);
      model.remove(mid, 8, 2);
      if (paint.motif === 'skirmisher' && side > 0) model.fill(outside + 1, 8, -1, outside + 1, 11, 0, darken(paint.trim, 0.3));
      return;
    case 'vaultGlass':
      model.fill(mid, 8, 3, mid, 8, 5, lighten(base, 0.25), VOXEL_GLASS).set(mid, 9, 4, lighten(base, 0.25), VOXEL_GLASS);
      model.fill(outside + side, 9, -1, outside + side, 12, 0, lighten(base, 0.25), VOXEL_GLASS);
      model.fill(mid, 4, -2, mid, 6, -2, lighten(base, 0.3), VOXEL_GLASS).fill(mid, 5, -3, mid, 6, -3, lighten(base, 0.3), VOXEL_GLASS);
      for (let y = 5; y <= 11; y += 3) model.paintExisting(inner, y, 2, outer, y, 2, glowOr(paint, lighten(base, 0.4)), VOXEL_EMISSIVE);
      return;
  }
}

export function bootForm(model: VoxelModel, leg: LegFrame, paint: FormPaint): void {
  const { inner, outer, side } = leg;
  const { base, trim } = paint;
  const mid = Math.round((inner + outer) / 2);
  switch (paint.form) {
    case 'scrap':
      if (side < 0) model.fill(inner, 0, 3, outer, 1, 3, darken(base, 0.1));
      else model.fill(inner - 1, 3, -2, outer + 1, 4, 2, (x, _y, z) => (x < inner || x > outer || Math.abs(z) === 2 ? ROPE : null));
      return;
    case 'iron':
      model.fill(inner, 0, 3, outer, 1, 3, base);
      model.paintExisting(inner, 3, -1, outer, 3, 2, lighten(trim, 0.3));
      model.fill(inner - 1, 5, -1, outer + 1, 6, 1, (x) => (x < inner || x > outer ? base : null));
      return;
    case 'steel':
      model.set(mid, 0, 3, base).set(mid, 0, 4, lighten(base, 0.2)).set(mid, 1, 3, base);
      model.fill(side < 0 ? inner - 1 : outer + 1, 2, -1, side < 0 ? inner - 1 : outer + 1, 4, 0, lighten(base, 0.15));
      for (let y = 1; y <= 4; y += 2) model.paintExisting(inner, y, 2, outer, y, 2, darken(base, 0.15));
      return;
    case 'alloy':
      model.fill(inner - 1, 0, -2, outer + 1, 0, 3, darken(trim, 0.2));
      model.fill(inner - 1, 4, -2, outer + 1, 4, 2, (x, _y, z) => (x < inner || x > outer || Math.abs(z) === 2 ? lighten(base, 0.1) : null));
      return;
    case 'sinter':
      model.fill(inner, 0, -1, outer, 1, 2, (_x, y, z) => (y === 0 ? darken(trim, 0.4) : z === 2 ? HAZARD : (z % 2 === 0 ? darken(base, 0.1) : base)));
      model.fill(inner, 2, 2, outer, 7, 2, (_x, y) => (y === 2 ? HAZARD : base));
      model.fill(inner, 0, 3, outer, 0, 3, darken(trim, 0.4));
      return;
    case 'vaultGlass':
      model.fill(mid, 1, -2, mid, 1, -4, lighten(base, 0.25), VOXEL_GLASS);
      model.set(mid, 0, 3, lighten(base, 0.25), VOXEL_GLASS).set(mid, 0, 4, lighten(base, 0.35), VOXEL_GLASS);
      model.fill(side < 0 ? inner - 1 : outer + 1, 3, 0, side < 0 ? inner - 1 : outer + 1, 5, 1, lighten(base, 0.3), VOXEL_GLASS);
      return;
  }
}

export type HeldShape = 'baton' | 'blade' | 'maul' | 'pistol' | 'carbine' | 'rifle' | 'focus' | 'resonator' | 'knife' | 'polearm' | 'scattergun';

const MELEE: readonly HeldShape[] = ['baton', 'blade', 'maul', 'knife', 'polearm'];
const PSIONIC: readonly HeldShape[] = ['focus', 'resonator'];

export function heldForm(model: VoxelModel, shape: HeldShape, span: readonly [number, number, number], handX: number, paint: FormPaint): void {
  if (HEAD_SHAPES.includes(shape)) {
    heldWeaponHead(model, shape as WeaponHeadShape, paint.form, handX, { primary: paint.base, secondary: paint.trim, emissive: paint.glow });
    return;
  }
  const [grip, tip, y] = span;
  const { base, trim } = paint;
  const melee = MELEE.includes(shape);
  const psionic = PSIONIC.includes(shape);
  const mid = Math.round((Math.max(grip, 1) + tip) / 2);
  const x = handX;
  switch (paint.form) {
    case 'scrap':
      model.set(x, y, Math.max(grip, 1) + 1, ROPE).set(x, y, mid, ROPE);
      if (melee) {
        if (shape === 'blade') for (let z = 4; z <= 9; z += 2) model.remove(x, 14, z);
        else model.set(x + 1, y + 1, tip, darken(base, 0.2)).set(x + 1, y + 2, tip, darken(base, 0.2));
      } else if (psionic) model.fill(x - 1, 11, tip - 3, x + 1, 13, tip - 1, (vx, vy) => (vx === x && vy === 12 ? null : 0x9ab0a8), VOXEL_GLASS);
      else model.fill(x, y + 1, Math.max(grip, 1), x, y + 1, tip - 1, darken(trim, 0.15));
      return;
    case 'iron':
      if (melee) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) model.fill(x + dx, y + dy, tip - 2, x + dx, y + dy, tip, darken(base, 0.1));
      else if (psionic) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) model.fill(x + dx, 12 + dy, tip - 3, x + dx, 12 + dy, tip - 1, base);
      else model.fill(x, y - 2, Math.max(grip, 1) + 1, x, y - 2, Math.max(grip, 1) + 3, darken(base, 0.2)).set(x, y - 1, Math.max(grip, 1) + 3, darken(base, 0.2));
      return;
    case 'steel':
      if (shape === 'maul') model.fill(x, y, tip + 1, x, y, tip + 2, lighten(base, 0.2));
      else if (melee) model.fill(x - 1, y - 1, Math.max(grip, 1) + 2, x + 1, y + 1, Math.max(grip, 1) + 2, (vx, vy) => (vx === x || vy === y ? lighten(trim, 0.1) : null));
      else if (psionic) for (const dx of [-1, 1]) model.fill(x + dx, 12, tip - 1, x + dx, 12, tip + 2, lighten(base, 0.15));
      else model.fill(x, y + 1, Math.max(grip, 1), x, y + 1, tip - 2, darken(base, 0.3)).fill(x, y - 1, Math.max(grip, 1) + 3, x, y - 2, Math.max(grip, 1) + 3, darken(base, 0.35));
      return;
    case 'alloy':
      if (melee) model.fill(x, y + 1, tip, x, y + 2, tip, base).set(x, y + 2, tip - 1, base).set(x, y + 2, tip - 2, lighten(base, 0.2));
      else if (psionic) for (let dz = -2; dz <= 2; dz++) model.set(x, 12 + 2 - Math.abs(dz) + 1, tip - 2 + dz, lighten(trim, 0.2));
      else model.fill(x - 1, y - 1, tip + 1, x + 1, y + 1, tip + 1, (vx, vy) => (vx === x && vy === y ? null : lighten(base, 0.15)));
      return;
    case 'sinter':
      if (melee) {
        model.fill(x - 1, y - 1, Math.max(grip, 1) + 1, x + 1, y + 1, Math.max(grip, 1) + 1, HAZARD);
        model.fill(x, y + 1, mid, x, y + 1, tip, glowOr(paint, HAZARD), VOXEL_EMISSIVE);
      } else if (psionic) model.fill(x - 2, 10, tip - 2, x + 2, 14, tip - 2, (vx, vy) => (Math.abs(vx - x) === 2 || Math.abs(vy - 12) === 2 ? base : null));
      else model.fill(x - 1, y + 1, mid - 1, x + 1, y + 2, mid + 1, (_vx, vy) => (vy === y + 2 ? glowOr(paint, HAZARD) : base));
      return;
    case 'vaultGlass': {
      const glass = lighten(base, 0.25);
      for (let z = tip - 3; z <= tip; z += 2) model.remove(x, y, z);
      for (const [dx, dy, dz] of [[-2, 1, tip - 1], [2, -1, tip - 2], [0, 3, tip]] as const) model.set(x + dx, y + dy, dz, glass, VOXEL_GLASS);
      if (!melee && !psionic) model.set(x, y, tip + 2, glowOr(paint, glass), VOXEL_EMISSIVE);
      return;
    }
  }
}

export function backForm(model: VoxelModel, shape: 'pack' | 'cape' | 'shield', paint: FormPaint): void {
  const { base, trim } = paint;
  switch (paint.form) {
    case 'scrap':
      if (shape === 'cape') for (let x = -4; x <= 4; x += 2) model.remove(x, 5, -5).remove(x + 1, 6, -5);
      else if (shape === 'pack') model.fill(-4, 22, -4, 4, 22, -4, ROPE).fill(-3, 23, -5, -1, 24, -6, darken(base, 0.1));
      else model.fill(-3, 15, -7, 3, 15, -7, ROPE).remove(4, 21, -6).remove(-4, 12, -6);
      return;
    case 'iron':
      if (shape === 'shield') model.fill(-1, 15, -6, 1, 17, -6, lighten(base, 0.2));
      else if (shape === 'pack') model.fill(-4, 13, -6, 4, 13, -6, darken(trim, 0.2)).fill(-4, 13, -6, -4, 22, -6, darken(trim, 0.2)).fill(4, 13, -6, 4, 22, -6, darken(trim, 0.2));
      else model.fill(-4, 22, -5, 4, 23, -3, lighten(base, 0.05));
      return;
    case 'steel':
      if (shape === 'shield') for (let y = 12; y <= 22; y++) model.set(0, y, -6, lighten(base, 0.2));
      else if (shape === 'pack') for (const [x, z] of [[-3, -5], [-4, -6], [-3, -7], [-2, -6]] as const) model.fill(x, 18, z, x, 20, z, ROPE);
      else for (const x of [-2, 2]) model.fill(x, 8, -6, x, 21, -6, trim);
      return;
    case 'alloy':
      if (shape === 'pack') model.fill(-2, 14, -6, 2, 23, -6, (x, y) => (Math.abs(x) === 2 || y === 23 ? darken(base, 0.1) : lighten(base, 0.1))).set(0, 24, -7, lighten(trim, 0.2));
      else if (shape === 'shield') model.fill(-2, 16, -6, 2, 18, -6, (x, y) => (Math.abs(x) === 2 || y !== 17 ? lighten(trim, 0.2) : null)).set(0, 17, -6, 0x5fa8c8, VOXEL_GLASS);
      else for (const x of [-3, -1, 2, 4]) model.fill(x, 3, -5, x, 5, -5, darken(base, 0.12));
      return;
    case 'sinter':
      model.fill(-1, 17, -6, 1, 19, -6, (x, y) => (x === 0 && y === 18 ? glowOr(paint, HAZARD) : HAZARD), VOXEL_EMISSIVE);
      if (shape === 'shield') model.fill(-4, 12, -6, 4, 12, -6, HAZARD);
      return;
    case 'vaultGlass': {
      const glass = lighten(base, 0.25);
      if (shape === 'cape') for (const [x, y] of [[-3, 3], [1, 2], [3, 0], [-1, 1]] as const) model.set(x, y, -5, glass, VOXEL_GLASS);
      else for (const [x, y, z] of [[-5, 23, -6], [5, 21, -7], [0, 25, -6], [-3, 26, -5]] as const) model.set(x, y, z, glass, VOXEL_GLASS);
      return;
    }
  }
}
