import type { GearForm } from '@containment/shared';
import { darken, lighten } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS, type VoxelKind } from '../voxel/voxelKinds.ts';
import type { VoxelModel } from '../voxel/voxelModel.ts';

export type WeaponHeadShape = 'maul' | 'pistol' | 'carbine' | 'rifle';

export const HEAD_SHAPES: readonly string[] = ['maul', 'pistol', 'carbine', 'rifle'];

export interface HeadPalette {
  readonly primary: number;
  readonly secondary: number;
  readonly emissive: number | null;
}

const ROPE = 0x8a7a5a;
const HAZARD = 0xe86a1c;

const diamond = (model: VoxelModel, cx: number, cy: number, radius: number, color: number, kind: VoxelKind = VOXEL_GLASS): void => {
  for (let x = -radius; x <= radius; x++) for (let y = -radius; y <= radius; y++) if (Math.abs(x) + Math.abs(y) <= radius) model.fill(cx + x, cy + y, -1, cx + x, cy + y, 0, color, kind);
};

export function iconWeaponHead(model: VoxelModel, shape: WeaponHeadShape, form: GearForm, palette: HeadPalette): void {
  const { primary, secondary } = palette;
  const glow = palette.emissive ?? lighten(primary, 0.35);
  const glass = lighten(primary, 0.25);
  if (shape === 'maul') {
    for (let x = 1; x <= 8; x++) for (let y = 12; y <= 17; y++) for (let z = -2; z <= 2; z++) model.remove(x, y, z);
    switch (form) {
      case 'scrap':
        model.fill(0, 11, -2, 5, 15, 2, (x, y) => (x === 5 && y > 13 ? null : primary)).fill(6, 12, -1, 6, 14, 1, darken(primary, 0.15)).fill(4, 16, 0, 4, 18, 0, darken(primary, 0.25)).set(5, 18, 0, darken(primary, 0.25));
        return;
      case 'iron':
        model.fill(1, 11, -2, 7, 16, 2, primary).fill(0, 13, -3, 8, 14, 3, (x, _y, z) => (x === 0 || x === 8 || Math.abs(z) === 3 ? lighten(primary, 0.25) : null));
        return;
      case 'steel':
        model.fill(1, 12, -1, 5, 16, 1, primary).fill(6, 13, 0, 8, 15, 0, lighten(primary, 0.15)).fill(9, 14, 0, 10, 14, 0, lighten(primary, 0.3)).fill(-1, 14, 0, 0, 14, 0, primary);
        return;
      case 'alloy':
        model.fill(3, 12, 0, 4, 18, 0, primary).fill(-1, 18, -1, 8, 18, 1, lighten(primary, 0.1));
        for (const [x, y] of [[-1, 17], [-2, 16], [-2, 15], [-1, 14], [8, 17], [9, 16], [9, 15], [8, 14]] as const) model.fill(x, y, -1, x, y, 1, primary);
        model.fill(2, 19, 0, 5, 20, 0, (x) => (x === 2 || x === 5 ? secondary : null));
        return;
      case 'sinter':
        model.fill(1, 12, -2, 7, 16, 2, primary).fill(8, 12, -1, 9, 16, 1, (_x, y) => (y % 2 === 0 ? HAZARD : null)).fill(1, 17, -1, 7, 17, 1, glow, VOXEL_EMISSIVE);
        return;
      case 'vaultGlass':
        diamond(model, 2, 13, 2, glass);
        diamond(model, 6, 16, 3, lighten(primary, 0.15));
        diamond(model, 8, 11, 1, glow, VOXEL_EMISSIVE);
        return;
    }
  }
  if (shape === 'pistol') {
    switch (form) {
      case 'scrap':
        model.fill(-1, 3, -1, 7, 5, 1, darken(secondary, 0.1)).fill(8, 4, 0, 9, 4, 0, ROPE);
        return;
      case 'iron':
        model.fill(0, 3, -2, 4, 12, 2, (x, y) => ((x + y) % 2 === 0 ? darken(primary, 0.15) : primary));
        return;
      case 'steel':
        model.fill(-6, 10, -1, 6, 11, 1, lighten(primary, 0.1)).fill(-5, -4, -1, -3, 0, 1, darken(secondary, 0.2));
        return;
      case 'alloy':
        model.fill(8, 4, -2, 8, 11, 2, (_x, y, z) => (y === 4 || y === 11 || Math.abs(z) === 2 ? lighten(primary, 0.15) : null)).fill(9, 3, -3, 9, 12, 3, (_x, y, z) => (y === 3 || y === 12 || Math.abs(z) === 3 ? primary : null));
        return;
      case 'sinter':
        model.fill(-6, 9, -1, 5, 12, 1, (_x, y) => (y === 12 ? HAZARD : primary)).fill(-1, 13, 0, 2, 13, 0, glow, VOXEL_EMISSIVE);
        return;
      case 'vaultGlass':
        for (let x = 4; x <= 7; x++) for (let y = 6; y <= 9; y++) model.remove(x, y, -1).remove(x, y, 0).remove(x, y, 1);
        model.fill(9, 4, 0, 10, 11, 0, (_x, y) => (y === 7 || y === 8 ? glow : glass), VOXEL_GLASS);
        model.fill(5, 7, 0, 6, 8, 0, glass, VOXEL_GLASS);
        return;
    }
  }
  const tip = shape === 'rifle' ? 18 : 13;
  switch (form) {
    case 'scrap':
      model.fill(-4, 9, 0, tip - 2, 10, 0, darken(secondary, 0.1));
      for (const x of [-1, 5]) model.fill(x, 5, -1, x, 10, 1, ROPE);
      return;
    case 'iron':
      model.fill(-7, -3, 0, -1, 0, 0, (x, y) => (x === -7 || x === -1 || y === -3 ? darken(primary, 0.2) : null));
      return;
    case 'steel':
      model.fill(-4, 9, -1, 5, 11, 1, (x, y) => (y === 9 && Math.abs(x) < 3 ? null : darken(primary, 0.3))).fill(tip - 6, -1, 0, tip - 6, 4, 0, darken(primary, 0.35)).fill(tip - 4, -1, 0, tip - 4, 4, 0, darken(primary, 0.35));
      return;
    case 'alloy':
      for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (x * x + y * y <= 10) model.fill(2 + x, 1 + y, -1, 2 + x, 1 + y, 1, (x + y) % 3 === 0 ? lighten(primary, 0.2) : primary);
      return;
    case 'sinter':
      model.fill(-3, 8, -1, 5, 10, 1, (_x, y) => (y === 10 ? glow : primary), VOXEL_EMISSIVE).fill(tip - 4, 1, -1, tip - 2, 4, 1, HAZARD);
      return;
    case 'vaultGlass':
      for (let x = 3; x <= tip - 1; x += 3) for (let y = 4; y <= 8; y++) for (let z = -1; z <= 1; z++) model.remove(x, y, z);
      for (const [x, y] of [[4, 9], [8, 2], [tip + 1, 6], [tip + 2, 6]] as const) model.fill(x, y, 0, x + 1, y + 1, 0, glass, VOXEL_GLASS);
      return;
  }
}

