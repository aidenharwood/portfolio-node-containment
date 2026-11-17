import type { GearForm, ItemIconShape } from '@containment/shared';
import { darken, lighten } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import type { VoxelModel } from '../voxel/voxelModel.ts';
import { HEAD_SHAPES, iconWeaponHead, type WeaponHeadShape } from './weaponHeads.ts';

export interface FormPalette {
  readonly primary: number;
  readonly secondary: number;
  readonly emissive: number | null;
}

const ROPE = 0x8a7a5a;
const HAZARD = 0xe86a1c;
const VOID = 0x07090c;
const PORTHOLE = 0x5fa8c8;

type Category = 'helmet' | 'hood' | 'torso' | 'gloves' | 'trousers' | 'boots' | 'pack' | 'cape' | 'shield' | 'melee' | 'ranged' | 'psionic' | 'other';

const CATEGORY: Partial<Record<ItemIconShape, Category>> = {
  helmet: 'helmet',
  hood: 'hood',
  cowl: 'hood',
  plate: 'torso',
  vest: 'torso',
  coat: 'torso',
  jumpsuit: 'torso',
  gloves: 'gloves',
  trousers: 'trousers',
  boots: 'boots',
  pack: 'pack',
  cape: 'cape',
  shield: 'shield',
  baton: 'melee',
  blade: 'melee',
  maul: 'melee',
  knife: 'melee',
  polearm: 'melee',
  pistol: 'ranged',
  carbine: 'ranged',
  rifle: 'ranged',
  scattergun: 'ranged',
  focus: 'psionic',
  resonator: 'psionic',
};

const MELEE_HEAD: Partial<Record<ItemIconShape, readonly [number, number]>> = { baton: [6, 12], blade: [7, 12], maul: [4, 14], knife: [4, 9], polearm: [8, 14] };
const MUZZLE: Partial<Record<ItemIconShape, readonly [number, number]>> = { pistol: [8, 7], carbine: [13, 6], rifle: [18, 5], scattergun: [8, 6] };
const PSI_TOP: Partial<Record<ItemIconShape, number>> = { focus: 16, resonator: 24 };

