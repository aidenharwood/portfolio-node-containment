import type { GearForm } from '@containment/shared';
import type { VoxelKind } from './voxelKinds.ts';
import { VoxelModel } from './voxelModel.ts';

type Axis = 0 | 1 | 2;

export interface ReshapeAxes {
  readonly width: Axis;
  readonly length: Axis;
  readonly depth: Axis;
  readonly anchorLength?: number;
}

export const ICON_AXES: ReshapeAxes = { width: 0, length: 1, depth: 2 };

export const HELD_AXES: ReshapeAxes = { width: 1, length: 2, depth: 0, anchorLength: 1 };

type Point = [number, number, number];

const span = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let value = Math.min(from, to); value <= Math.max(from, to); value++) out.push(value);
  return out;
};

export function reshapeForForm(model: VoxelModel, form: GearForm, axes: ReshapeAxes = ICON_AXES): VoxelModel {
  const cells = model.cells();
  if (cells.length === 0) return model;
  const coord = (cell: { x: number; y: number; z: number }): Point => [cell.x, cell.y, cell.z];
  const min: Point = [Infinity, Infinity, Infinity];
  const max: Point = [-Infinity, -Infinity, -Infinity];
  for (const cell of cells) {
    const point = coord(cell);
    for (const axis of [0, 1, 2] as const) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  }
  const { width: w, length: l, depth: d } = axes;
  const centre = (axis: Axis) => (min[axis] + max[axis]) / 2;
  const cw = centre(w);
  const cl = axes.anchorLength ?? centre(l);
  const cd = centre(d);
  const extent = Math.max(1, max[l] - min[l]);
  const mid = centre(l);
  const out = new VoxelModel();
  const place = (point: Point, color: number, kind: VoxelKind) => out.set(point[0], point[1], point[2], color, kind);
  for (const cell of cells) {
    const p = coord(cell);
    const targets: Point[] = [];
    const at = (wv: number, lv: number, dv: number): Point => {
      const point: Point = [0, 0, 0];
      point[w] = wv;
      point[l] = lv;
      point[d] = dv;
      return point;
    };
    switch (form) {
      case 'scrap': {
        const leanW = p[w] > cw && p[l] > mid ? 1 : 0;
        const sag = p[w] < cw && p[l] > mid ? -1 : 0;
        targets.push(at(p[w] + leanW, p[l] + sag, p[d]));
        break;
      }
      case 'ferro': {
        const lv = Math.round(cl + (p[l] - cl) * 0.85);
        for (const wv of span(Math.round(cw + (p[w] - cw) * 1.3), Math.round(cw + (p[w] + Math.sign(p[w] - cw || 1) - cw) * 1.3) - Math.sign(p[w] - cw || 1))) targets.push(at(wv, lv, p[d]));
        break;
      }
      case 'plasteel': {
        const taper = 1 - 0.22 * ((p[l] - min[l]) / extent);
        const wv = Math.round(cw + (p[w] - cw) * taper);
        for (const lv of span(Math.round(cl + (p[l] - cl) * 1.25), Math.round(cl + (p[l] + 1 - cl) * 1.25) - 1)) targets.push(at(wv, lv, p[d]));
        break;
      }
      case 'duralloy': {
        const rw = Math.max(1, (max[w] - min[w]) / 2 + 0.5);
        const rl = Math.max(1, (max[l] - min[l]) / 2 + 0.5);
        const u = (p[w] - cw) / rw;
        const v = (p[l] - mid) / rl;
        if (u * u + v * v > 1.02 && Math.abs(u) > 0.5 && Math.abs(v) > 0.5) break;
        targets.push(at(p[w], p[l], p[d]));
        if (p[d] >= cd) targets.push(at(p[w], p[l], p[d] + 1));
        break;
      }
      case 'sinter': {
        const out1 = p[d] === max[d] ? 1 : p[d] === min[d] ? -1 : 0;
        targets.push(at(p[w], p[l], p[d]));
        if (out1 !== 0) targets.push(at(p[w], p[l], p[d] + out1));
        if (Math.abs(p[w] - cw) >= (max[w] - min[w]) / 2 - 0.5) targets.push(at(p[w] + Math.sign(p[w] - cw || 1), p[l], p[d]));
        break;
      }
      case 'vaultGlass': {
        const lift = p[l] > mid + 1 ? 2 : 0;
        const split = p[w] > cw + 1 ? 1 : 0;
        targets.push(at(p[w] + split, p[l] + lift, p[d]));
        break;
      }
    }
    for (const target of targets) place(target, cell.color, cell.kind);
  }
  return out;
}