export function heldWeaponHead(model: VoxelModel, shape: WeaponHeadShape, form: GearForm, x: number, palette: HeadPalette): void {
  const { primary, secondary } = palette;
  const glow = palette.emissive ?? lighten(primary, 0.35);
  const glass = lighten(primary, 0.25);
  if (shape === 'maul') {
    for (let dx = -2; dx <= 2; dx++) for (let y = 8; y <= 16; y++) for (let z = 8; z <= 12; z++) model.remove(x + dx, y, z);
    switch (form) {
      case 'scrap':
        model.fill(x - 1, 9, 8, x + 1, 13, 11, (vx, vy, vz) => (vz === 11 && vy > 11 ? null : vx === x + 1 && vy === 9 ? null : primary)).fill(x, 14, 9, x, 15, 9, darken(primary, 0.25));
        return;
      case 'iron':
        model.fill(x - 1, 9, 8, x + 1, 15, 10, primary).fill(x - 2, 11, 7, x + 2, 13, 7, lighten(primary, 0.25));
        return;
      case 'steel':
        model.fill(x - 1, 10, 8, x + 1, 14, 10, primary).fill(x, 7, 9, x, 9, 9, lighten(primary, 0.2)).fill(x, 15, 9, x, 16, 9, lighten(primary, 0.1));
        return;
      case 'alloy':
        model.fill(x, 12, 8, x, 12, 12, primary).fill(x, 8, 11, x, 16, 11, lighten(primary, 0.1)).fill(x, 8, 9, x, 8, 10, primary).fill(x, 16, 9, x, 16, 10, primary);
        return;
      case 'sinter':
        model.fill(x - 1, 10, 8, x + 1, 14, 10, primary).fill(x - 2, 10, 8, x - 2, 14, 10, (_vx, vy) => (vy % 2 === 0 ? HAZARD : null)).fill(x + 2, 10, 8, x + 2, 14, 10, (_vx, vy) => (vy % 2 === 0 ? HAZARD : null)).fill(x, 12, 11, x, 12, 11, glow, VOXEL_EMISSIVE);
        return;
      case 'vaultGlass':
        model.fill(x - 1, 10, 8, x, 12, 9, glass, VOXEL_GLASS).fill(x, 13, 10, x + 1, 15, 11, lighten(primary, 0.15), VOXEL_GLASS).set(x, 9, 11, glow, VOXEL_EMISSIVE);
        return;
    }
  }
  if (shape === 'pistol') {
    switch (form) {
      case 'scrap':
        model.fill(x, 12, 2, x, 12, 5, darken(secondary, 0.1)).set(x, 13, 6, ROPE);
        return;
      case 'iron':
        model.fill(x - 1, 12, 2, x + 1, 14, 3, darken(primary, 0.1));
        return;
      case 'steel':
        model.fill(x, 9, 1, x, 11, 1, darken(secondary, 0.2)).fill(x, 14, 1, x, 14, 5, lighten(primary, 0.1));
        return;
      case 'alloy':
        model.fill(x - 1, 12, 6, x + 1, 14, 6, (vx, vy) => (vx === x && vy === 13 ? null : lighten(primary, 0.15)));
        return;
      case 'sinter':
        model.fill(x - 1, 13, 1, x + 1, 15, 4, (_vx, vy) => (vy === 15 ? HAZARD : primary)).set(x, 16, 2, glow, VOXEL_EMISSIVE);
        return;
      case 'vaultGlass':
        model.remove(x, 13, 4).remove(x, 13, 5).fill(x, 12, 7, x, 14, 7, glass, VOXEL_GLASS).set(x, 13, 8, glow, VOXEL_EMISSIVE);
        return;
    }
  }
  const tip = shape === 'rifle' ? 14 : 10;
  switch (form) {
    case 'scrap':
      model.fill(x, 14, 0, x, 14, tip - 1, darken(secondary, 0.1)).set(x, 15, 2, ROPE).set(x, 15, 6, ROPE);
      return;
    case 'iron':
      model.fill(x, 9, -1, x, 11, 3, (_vx, vy, vz) => (vy === 9 || vz === -1 || vz === 3 ? darken(primary, 0.2) : null));
      return;
    case 'steel':
      model.fill(x, 15, 1, x, 16, 6, darken(primary, 0.3)).fill(x - 1, 10, tip - 2, x - 1, 12, tip - 2, darken(primary, 0.35)).fill(x + 1, 10, tip - 2, x + 1, 12, tip - 2, darken(primary, 0.35));
      return;
    case 'alloy':
      model.fill(x - 1, 9, 1, x + 1, 11, 4, (vx, vy, vz) => (Math.abs(vx - x) + Math.abs(vy - 10) + Math.abs(vz - 2.5) > 3.5 ? null : primary));
      return;
    case 'sinter':
      model.fill(x - 1, 14, 3, x + 1, 15, 4, primary).fill(x, 16, 3, x, 16, 4, glow, VOXEL_EMISSIVE).fill(x, 11, tip - 3, x, 12, tip - 3, HAZARD);
      return;
    case 'vaultGlass':
      for (const z of [tip - 4, tip - 1]) model.remove(x, 13, z);
      model.fill(x, 12, tip + 1, x, 14, tip + 2, glass, VOXEL_GLASS).fill(x - 1, 14, 3, x, 15, 4, glass, VOXEL_GLASS);
      return;
  }
}
