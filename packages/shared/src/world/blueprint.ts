import type { AreaDefinition } from './district.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from './geometry.ts';
import { MAP_LEGEND, TILE_KINDS, type TileKindId } from './tiles.ts';

export type RoomShape = 'rect' | 'octagon' | 'round';

export type ExitSide = 'north' | 'east' | 'south' | 'west';

export interface RoomStep {
  readonly kind: 'room';
  readonly id: string;
  readonly rect: TileRect;
  readonly floor: TileKindId;
  readonly shape: RoomShape;
}

export interface LinkStep {
  readonly kind: 'link';
  readonly from: string;
  readonly to: string;
  readonly width: number;
  readonly floor: TileKindId;
  readonly offset?: number;
}

export interface ExitStep {
  readonly kind: 'exit';
  readonly id: string;
  readonly room: string;
  readonly side: ExitSide;
  readonly width: number;
  readonly offset?: number;
  readonly gate: boolean;
  readonly floor?: TileKindId;
}

export interface PatchStep {
  readonly kind: 'patch';
  readonly rect: TileRect;
  readonly tile: TileKindId;
}

export interface PillarsStep {
  readonly kind: 'pillars';
  readonly room: string;
  readonly everyX: number;
  readonly everyY: number;
  readonly inset: number;
}

export interface HollowStep {
  readonly kind: 'hollow';
  readonly rect: TileRect;
}

export interface TrackStep {
  readonly kind: 'track';
  readonly points: readonly TilePoint[];
}

export type BlueprintStep = RoomStep | LinkStep | ExitStep | PatchStep | PillarsStep | HollowStep | TrackStep;

export const TRACK_GAUGE = 2;

export interface DistrictExit {
  readonly side: ExitSide;
  readonly tiles: readonly TilePoint[];
  readonly gate: boolean;
}

export interface Blueprint {
  readonly map: readonly string[];
  readonly rooms: Readonly<Record<string, TileRect>>;
  readonly exits: Readonly<Record<string, DistrictExit>>;
  readonly links: Readonly<Record<string, readonly TilePoint[]>>;
  at(room: string, dx: number, dy: number): TilePoint;
  spot(room: string, dx: number, dy: number): TilePoint;
  center(room: string): TilePoint;
  linkTile(from: string, to: string, index?: number): TilePoint;
  area(room: string, name: string, options?: { readonly safe?: boolean; readonly multiCombat?: boolean }): AreaDefinition;
  scatter(room: string, count: number, seed: string, avoid?: readonly TilePoint[]): TilePoint[];
  scatterAlongWalls(room: string, count: number, seed: string, avoid?: readonly TilePoint[]): WallSpot[];
}

export interface WallSpot {
  readonly position: TilePoint;
  readonly facing: Facing;
}

const WALL_SIDES: readonly { readonly facing: Facing; readonly toWall: TilePoint }[] = [
  { facing: 'south', toWall: { x: 0, y: -1 } },
  { facing: 'north', toWall: { x: 0, y: 1 } },
  { facing: 'east', toWall: { x: -1, y: 0 } },
  { facing: 'west', toWall: { x: 1, y: 0 } },
];

export const room = (id: string, x: number, y: number, width: number, height: number, floor: TileKindId, shape: RoomShape = 'rect'): RoomStep => ({
  kind: 'room',
  id,
  rect: { x, y, width, height },
  floor,
  shape,
});

export const link = (from: string, to: string, width: number, floor: TileKindId = 'door', offset?: number): LinkStep => ({
  kind: 'link',
  from,
  to,
  width,
  floor,
  ...(offset === undefined ? {} : { offset }),
});

export const exit = (
  id: string,
  roomId: string,
  side: ExitSide,
  width: number,
  options: { readonly offset?: number; readonly gate?: boolean; readonly floor?: TileKindId } = {},
): ExitStep => ({
  kind: 'exit',
  id,
  room: roomId,
  side,
  width,
  gate: options.gate ?? false,
  ...(options.offset === undefined ? {} : { offset: options.offset }),
  ...(options.floor === undefined ? {} : { floor: options.floor }),
});

