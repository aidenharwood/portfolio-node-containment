import { valueNoise } from '../../packages/shared/src/world/noise.ts';
import { codeAt, COLUMNS, HEIGHT, MASSIF, random, ROWS, SQUARE, WIDTH } from './atlas.ts';
import { isLandCode, isLandTile, nearPad, nearRail, nearSeam } from './plan.ts';

export interface Spur {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly length: number;
  readonly width: number;
}

export const SPINDLE = { x: 477, y: 419 } as const;
export const GAP = { from: -30, to: 16, fade: 6, below: SPINDLE.y + 120 } as const;

const BAND = 1;
const BAND_SWAY = 15;
const BAND_RIPPLE = 0.8;
const SPUR_GAP = [12, 22] as const;
const SPUR_TURN = 0.45;
const SPUR_INSET = 3;
const SPUR_WOBBLE = 1.1;
const SPUR_SEAM = 10;
const PAD_KEEP = 6;
const RAIL_KEEP = 5;
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

const isMassifSquare = (column: number, row: number): boolean => codeAt(column, row) === MASSIF;

const lobe = (noise: number): number => {
  const t = Math.min(1, Math.max(0, (noise - 0.4) / 0.5));
  return t * t * (3 - 2 * t);
};

export function gapShare(x: number, y: number): number {
  if (y < GAP.below) return 0;
  const bearing = (Math.atan2(x - SPINDLE.x, y - SPINDLE.y) * 180) / Math.PI;
  const inside = Math.min(bearing - GAP.from, GAP.to - bearing);
  return inside <= 0 ? 0 : Math.min(1, inside / GAP.fade);
}

export function massifSpurs(): Spur[] {
  const spurs: Spur[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      if (!isMassifSquare(column, row)) continue;
      for (const [dc, dr] of SIDES) {
        const beyond = codeAt(column + dc, row + dr);
        if (!isLandCode(beyond) || beyond === MASSIF) continue;
        const next = random(column * 977 + row * 131 + (dc + 2) * 17 + (dr + 2) * 5);
        for (let along = 5 + next() * 10; along < SQUARE - 5; along += SPUR_GAP[0] + next() * (SPUR_GAP[1] - SPUR_GAP[0])) {
          const turn = (next() - 0.5) * 2 * SPUR_TURN;
          const long = next() < 0.55;
          const length = long ? 15 + next() * 14 : 6 + next() * 5;
          const width = long ? 3 + next() * 2.5 : 5 + next() * 4;
          const edgeX = dc === 0 ? column * SQUARE + along : (dc > 0 ? column + 1 : column) * SQUARE;
          const edgeY = dr === 0 ? row * SQUARE + along : (dr > 0 ? row + 1 : row) * SQUARE;
          spurs.push({
            x: edgeX - dc * SPUR_INSET,
            y: edgeY - dr * SPUR_INSET,
            dx: dc * Math.cos(turn) - dr * Math.sin(turn),
            dy: dc * Math.sin(turn) + dr * Math.cos(turn),
            length: length + SPUR_INSET,
            width,
          });
        }
      }
    }
  }
  return spurs;
}

function squareDistance(x: number, y: number): number {
  const column = Math.floor(x / SQUARE);
  const row = Math.floor(y / SQUARE);
  if (isMassifSquare(column, row)) return 0;
  let best = Infinity;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!isMassifSquare(column + dc, row + dr)) continue;
      const left = (column + dc) * SQUARE;
      const top = (row + dr) * SQUARE;
      best = Math.min(best, Math.hypot(Math.max(left - x, 0, x - (left + SQUARE - 1)), Math.max(top - y, 0, y - (top + SQUARE - 1))));
    }
  }
  return best;
}

const insideSpur = (spur: Spur, x: number, y: number): boolean => {
  const px = x + 0.5 - spur.x;
  const py = y + 0.5 - spur.y;
  const along = px * spur.dx + py * spur.dy;
  if (along < 0 || along > spur.length) return false;
  const across = Math.abs(px * spur.dy - py * spur.dx);
  return across <= spur.width * (1 - along / spur.length) ** 0.7 + SPUR_WOBBLE * (valueNoise(907, x / 6, y / 6) - 0.5) * 2;
};

