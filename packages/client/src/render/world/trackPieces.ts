import type { TileLayout } from '@containment/shared';

export type TrackSide = 'north' | 'south' | 'east' | 'west';

export type TrackPiece =
  | { readonly kind: 'straight'; readonly axis: 'x' | 'y' }
  | { readonly kind: 'block'; readonly x: number; readonly y: number; readonly open: ReadonlySet<TrackSide> };

export type TrackMark = 'rail' | 'sleeper' | null;

export const TRACK_RAMP_REACH = 2;

const BLOCK = 2;

const isTrack = (layout: TileLayout, x: number, y: number): boolean => layout.tileAt({ x, y }) === 'track';

function sideState(layout: TileLayout, tiles: readonly (readonly [number, number])[]): 'open' | 'closed' | 'mixed' {
  const count = tiles.filter(([x, y]) => isTrack(layout, x, y)).length;
  return count === tiles.length ? 'open' : count === 0 ? 'closed' : 'mixed';
}

function blockAt(layout: TileLayout, x: number, y: number): ReadonlySet<TrackSide> | undefined {
  for (let dy = 0; dy < BLOCK; dy++) for (let dx = 0; dx < BLOCK; dx++) if (!isTrack(layout, x + dx, y + dy)) return undefined;
  const sides: [TrackSide, (readonly [number, number])[]][] = [
    ['north', [[x, y - 1], [x + 1, y - 1]]],
    ['south', [[x, y + BLOCK], [x + 1, y + BLOCK]]],
    ['west', [[x - 1, y], [x - 1, y + 1]]],
    ['east', [[x + BLOCK, y], [x + BLOCK, y + 1]]],
  ];
  const open = new Set<TrackSide>();
  for (const [side, tiles] of sides) {
    const state = sideState(layout, tiles);
    if (state === 'mixed') return undefined;
    if (state === 'open') open.add(side);
  }
  const turns = (open.has('north') || open.has('south')) && (open.has('east') || open.has('west'));
  return turns ? open : undefined;
}

function straightAxis(layout: TileLayout, tx: number, ty: number): 'x' | 'y' {
  const run = (dx: number, dy: number): number => {
    let length = 0;
    while (length < 8 && isTrack(layout, tx + dx * (length + 1), ty + dy * (length + 1))) length++;
    return length;
  };
  return run(1, 0) + run(-1, 0) >= run(0, 1) + run(0, -1) ? 'x' : 'y';
}

export function trackPieceAt(layout: TileLayout, tx: number, ty: number): TrackPiece {
  for (let by = ty - 1; by <= ty; by++) {
    for (let bx = tx - 1; bx <= tx; bx++) {
      const open = blockAt(layout, bx, by);
      if (open) return { kind: 'block', x: bx, y: by, open };
    }
  }
  return { kind: 'straight', axis: straightAxis(layout, tx, ty) };
}

export function laneMark(along: number, across: number, resolution: number): TrackMark {
  const offset = Math.abs(across - resolution / 2);
  if (Math.abs(offset - 1.5) <= 0.5) return 'rail';
  if (offset <= 2.5 && Math.floor(along) % 4 === 1) return 'sleeper';
  return null;
}

const strongest = (marks: readonly TrackMark[]): TrackMark => (marks.includes('rail') ? 'rail' : marks.includes('sleeper') ? 'sleeper' : null);

export function blockMark(open: ReadonlySet<TrackSide>, px: number, pz: number, resolution: number): TrackMark {
  const size = BLOCK * resolution;
  const lane = (value: number): number => value % resolution;
  const marks: TrackMark[] = [];
  if (open.has('west') && open.has('east')) marks.push(laneMark(px, lane(pz), resolution));
  if (open.has('north') && open.has('south')) marks.push(laneMark(pz, lane(px), resolution));
  const corners: [TrackSide, TrackSide, number, number][] = [
    ['north', 'west', 0, 0],
    ['north', 'east', size, 0],
    ['south', 'west', 0, size],
    ['south', 'east', size, size],
  ];
  for (const [a, b, cx, cz] of corners) {
    if (!open.has(a) || !open.has(b)) continue;
    const distance = Math.hypot(px - cx, pz - cz);
    const radius = distance < resolution ? resolution / 2 : resolution * 1.5;
    const angle = Math.atan2(Math.abs(pz - cz), Math.abs(px - cx));
    if (Math.abs(distance - radius) > resolution / 2) continue;
    marks.push(laneMark(radius * angle, distance - radius + resolution / 2, resolution));
  }
  return strongest(marks);
}

export function trackRise(layout: TileLayout, tx: number, ty: number, axis: 'x' | 'y'): (u: number) => number {
  const here = layout.heightAt({ x: tx, y: ty });
  const dx = axis === 'x' ? 1 : 0;
  const dy = axis === 'y' ? 1 : 0;
  const boundary = (sign: number): { at: number; rise: number } | undefined => {
    for (let k = 1; k <= TRACK_RAMP_REACH + 1; k++) {
      const x = tx + dx * sign * k;
      const y = ty + dy * sign * k;
      if (!isTrack(layout, x, y)) return undefined;
      const there = layout.heightAt({ x, y });
      if (there !== here) return { at: k - 0.5, rise: there - here };
    }
    return undefined;
  };
  const ahead = boundary(1);
  const behind = boundary(-1);
  const share = (distance: number, edge: { at: number; rise: number } | undefined): number =>
    edge ? edge.rise * Math.max(0, (distance - edge.at + TRACK_RAMP_REACH) / (2 * TRACK_RAMP_REACH)) : 0;
  return (u) => share(u, ahead) + share(-u, behind);
}