export const patch = (x: number, y: number, width: number, height: number, tile: TileKindId): PatchStep => ({
  kind: 'patch',
  rect: { x, y, width, height },
  tile,
});

export const pillars = (roomId: string, everyX: number, everyY: number, inset = 3): PillarsStep => ({ kind: 'pillars', room: roomId, everyX, everyY, inset });

export const track = (...points: readonly (readonly [number, number])[]): TrackStep => ({ kind: 'track', points: points.map(([x, y]) => ({ x, y })) });

export function trackBed(points: readonly TilePoint[]): TileRect[] {
  if (points.length < 2) throw new Error('A track needs at least two points.');
  return points.slice(1).map((to, index) => {
    const from = points[index] as TilePoint;
    if (from.x !== to.x && from.y !== to.y) throw new Error(`Track from ${from.x},${from.y} to ${to.x},${to.y} is not straight.`);
    const x = Math.min(from.x, to.x);
    const y = Math.min(from.y, to.y);
    return { x, y, width: Math.abs(to.x - from.x) + TRACK_GAUGE, height: Math.abs(to.y - from.y) + TRACK_GAUGE };
  });
}

export const hollow = (x: number, y: number, width: number, height: number): HollowStep => ({ kind: 'hollow', rect: { x, y, width, height } });

const SYMBOL_OF = new Map<TileKindId, string>(Object.entries(MAP_LEGEND).map(([symbol, kind]) => [kind, symbol]));

