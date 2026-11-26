import { VOXEL_EMISSIVE, VOXEL_SOLID, type VoxelKind } from '../voxel/voxelKinds.ts';

export type VoxelPut = (vx: number, y: number, vz: number, color: number, kind?: VoxelKind) => void;

export const PROP = {
  mast: 0x4d565c,
  aerial: 0x7a848a,
  aerialTip: 0xff3030,
  unit: 0xa0a6a9,
  unitDark: 0x7d8487,
  fan: 0x202528,
  tank: 0x4d6470,
  tankBand: 0x3f535d,
  tankCap: 0x5f7b87,
  vent: 0x8c9397,
  ventSlot: 0x2b3034,
} as const;

const even = (value: number): boolean => ((value % 2) + 2) % 2 === 0;

export function fillBox(put: VoxelPut, x: number, z: number, width: number, depth: number, y: number, height: number, color: (vx: number, vy: number, vz: number) => number, kind: VoxelKind = VOXEL_SOLID): void {
  for (let vy = y; vy < y + height; vy++) {
    for (let vz = z; vz < z + depth; vz++) {
      for (let vx = x; vx < x + width; vx++) put(vx, vy, vz, color(vx, vy, vz), kind);
    }
  }
}

export function airUnit(put: VoxelPut, x: number, z: number, y: number): void {
  fillBox(put, x, z, 5, 4, y, 3, (vx, vy, vz) => (vz === z + 3 ? PROP.unitDark : PROP.unit));
  fillBox(put, x + 1, z + 1, 3, 2, y + 3, 1, (vx) => (vx === x + 2 ? PROP.fan : PROP.unitDark));
}

export function waterTank(put: VoxelPut, x: number, z: number, y: number): void {
  for (const [dx, dz] of [[0, 0], [5, 0], [0, 5], [5, 5]] as const) fillBox(put, x + dx, z + dz, 1, 1, y, 2, () => PROP.mast);
  const cx = x + 2.5;
  const cz = z + 2.5;
  for (let vz = z - 1; vz <= z + 6; vz++) {
    for (let vx = x - 1; vx <= x + 6; vx++) {
      if ((vx - cx) ** 2 + (vz - cz) ** 2 > 13) continue;
      for (let h = 0; h < 6; h++) put(vx, y + 2 + h, vz, h === 5 ? PROP.tankCap : h === 2 ? PROP.tankBand : PROP.tank);
    }
  }
}

export function aerial(put: VoxelPut, x: number, z: number, y: number, height: number, lit: boolean): void {
  fillBox(put, x - 1, z - 1, 3, 3, y, 1, () => PROP.mast);
  fillBox(put, x, z, 1, 1, y + 1, height - 1, () => PROP.aerial);
  fillBox(put, x - 2, z, 5, 1, y + Math.floor(height * 0.65), 1, () => PROP.aerial);
  put(x, y + height, z, lit ? PROP.aerialTip : PROP.aerial, lit ? VOXEL_EMISSIVE : VOXEL_SOLID);
}

export function vent(put: VoxelPut, x: number, z: number, y: number): void {
  fillBox(put, x, z, 6, 4, y, 2, () => PROP.vent);
  fillBox(put, x, z, 6, 4, y + 2, 1, (vx, vy, vz) => (even(vz - z) ? PROP.vent : PROP.ventSlot));
}
