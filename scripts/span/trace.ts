import type { TilePoint } from '../../packages/shared/src/world/geometry.ts';

export function maskPolygon(width: number, height: number, inside: (x: number, y: number) => boolean, offsetX = 0, offsetY = 0): TilePoint[] {
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