const NEIGHBOURS: readonly TilePoint[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

const STEP_INTO: Readonly<Record<ExitSide, TilePoint>> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

function isInsideShape(shape: RoomShape, rect: TileRect, point: TilePoint): boolean {
  if (!rectContains(rect, point)) return false;
  const dx = point.x - rect.x;
  const dy = point.y - rect.y;
  if (shape === 'rect') return true;
  if (shape === 'octagon') {
    const cut = Math.floor(Math.min(rect.width, rect.height) / 4);
    const fromLeft = dx;
    const fromRight = rect.width - 1 - dx;
    const fromTop = dy;
    const fromBottom = rect.height - 1 - dy;
    return fromLeft + fromTop >= cut && fromRight + fromTop >= cut && fromLeft + fromBottom >= cut && fromRight + fromBottom >= cut;
  }
  const nx = (dx + 0.5 - rect.width / 2) / (rect.width / 2);
  const ny = (dy + 0.5 - rect.height / 2) / (rect.height / 2);
  return nx * nx + ny * ny <= 1;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function overlapStart(aStart: number, aLength: number, bStart: number, bLength: number, width: number, offset: number | undefined): number | undefined {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aStart + aLength, bStart + bLength);
  if (end - start < width) return undefined;
  return offset === undefined ? start + Math.floor((end - start - width) / 2) : start + offset;
}

export function drawBlueprint(size: { readonly width: number; readonly height: number }, steps: readonly BlueprintStep[]): Blueprint {
  const { width, height } = size;
  const tiles: TileKindId[] = new Array(width * height).fill('void');
  const rooms: Record<string, TileRect> = {};
  const exits: Record<string, DistrictExit> = {};
  const links: Record<string, TilePoint[]> = {};
  const hollows: TileRect[] = [];
  const floors: Record<string, TileKindId> = {};

  const inBounds = ({ x, y }: TilePoint): boolean => x >= 0 && y >= 0 && x < width && y < height;
  const tileAt = (point: TilePoint): TileKindId => (inBounds(point) ? (tiles[point.y * width + point.x] as TileKindId) : 'void');
  const setTile = (point: TilePoint, tile: TileKindId): void => {
    if (!inBounds(point)) throw new Error(`Blueprint tile ${point.x},${point.y} is outside ${width}x${height}.`);
    tiles[point.y * width + point.x] = tile;
  };
  const rectOf = (roomId: string): TileRect => {
    const rect = rooms[roomId];
    if (!rect) throw new Error(`Blueprint has no room "${roomId}".`);
    return rect;
  };

  const carveInto = (from: TilePoint, direction: TilePoint, rect: TileRect, floor: TileKindId): void => {
    let point = from;
    while (rectContains(rect, point) && tileAt(point) === 'void') {
      setTile(point, floor);
      point = { x: point.x + direction.x, y: point.y + direction.y };
    }
  };

  const drawRoom = (step: RoomStep): void => {
    rooms[step.id] = step.rect;
    floors[step.id] = step.floor;
    for (let y = step.rect.y; y < step.rect.y + step.rect.height; y++) {
      for (let x = step.rect.x; x < step.rect.x + step.rect.width; x++) {
        if (isInsideShape(step.shape, step.rect, { x, y })) setTile({ x, y }, step.floor);
      }
    }
  };

  const drawLink = (step: LinkStep): void => {
    const a = rectOf(step.from);
    const b = rectOf(step.to);
    const key = `${step.from}>${step.to}`;
    const aboveGap = a.y + a.height <= b.y ? { top: a.y + a.height, bottom: b.y, towardsA: -1 } : b.y + b.height <= a.y ? { top: b.y + b.height, bottom: a.y, towardsA: 1 } : undefined;
    const besideGap = a.x + a.width <= b.x ? { left: a.x + a.width, right: b.x, towardsA: -1 } : b.x + b.width <= a.x ? { left: b.x + b.width, right: a.x, towardsA: 1 } : undefined;
    const column = aboveGap && overlapStart(a.x, a.width, b.x, b.width, step.width, step.offset);
    const row = besideGap && overlapStart(a.y, a.height, b.y, b.height, step.width, step.offset);

    if (aboveGap && column !== undefined) {
      const firstRow = aboveGap.towardsA < 0 ? aboveGap.top : aboveGap.bottom - 1;
      links[key] = [];
      for (let x = column; x < column + step.width; x++) {
        for (let y = aboveGap.top; y < aboveGap.bottom; y++) setTile({ x, y }, step.floor);
        carveInto({ x, y: aboveGap.top - 1 }, { x: 0, y: -1 }, aboveGap.towardsA < 0 ? a : b, step.floor);
        carveInto({ x, y: aboveGap.bottom }, { x: 0, y: 1 }, aboveGap.towardsA < 0 ? b : a, step.floor);
        links[key].push({ x, y: firstRow });
      }
      return;
    }
    if (besideGap && row !== undefined) {
      const firstColumn = besideGap.towardsA < 0 ? besideGap.left : besideGap.right - 1;
      links[key] = [];
      for (let y = row; y < row + step.width; y++) {
        for (let x = besideGap.left; x < besideGap.right; x++) setTile({ x, y }, step.floor);
        carveInto({ x: besideGap.left - 1, y }, { x: -1, y: 0 }, besideGap.towardsA < 0 ? a : b, step.floor);
        carveInto({ x: besideGap.right, y }, { x: 1, y: 0 }, besideGap.towardsA < 0 ? b : a, step.floor);
        links[key].push({ x: firstColumn, y });
      }
      return;
    }
    throw new Error(`Blueprint rooms "${step.from}" and "${step.to}" do not face each other across a gap ${step.width} wide.`);
  };

  const drawExit = (step: ExitStep): void => {
    const rect = rectOf(step.room);
    const vertical = step.side === 'north' || step.side === 'south';
    const span = vertical ? rect.width : rect.height;
    const start = (vertical ? rect.x : rect.y) + (step.offset ?? Math.floor((span - step.width) / 2));
    const floor = step.floor ?? (floors[step.room] as TileKindId);
    const into = STEP_INTO[step.side];
    const edgeTiles: TilePoint[] = [];
    for (let along = start; along < start + step.width; along++) {
      const edge: TilePoint = vertical ? { x: along, y: step.side === 'north' ? 0 : height - 1 } : { x: step.side === 'west' ? 0 : width - 1, y: along };
      const inside: TilePoint = vertical
        ? { x: along, y: step.side === 'north' ? rect.y : rect.y + rect.height - 1 }
        : { x: step.side === 'west' ? rect.x : rect.x + rect.width - 1, y: along };
      for (let point = { x: inside.x + into.x, y: inside.y + into.y }; inBounds(point); point = { x: point.x + into.x, y: point.y + into.y }) setTile(point, floor);
      carveInto(inside, { x: -into.x, y: -into.y }, rect, floor);
      edgeTiles.push(edge);
    }
    exits[step.id] = { side: step.side, tiles: edgeTiles, gate: step.gate };
  };

  const drawPatch = (step: PatchStep): void => {
    for (let y = step.rect.y; y < step.rect.y + step.rect.height; y++) {
      for (let x = step.rect.x; x < step.rect.x + step.rect.width; x++) setTile({ x, y }, step.tile);
    }
  };

  const drawPillars = (step: PillarsStep): void => {
    const rect = rectOf(step.room);
    for (let y = rect.y + step.inset; y < rect.y + rect.height - step.inset; y += step.everyY) {
      for (let x = rect.x + step.inset; x < rect.x + rect.width - step.inset; x += step.everyX) {
        if (TILE_KINDS[tileAt({ x, y })].walkable) setTile({ x, y }, 'wall');
      }
    }
  };

  for (const step of steps) {
    if (step.kind === 'room') drawRoom(step);
    else if (step.kind === 'link') drawLink(step);
    else if (step.kind === 'exit') drawExit(step);
    else if (step.kind === 'patch') drawPatch(step);
    else if (step.kind === 'hollow') hollows.push(step.rect);
    else if (step.kind === 'track') for (const rect of trackBed(step.points)) drawPatch({ kind: 'patch', rect, tile: 'track' });
    else drawPillars(step);
  }

  const needsWall = (point: TilePoint): boolean =>
    !hollows.some((rect) => rectContains(rect, point)) &&
    NEIGHBOURS.some((offset) => {
      const neighbour = tileAt({ x: point.x + offset.x, y: point.y + offset.y });
      return neighbour !== 'void' && TILE_KINDS[neighbour].structure !== 'wall';
    });
  const walls: TilePoint[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tileAt({ x, y }) === 'void' && needsWall({ x, y })) walls.push({ x, y });
    }
  }
  for (const wall of walls) setTile(wall, 'wall');

  const map = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => SYMBOL_OF.get(tiles[y * width + x] as TileKindId) as string).join(''),
  );

  const spot = (roomId: string, dx: number, dy: number): TilePoint => {
    const rect = rectOf(roomId);
    const point = { x: rect.x + dx, y: rect.y + dy };
    if (!rectContains(rect, point)) throw new Error(`Blueprint point ${dx},${dy} is outside room "${roomId}" (${rect.width}x${rect.height}).`);
    return point;
  };

  const at = (roomId: string, dx: number, dy: number): TilePoint => {
    const point = spot(roomId, dx, dy);
    if (!TILE_KINDS[tileAt(point)].walkable) throw new Error(`Blueprint point ${dx},${dy} in room "${roomId}" is ${tileAt(point)}, not floor.`);
    return point;
  };

  const scatter = (roomId: string, count: number, seed: string, avoid: readonly TilePoint[] = []): TilePoint[] => {
    const rect = rectOf(roomId);
    const taken = new Set(avoid.map(tileKey));
    const isOpenFloor = (point: TilePoint): boolean => TILE_KINDS[tileAt(point)].walkable && tileAt(point) !== 'door';
    const candidates: TilePoint[] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        const point = { x, y };
        if (taken.has(tileKey(point)) || !isOpenFloor(point)) continue;
        if (NEIGHBOURS.every((offset) => isOpenFloor({ x: x + offset.x, y: y + offset.y }))) candidates.push(point);
      }
    }
    const random = seededRandom(`${roomId}:${seed}`);
    for (let index = candidates.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [candidates[index], candidates[swap]] = [candidates[swap] as TilePoint, candidates[index] as TilePoint];
    }
    for (let spacing = 6; spacing >= 1; spacing--) {
      const chosen: TilePoint[] = [];
      for (const candidate of candidates) {
        if (chosen.length === count) break;
        const clear = [...chosen, ...avoid].every((other) => Math.max(Math.abs(other.x - candidate.x), Math.abs(other.y - candidate.y)) >= spacing);
        if (clear) chosen.push(candidate);
      }
      if (chosen.length === count) return chosen;
    }
    throw new Error(`Blueprint room "${roomId}" has no room to scatter ${count} placements.`);
  };

  const scatterAlongWalls = (roomId: string, count: number, seed: string, avoid: readonly TilePoint[] = []): WallSpot[] => {
    const rect = rectOf(roomId);
    const taken = new Set(avoid.map(tileKey));
    const isWall = (point: TilePoint): boolean => TILE_KINDS[tileAt(point)].structure === 'wall';
    const isClearFloor = (point: TilePoint): boolean => TILE_KINDS[tileAt(point)].walkable && tileAt(point) !== 'door' && tileAt(point) !== 'hazard';
    const nearDoor = (point: TilePoint): boolean => {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (tileAt({ x: point.x + dx, y: point.y + dy }) === 'door') return true;
        }
      }
      return false;
    };
    const candidates: WallSpot[] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        const position = { x, y };
        if (taken.has(tileKey(position)) || !isClearFloor(position) || nearDoor(position)) continue;
        const sides = WALL_SIDES.filter(({ toWall }) => isWall({ x: x + toWall.x, y: y + toWall.y }));
        const side = sides[0];
        if (sides.length !== 1 || !side) continue;
        const { toWall } = side;
        const along = { x: toWall.y, y: toWall.x };
        const wallRuns = [-1, 1].every((step) => isWall({ x: x + toWall.x + along.x * step, y: y + toWall.y + along.y * step }));
        const open = [
          { x: x + along.x, y: y + along.y },
          { x: x - along.x, y: y - along.y },
          { x: x - toWall.x, y: y - toWall.y },
          { x: x - toWall.x * 2, y: y - toWall.y * 2 },
          { x: x - toWall.x + along.x, y: y - toWall.y + along.y },
          { x: x - toWall.x - along.x, y: y - toWall.y - along.y },
        ].every(isClearFloor);
        if (wallRuns && open) candidates.push({ position, facing: side.facing });
      }
    }
    const random = seededRandom(`${roomId}:${seed}:walls`);
    for (let index = candidates.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [candidates[index], candidates[swap]] = [candidates[swap] as WallSpot, candidates[index] as WallSpot];
    }
    let best: WallSpot[] = [];
    for (let spacing = 6; spacing >= 2; spacing--) {
      const chosen: WallSpot[] = [];
      for (const candidate of candidates) {
        if (chosen.length === count) break;
        const others = [...chosen.map((spot) => spot.position), ...avoid];
        if (others.every((other) => Math.max(Math.abs(other.x - candidate.position.x), Math.abs(other.y - candidate.position.y)) >= spacing)) chosen.push(candidate);
      }
      if (chosen.length === count) return chosen;
      if (chosen.length > best.length) best = chosen;
    }
    return best;
  };

  return {
    map,
    rooms,
    exits,
    links,
    at,
    spot,
    center: (roomId) => {
      const rect = rectOf(roomId);
      return { x: rect.x + Math.floor(rect.width / 2), y: rect.y + Math.floor(rect.height / 2) };
    },
    linkTile: (from, to, index = 0) => {
      const tile = links[`${from}>${to}`]?.[index];
      if (!tile) throw new Error(`Blueprint has no link tile ${index} between "${from}" and "${to}".`);
      return tile;
    },
    area: (roomId, name, options = {}) => ({ id: roomId, name, rect: rectOf(roomId), ...options }),
    scatter,
    scatterAlongWalls,
  };
}