export function iconForm(model: VoxelModel, shape: ItemIconShape, form: GearForm, palette: FormPalette): void {
  if (HEAD_SHAPES.includes(shape)) {
    iconWeaponHead(model, shape as WeaponHeadShape, form, palette);
    return;
  }
  const category = CATEGORY[shape] ?? 'other';
  const { primary, secondary } = palette;
  const glow = palette.emissive;
  const glass = lighten(primary, 0.25);
  const [hx, hy] = MELEE_HEAD[shape] ?? [0, 0];
  const [mx, my] = MUZZLE[shape] ?? [0, 0];
  const top = PSI_TOP[shape] ?? 0;
  switch (category) {
    case 'helmet':
      switch (form) {
        case 'scrap':
          model.fill(1, 2, 6, 4, 4, 6, darken(primary, 0.1));
          for (let x = 3; x <= 5; x++) for (let y = 4; y <= 6; y++) model.remove(x, y, 4).remove(x, y, 5);
          model.fill(-7, 2, -2, -7, 5, 2, lighten(primary, 0.12)).fill(3, 8, -2, 3, 10, -2, darken(primary, 0.25));
          return;
        case 'iron':
          for (let angle = 0; angle < Math.PI * 2; angle += 0.1) model.set(Math.round(Math.cos(angle) * 8), 3, Math.round(Math.sin(angle) * 8), darken(primary, 0.1));
          model.fill(-4, 1, 6, 4, 2, 6, primary).fill(0, 0, 7, 0, 4, 7, lighten(primary, 0.15));
          return;
        case 'steel':
          model.fill(0, 7, -5, 0, 10, 4, lighten(primary, 0.2));
          model.fill(-4, 2, 6, 4, 4, 6, primary).fill(-4, 3, 6, 4, 3, 6, VOID).fill(0, 1, 6, 0, 3, 6, VOID);
          model.fill(-7, -2, -3, 7, -1, 3, (x, _y, z) => (Math.abs(x) >= 6 || Math.abs(z) === 3 ? darken(primary, 0.1) : null));
          return;
        case 'alloy':
          for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if (Math.abs(x) >= 4 && Math.abs(z) >= 4) for (let y = 0; y <= 8; y++) model.remove(x, y, z);
          model.fill(-4, 1, 6, 4, 5, 6, primary).fill(-2, 2, 7, 2, 4, 7, (x, y) => (Math.abs(x) === 2 || y !== 3 ? lighten(secondary, 0.3) : null)).fill(-1, 2, 6, 1, 4, 6, PORTHOLE, VOXEL_GLASS);
          return;
        case 'sinter':
          model.fill(-5, 0, 7, 5, 6, 7, (_x, y) => (y >= 2 && y <= 4 ? 0x1a1e24 : primary));
          model.fill(-8, 0, 0, -7, 3, 2, secondary).fill(7, 0, 0, 8, 3, 2, secondary).fill(-5, 7, 0, 5, 7, 0, HAZARD);
          return;
        case 'vaultGlass':
          for (const [x, h] of [[-3, 11], [0, 14], [3, 12]] as const) model.fill(x, 7, 0, x, h, 0, glass, VOXEL_GLASS);
          model.fill(-4, 3, 7, 4, 3, 7, glow ?? glass, VOXEL_EMISSIVE);
          return;
      }
      return;
    case 'hood':
      switch (form) {
        case 'scrap':
          for (let x = -6; x <= 6; x += 2) model.remove(x, -4, 0).remove(x, -4, -4).remove(x + 1, -3, -6);
          model.fill(-4, 0, 5, 4, 2, 5, darken(secondary, 0.1));
          return;
        case 'iron':
          for (let angle = 0; angle < Math.PI * 2; angle += 0.1) model.set(Math.round(Math.cos(angle) * 8), 5, Math.round(Math.sin(angle) * 8), darken(primary, 0.1));
          model.fill(-3, 9, -3, 3, 10, 3, primary).fill(-2, 11, -2, 2, 12, 2, primary).fill(0, 13, 0, 0, 14, 0, lighten(primary, 0.1));
          return;
        case 'steel':
          model.fill(-4, 5, 6, -2, 6, 7, PORTHOLE, VOXEL_GLASS).fill(2, 5, 6, 4, 6, 7, PORTHOLE, VOXEL_GLASS).fill(-6, 5, 0, 6, 5, 0, (x) => (Math.abs(x) === 6 ? darken(secondary, 0.2) : null));
          model.fill(-2, 9, 3, 2, 12, 4, (x, y) => (Math.abs(x) <= 12 - y ? primary : null));
          return;
        case 'alloy':
          for (let angle = 0; angle < Math.PI * 2; angle += 0.1) model.set(Math.round(Math.cos(angle) * 7), 4, Math.round(Math.sin(angle) * 7), darken(primary, 0.15));
          for (const [x, z, length] of [[-6, 0, 6], [6, 1, 8], [-3, -6, 5], [3, -6, 7]] as const) model.fill(x, -4 - length, z, x, -4, z, darken(primary, 0.12));
          return;
        case 'sinter':
          model.fill(-8, 1, -1, -7, 4, 1, darken(secondary, 0.2)).fill(7, 1, -1, 8, 4, 1, darken(secondary, 0.2));
          for (let angle = 0; angle < Math.PI * 2; angle += 0.25) model.set(Math.round(Math.cos(angle) * 9), 7, Math.round(Math.sin(angle) * 9), glow ?? HAZARD, VOXEL_EMISSIVE);
          return;
        case 'vaultGlass':
          model.fill(-4, -1, 5, 4, 5, 5, VOID).set(-2, 3, 6, glow ?? glass, VOXEL_EMISSIVE).set(2, 3, 6, glow ?? glass, VOXEL_EMISSIVE);
          for (const [x, z] of [[-5, 0], [5, 0], [0, -5], [0, 5]] as const) model.set(x, 12, z, glass, VOXEL_GLASS);
          return;
      }
      return;
    case 'torso':
      switch (form) {
        case 'scrap':
          model.fill(-4, 6, 3, -1, 9, 3, lighten(primary, 0.12)).fill(-6, 1, 3, 6, 1, 3, ROPE).fill(2, -2, 3, 2, 0, 3, ROPE).fill(-9, -4, 0, -8, 4, 0, ROPE);
          model.remove(6, 13, 0).remove(5, 13, 0).remove(-6, 0, 1).remove(4, 0, 1);
          return;
        case 'iron':
          model.fill(-3, 13, -2, 3, 17, 1, (x, _y, z) => (Math.abs(x) === 3 || z === -2 || z === 1 ? darken(primary, 0.1) : null));
          model.fill(-8, -2, -1, 8, 0, 1, darken(primary, 0.1));
          for (let x = -5; x <= 5; x += 2) model.set(x, 9, 3, lighten(primary, 0.3)).set(x, 4, 3, lighten(primary, 0.3));
          model.fill(-1, 0, 3, 1, 1, 4, lighten(secondary, 0.3));
          return;
        case 'steel':
          for (let x = -3; x <= 3; x++) model.set(x, 11 - Math.abs(x), 4, lighten(primary, 0.3));
          model.fill(-6, -4, 2, -1, -1, 2, darken(primary, 0.05)).fill(1, -4, 2, 6, -1, 2, darken(primary, 0.05)).fill(-9, -3, 2, -7, -1, 2, darken(primary, 0.1)).fill(7, -3, 2, 9, -1, 2, darken(primary, 0.1));
          return;
        case 'alloy':
          model.fill(0, 0, 3, 0, 13, 3, lighten(primary, 0.2)).fill(2, 5, 3, 4, 7, 3, lighten(secondary, 0.3)).set(3, 6, 3, PORTHOLE, VOXEL_GLASS);
          for (let i = 0; i <= 3; i++) model.fill(-9 - i, 10 + i, -1, -9 - i, 10 + i, 1, primary).fill(9 + i, 10 + i, -1, 9 + i, 10 + i, 1, primary);
          return;
        case 'sinter':
          for (const x of [-3, 3]) for (let y = 0; y <= 12; y++) model.remove(x, y, 1).remove(x, y, 2);
          model.fill(-11, 11, -1, -7, 15, 1, (_x, y) => (y === 15 ? HAZARD : primary)).fill(7, 11, -1, 11, 15, 1, (_x, y) => (y === 15 ? HAZARD : primary)).set(0, 7, 3, glow ?? HAZARD, VOXEL_EMISSIVE);
          for (let x = -1; x <= 1; x++) for (let y = -6; y <= 3; y++) for (let z = -3; z <= 3; z++) model.remove(x, y, z);
          return;
        case 'vaultGlass':
          model.fill(-3, 4, 3, 3, 9, 3, (x) => (x === 0 ? glow ?? glass : glass), VOXEL_GLASS);
          for (const x of [-6, -5, 5, 6]) model.fill(x, 14, 0, x, Math.abs(x) === 6 ? 19 : 17, 0, glass, VOXEL_GLASS);
          for (let x = -7; x <= 7; x++) for (let z = -3; z <= 3; z++) if (z !== 3) model.remove(x, Math.round(6 + x * 0.4), z);
          return;
      }
      return;
    case 'gloves':
      for (const offset of [-5, 2]) {
        switch (form) {
          case 'scrap':
            if (offset > 0) for (let y = 7; y <= 9; y++) for (let x = offset; x <= offset + 3; x++) model.remove(x, y, 0).remove(x, y, -1);
            else model.fill(offset - 1, 3, -2, offset + 4, 6, 2, ROPE);
            break;
          case 'iron':
            model.fill(offset - 2, -2, -2, offset + 5, 0, 2, darken(primary, 0.1));
            break;
          case 'steel':
            model.fill(offset + 4, 0, 0, offset + 4, 4, 0, lighten(primary, 0.15)).fill(offset + 5, -1, 0, offset + 5, 1, 0, lighten(primary, 0.2));
            break;
          case 'alloy':
            model.fill(offset - 1, 1, -2, offset + 4, 1, 2, lighten(secondary, 0.3));
            for (let x = offset; x <= offset + 3; x++) model.remove(x, 9, -1).remove(x, 9, 0).remove(x, 8, -1);
            break;
          case 'sinter':
            model.fill(offset - 1, -2, -2, offset + 4, 1, 2, (_x, y) => (y === 1 ? HAZARD : primary));
            break;
          case 'vaultGlass':
            for (let x = offset; x <= offset + 3; x++) model.set(x, 10, 0, glass, VOXEL_GLASS);
            model.fill(offset - 1, 1, 0, offset - 1, 5, 0, glass, VOXEL_GLASS);
            break;
        }
      }
      return;
    case 'trousers':
      for (const x0 of [-5, 1]) {
        switch (form) {
          case 'scrap':
            model.fill(x0 + 1, 5, 2, x0 + 3, 7, 3, lighten(primary, 0.1)).fill(x0, 1, 2, x0 + 3, 1, 2, ROPE);
            break;
          case 'iron':
            model.fill(x0 - 1, 0, -3, x0 + 4, 1, 2, (x, _y, z) => (x < x0 || x > x0 + 3 || z === -3 || z === 2 ? darken(primary, 0.1) : null));
            model.fill(x0 < 0 ? x0 - 2 : x0 + 4, 7, 0, x0 < 0 ? x0 - 1 : x0 + 5, 9, 0, lighten(secondary, 0.3));
            break;
          case 'steel':
            model.fill(x0 + 1, 6, 3, x0 + 2, 7, 4, lighten(primary, 0.2)).fill(x0 < 0 ? x0 - 4 : x0 + 4, 6, -1, x0 < 0 ? x0 - 1 : x0 + 7, 9, 0, (x, y) => (Math.abs(y - 7.5) + Math.abs(x - (x0 < 0 ? x0 - 2.5 : x0 + 5.5)) <= 3 ? darken(primary, 0.1) : null));
            break;
          case 'alloy':
            model.fill(x0 - 3, -4, -2, x0 + 6, -3, 1, primary).fill(x0 - 2, -2, -2, x0 + 5, -1, 1, primary);
            break;
          case 'sinter':
            for (let x = x0 - 3; x <= x0 + 6; x++) for (let z = -4; z <= 4; z++) model.remove(x, 6, z).remove(x, 5, z);
            model.fill(x0, 7, 2, x0 + 3, 10, 2, lighten(primary, 0.1)).fill(x0, 2, 2, x0 + 3, 5, 2, lighten(primary, 0.1));
            break;
          case 'vaultGlass':
            model.fill(x0 + 1, 6, 3, x0 + 2, 6, 5, glass, VOXEL_GLASS).fill(x0 < 0 ? x0 - 4 : x0 + 5, 4, 0, x0 < 0 ? x0 - 1 : x0 + 8, 5, 0, glass, VOXEL_GLASS);
            break;
        }
      }
      return;
    case 'boots':
      for (const x0 of [-5, 1]) {
        switch (form) {
          case 'scrap':
            if (x0 < 0) model.fill(x0, 1, 5, x0 + 3, 2, 5, darken(primary, 0.1));
            else for (let y = 6; y <= 9; y++) for (let x = x0; x <= x0 + 3; x++) model.remove(x, y, -3).remove(x, y, 0);
            break;
          case 'iron':
            model.fill(x0, 1, 5, x0 + 3, 3, 5, primary).fill(x0, 4, 1, x0 + 3, 4, 1, lighten(secondary, 0.3));
            break;
          case 'steel':
            model.fill(x0 + 1, 1, 5, x0 + 2, 1, 6, lighten(primary, 0.2));
            for (let y = 2; y <= 8; y += 2) model.fill(x0, y, 1, x0 + 3, y, 1, darken(primary, 0.15));
            break;
          case 'alloy':
            model.fill(x0 - 1, -1, -4, x0 + 4, 0, 5, darken(secondary, 0.2));
            break;
          case 'sinter':
            model.fill(x0, -2, -3, x0 + 3, 0, 4, (_x, y, z) => (y === -2 ? darken(secondary, 0.4) : z === 4 ? HAZARD : z % 2 === 0 ? darken(primary, 0.1) : primary));
            break;
          case 'vaultGlass':
            model.fill(x0 + 1, 2, -4, x0 + 2, 2, -6, glass, VOXEL_GLASS).set(x0 + 1, 1, 5, glass, VOXEL_GLASS);
            break;
        }
      }
      return;
    case 'shield':
      switch (form) {
        case 'scrap':
          for (let y = 0; y <= 16; y++) for (let z = -2; z <= 2; z++) model.remove(2, y, z);
          for (let x = -6; x <= 6; x += 2) for (let z = -2; z <= 2; z++) model.remove(x, 14, z);
          return;
        case 'iron':
          model.fill(-6, 0, 0, 6, 3, 0, primary).fill(-7, 0, 0, 7, 14, 0, (x) => (Math.abs(x) === 7 ? darken(secondary, 0.1) : null));
          return;
        case 'steel':
          model.fill(0, -4, 0, 0, -1, 0, primary).fill(-1, -2, 0, 1, -1, 0, primary).fill(0, 1, 1, 0, 13, 1, lighten(primary, 0.2));
          return;
        case 'alloy':
          for (let x = -8; x <= 8; x++) for (let y = -2; y <= 16; y++) for (let z = -2; z <= 2; z++) if (Math.hypot(x, y - 7) > 7.2) model.remove(x, y, z);
          for (let x = -2; x <= 2; x++) for (let y = 5; y <= 9; y++) if (Math.hypot(x, y - 7) <= 1.5) model.remove(x, y, 0).remove(x, y, -1);
          return;
        case 'sinter':
          model.fill(-6, 0, 0, 6, 15, 0, (x, y) => (y >= 10 && y <= 11 && Math.abs(x) <= 4 ? null : Math.abs(x) === 6 || y === 15 ? HAZARD : primary));
          for (let x = -4; x <= 4; x++) for (let y = 10; y <= 11; y++) model.remove(x, y, -1);
          return;
        case 'vaultGlass':
          for (let x = -7; x <= 7; x++) for (let y = -1; y <= 15; y++) for (let z = -2; z <= 2; z++) if (Math.abs(x - y + 4) <= 1) model.remove(x, y, z);
          model.fill(-9, 13, 0, -8, 16, 0, glass, VOXEL_GLASS);
          return;
      }
      return;
    case 'cape':
      switch (form) {
        case 'scrap':
          for (let x = -8; x <= 8; x++) for (let y = -1; y <= 5; y++) for (let z = -2; z <= 4; z++) if (y < 2 + (Math.abs(x) % 3)) model.remove(x, y, z);
          return;
        case 'iron':
          model.fill(-3, 14, 0, 3, 17, 1, (x, y) => (Math.abs(x) === 3 || y === 17 ? darken(primary, 0.1) : primary));
          return;
        case 'steel':
          for (let x = -1; x <= 1; x++) for (let y = 0; y <= 12; y++) for (let z = -2; z <= 4; z++) model.remove(x, y, z);
          return;
        case 'alloy':
          for (const x of [-7, -4, 3, 6]) model.fill(x, -5, 1, x, 0, 1, darken(primary, 0.12));
          return;
        case 'sinter':
          model.fill(-9, 12, -1, 9, 14, 1, (x, y) => (y === 14 || Math.abs(x) === 9 ? HAZARD : primary));
          return;
        case 'vaultGlass':
          for (let x = -8; x <= 8; x++) for (let y = -1; y <= 4; y++) for (let z = -2; z <= 4; z++) model.remove(x, y, z);
          for (const [x, y] of [[-5, 2], [-1, 0], [3, 1], [6, 3]] as const) model.fill(x, y, 0, x + 1, y + 1, 0, glass, VOXEL_GLASS);
          return;
      }
      return;
    case 'pack':
      switch (form) {
        case 'scrap':
          model.fill(-5, 12, 0, 5, 12, 0, ROPE).remove(4, 0, 0).remove(-3, 1, 0).remove(5, 2, 0);
          return;
        case 'iron':
          model.fill(-5, 0, 3, 5, 0, 3, darken(secondary, 0.2)).fill(-5, 0, 3, -5, 11, 3, darken(secondary, 0.2)).fill(5, 0, 3, 5, 11, 3, darken(secondary, 0.2));
          return;
        case 'steel':
          model.fill(0, 0, 3, 0, 12, 3, lighten(primary, 0.2)).fill(-6, 5, 0, -6, 8, 2, ROPE);
          return;
        case 'alloy':
          model.fill(-2, 1, 4, 2, 10, 4, (x, y) => (Math.abs(x) === 2 || y === 10 ? darken(primary, 0.1) : lighten(primary, 0.1))).set(0, 11, 4, lighten(secondary, 0.2)).set(0, 5, 5, PORTHOLE, VOXEL_GLASS);
          return;
        case 'sinter':
          model.fill(-2, 5, 4, 2, 8, 4, (x, y) => (x === 0 && (y === 6 || y === 7) ? glow ?? HAZARD : HAZARD), VOXEL_EMISSIVE);
          return;
        case 'vaultGlass':
          for (const [x, y, z] of [[-7, 13, 0], [7, 11, 1], [0, 16, 0], [-4, 15, 2]] as const) model.set(x, y, z, glass, VOXEL_GLASS);
          return;
      }
      return;
    case 'melee':
      switch (form) {
        case 'scrap':
          model.fill(hx - 4, hy - 4, 1, hx - 3, hy - 3, 1, ROPE).fill(hx + 1, hy + 1, 0, hx + 2, hy + 1, 0, darken(primary, 0.2));
          if (shape === 'blade') for (let x = -2; x <= 6; x += 2) model.remove(x, x + 6, 0);
          return;
        case 'iron':
          for (const [dx, dy] of [[-2, 1], [1, -2], [-1, 2], [2, -1]] as const) model.fill(hx + dx, hy + dy, -1, hx + dx, hy + dy, 1, darken(primary, 0.1));
          return;
        case 'steel':
          model.fill(hx - 9, hy - 6, 0, hx - 6, hy - 9, 0, lighten(secondary, 0.1));
          for (let i = -2; i <= 2; i++) model.set(hx - 8 + i, hy - 8 - i, 0, lighten(secondary, 0.15));
          model.set(hx + 2, hy + 2, 0, lighten(primary, 0.3));
          return;
        case 'alloy':
          model.fill(hx + 1, hy + 1, 0, hx + 1, hy + 3, 0, primary).fill(hx - 1, hy + 3, 0, hx, hy + 3, 0, lighten(primary, 0.2));
          return;
        case 'sinter':
          model.fill(hx - 8, hy - 9, -1, hx - 6, hy - 7, 1, HAZARD);
          for (let i = 0; i <= 4; i++) model.set(hx - i, hy - i + 1, 1, glow ?? HAZARD, VOXEL_EMISSIVE);
          return;
        case 'vaultGlass':
          model.remove(hx, hy, 0).remove(hx - 1, hy - 1, 0);
          for (const [dx, dy, dz] of [[2, 3, 0], [-3, 2, 1], [3, -1, -1]] as const) model.set(hx + dx, hy + dy, dz, glass, VOXEL_GLASS);
          return;
      }
      return;
    case 'ranged':
      switch (form) {
        case 'scrap':
          model.fill(-4, my + 2, 0, mx - 3, my + 2, 0, darken(secondary, 0.15)).set(-1, my, 2, ROPE).set(3, my, 2, ROPE);
          return;
        case 'iron':
          model.fill(-6, -1, 0, -2, -1, 0, darken(primary, 0.2)).fill(-6, 0, 0, -6, 1, 0, darken(primary, 0.2));
          model.fill(0, my - 1, -2, 2, my + 1, 2, darken(primary, 0.1));
          return;
        case 'steel':
          model.fill(-6, my + 3, 0, mx - 4, my + 3, 0, darken(primary, 0.3)).fill(0, my - 4, -1, 1, my - 1, 1, darken(primary, 0.35));
          return;
        case 'alloy':
          model.fill(mx + 1, my - 2, -2, mx + 1, my + 2, 2, (_x, y, z) => (Math.abs(y - my) === 2 || Math.abs(z) === 2 ? lighten(primary, 0.15) : null));
          return;
        case 'sinter':
          model.fill(-2, my + 2, -1, 3, my + 4, 1, (_x, y) => (y === my + 4 ? glow ?? HAZARD : primary)).fill(mx - 2, my, 2, mx - 1, my, 2, HAZARD);
          return;
        case 'vaultGlass':
          for (let x = mx - 3; x <= mx; x += 2) model.remove(x, my, 0);
          for (const [dx, dy] of [[0, 3], [-4, -2], [2, -3]] as const) model.set(mx + dx, my + dy, 0, glass, VOXEL_GLASS);
          model.set(mx + 2, my, 0, glow ?? glass, VOXEL_EMISSIVE);
          return;
      }
      return;
    case 'psionic':
      switch (form) {
        case 'scrap':
          model.fill(-2, top - 7, -2, 2, top - 2, 2, (x, _y, z) => (Math.abs(x) === 2 || Math.abs(z) === 2 ? 0x9ab0a8 : null), VOXEL_GLASS);
          model.fill(-2, top - 1, -2, 2, top - 1, 2, ROPE);
          return;
        case 'iron':
          for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as const) model.fill(x, top - 6, z, x, top, z, primary);
          return;
        case 'steel':
          for (const x of [-2, 2]) model.fill(x, top - 2, 0, x, top + 3, 0, lighten(primary, 0.15));
          return;
        case 'alloy':
          for (let angle = 0; angle <= Math.PI; angle += 0.15) model.set(Math.round(Math.cos(angle) * 6), top + Math.round(Math.sin(angle) * 4), 0, lighten(secondary, 0.25));
          return;
        case 'sinter':
          model.fill(-4, top - 5, -4, 4, top - 5, 4, (x, _y, z) => (Math.max(Math.abs(x), Math.abs(z)) === 4 ? primary : null)).fill(-4, top - 1, -4, 4, top - 1, 4, (x, _y, z) => (Math.max(Math.abs(x), Math.abs(z)) === 4 ? HAZARD : null));
          return;
        case 'vaultGlass':
          for (let y = top - 2; y <= top; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) model.remove(x, y, z);
          for (const [x, y, z] of [[0, top + 3, 0], [3, top + 1, 0], [-3, top, 1], [0, top + 1, -3], [1, top + 5, 0]] as const) model.set(x, y, z, glow ?? glass, x === 0 ? VOXEL_EMISSIVE : VOXEL_GLASS);
          return;
      }
      return;
    case 'other':
      return;
  }
}
