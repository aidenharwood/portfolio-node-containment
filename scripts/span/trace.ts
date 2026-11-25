import type { TilePoint } from '../../packages/shared/src/world/geometry.ts';

export function maskLoops(width: number, height: number, inside: (x: number, y: number) => boolean): TilePoint[][] {
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && inside(x, y);
  const outgoing = new Map<number, number[]>();
  const W = width + 1;
  const key = (x: number, y: number): number => y * W + x;
  const add = (ax: number, ay: number, bx: number, by: number): void => {
    const from = key(ax, ay);
    const list = outgoing.get(from);
    if (list) list.push(key(bx, by));
    else outgoing.set(from, [key(bx, by)]);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y);
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const loops: TilePoint[][] = [];
  const starts = [...outgoing.keys()].sort((a, b) => a - b);
  for (const start of starts) {
    while ((outgoing.get(start)?.length ?? 0) > 0) {
      const loop: TilePoint[] = [];
      let here = start;
      for (;;) {
        loop.push({ x: here % W, y: Math.floor(here / W) });
        const list = outgoing.get(here)!;
        const next = list.pop()!;
        if (list.length === 0) outgoing.delete(here);
        here = next;
        if (here === start && !(outgoing.get(here)?.length)) break;
        if (here === start) break;
      }
      loops.push(simplify(loop));
    }
  }
  return loops;
}

export function joinLoops(loops: readonly (readonly TilePoint[])[], offsetX = 0, offsetY = 0): TilePoint[] {
  if (loops.length === 0) return [];
  const anchor = loops[0]![0]!;
  const points: TilePoint[] = [...loops[0]!, anchor];
  for (const loop of loops.slice(1)) {
    const first = loop[0]!;
    const corner = { x: anchor.x, y: first.y };
    points.push(corner, ...loop, first, corner, anchor);
  }
  return simplify(points).map((point) => ({ x: point.x + offsetX, y: point.y + offsetY }));
}

export function maskPolygon(width: number, height: number, inside: (x: number, y: number) => boolean, offsetX = 0, offsetY = 0): TilePoint[] {
  return joinLoops(maskLoops(width, height, inside), offsetX, offsetY);
}

const offLine = (point: TilePoint, a: TilePoint, b: TilePoint): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  return Math.abs(dy * (point.x - a.x) - dx * (point.y - a.y)) / length;
};

function reduce(points: readonly TilePoint[], from: number, to: number, tolerance: number, keep: Uint8Array): void {
  let farthest = -1;
  let distance = tolerance;
  for (let index = from + 1; index < to; index++) {
    const off = offLine(points[index]!, points[from]!, points[to]!);
    if (off > distance) {
      distance = off;
      farthest = index;
    }
  }
  if (farthest < 0) return;
  keep[farthest] = 1;
  reduce(points, from, farthest, tolerance, keep);
  reduce(points, farthest, to, tolerance, keep);
}

export function smoothLoop(loop: readonly TilePoint[], tolerance: number): TilePoint[] {
  if (loop.length < 8) return [...loop];
  const first = loop[0]!;
  let far = 0;
  for (let index = 1; index < loop.length; index++) {
    if (Math.hypot(loop[index]!.x - first.x, loop[index]!.y - first.y) > Math.hypot(loop[far]!.x - first.x, loop[far]!.y - first.y)) far = index;
  }
  const closed = [...loop, first];
  const keep = new Uint8Array(closed.length);
  keep[0] = 1;
  keep[far] = 1;
  keep[closed.length - 1] = 1;
  reduce(closed, 0, far, tolerance, keep);
  reduce(closed, far, closed.length - 1, tolerance, keep);
  const out = closed.filter((_, index) => keep[index] === 1);
  out.pop();
  return out.length >= 3 ? out : [...loop];
}

function simplify(points: readonly TilePoint[]): TilePoint[] {
  const out: TilePoint[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    const before = out[out.length - 2];
    if (before && last && ((before.x === last.x && last.x === point.x) || (before.y === last.y && last.y === point.y))) {
      const sameDirection = (before.x === last.x ? Math.sign(last.y - before.y) === Math.sign(point.y - last.y) : Math.sign(last.x - before.x) === Math.sign(point.x - last.x));
      if (sameDirection) {
        out[out.length - 1] = point;
        continue;
      }
    }
    out.push(point);
  }
  return out;
}