export function massifMask(avoid: (x: number, y: number) => boolean = () => false): Uint8Array {
  const mask = new Uint8Array(WIDTH * HEIGHT);
  const buckets = new Map<number, Spur[]>();
  for (const spur of massifSpurs()) {
    const reach = spur.length + spur.width;
    for (let row = Math.floor((spur.y - reach) / SQUARE); row <= Math.floor((spur.y + reach) / SQUARE); row++) {
      for (let column = Math.floor((spur.x - reach) / SQUARE); column <= Math.floor((spur.x + reach) / SQUARE); column++) {
        const key = row * COLUMNS + column;
        const list = buckets.get(key) ?? [];
        list.push(spur);
        buckets.set(key, list);
      }
    }
  }
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const distance = squareDistance(x, y);
      if (distance === 0) {
        mask[y * WIDTH + x] = 1;
        continue;
      }
      if (distance > 30 || !isLandTile(x, y) || nearPad(x, y, PAD_KEEP) || nearRail(x, y, RAIL_KEEP)) continue;
      const band = BAND + BAND_SWAY * lobe(valueNoise(911, x / 30, y / 30)) + BAND_RIPPLE * (valueNoise(919, x / 7, y / 7) - 0.5) * 2;
      if (distance <= band) {
        mask[y * WIDTH + x] = 1;
        continue;
      }
      if (nearSeam(x, y, SPUR_SEAM)) continue;
      const spurs = buckets.get(Math.floor(y / SQUARE) * COLUMNS + Math.floor(x / SQUARE));
      if (spurs && spurs.some((spur) => insideSpur(spur, x, y)) && !avoid(x, y)) mask[y * WIDTH + x] = 1;
    }
  }
  return mask;
}

const TOP = 15;
const SCREE = 1.5;
const SCREE_SWAY = 3;

export function screeMask(rockDistance: Float32Array, open: (x: number, y: number) => boolean): Uint8Array {
  const mask = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const distance = rockDistance[y * WIDTH + x]!;
      if (distance === 0 || distance > SCREE + SCREE_SWAY * valueNoise(941, x / 8, y / 8) || !open(x, y)) continue;
      mask[y * WIDTH + x] = 1;
    }
  }
  return mask;
}

const LEDGE_RISE = 3;
const GAP_RISE = 2;
export const LEDGE_LEVELS: readonly number[] = [9, 11, 13, 15];

const ledgeAtLeast = (level: number): number => LEDGE_LEVELS.find((ledge) => ledge >= level) ?? TOP;

export interface MassifLevels {
  readonly levels: Uint8Array;
  readonly depth: Int32Array;
}

export function massifLevels(mask: Uint8Array, groundAt: (x: number, y: number) => number): MassifLevels {
  const size = WIDTH * HEIGHT;
  const foot = new Int16Array(size).fill(-1);
  const depth = new Int32Array(size).fill(-1);
  const queue = new Int32Array(size);
  let tail = 0;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      if (!mask[index]) continue;
      let highest = -1;
      for (const [dx, dy] of SIDES) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT || mask[ny * WIDTH + nx]) continue;
        highest = Math.max(highest, groundAt(nx, ny));
      }
      if (highest < 0) continue;
      foot[index] = highest;
      depth[index] = 0;
      queue[tail++] = index;
    }
  }
  for (let head = 0; head < tail; head++) {
    const index = queue[head]!;
    const x = index % WIDTH;
    const y = (index - x) / WIDTH;
    for (const [dx, dy] of SIDES) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
      const near = ny * WIDTH + nx;
      if (!mask[near] || depth[near] >= 0) continue;
      depth[near] = depth[index]! + 1;
      foot[near] = foot[index]!;
      queue[tail++] = near;
    }
  }
  const levels = new Uint8Array(size);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      if (!mask[index]) continue;
      const reach = depth[index]! < 0 ? Infinity : depth[index]!;
      const ground = Math.max(0, foot[index]!);
      const lowest = ledgeAtLeast(ground + LEDGE_RISE);
      const middle = ledgeAtLeast(lowest + LEDGE_RISE);
      const first = 1.5 + 9 * valueNoise(929, x / 17, y / 17);
      const second = first + 3 + 10 * valueNoise(937, x / 21, y / 21);
      const level = reach < first ? lowest : reach < second ? middle : TOP;
      const pass = Math.min(TOP, ground + GAP_RISE);
      levels[index] = Math.min(level, Math.round(pass + (TOP - pass) * (1 - gapShare(x, y))));
    }
  }
  return { levels, depth };
}
