import type { FloorDecal } from '../../world/decals.ts';
import type { ObjectPlacement } from '../../world/district.ts';
import { isWallFixture } from '../../world/footprint.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from '../../world/geometry.ts';
import type { CompositionZone, DressingDensity, RoomComposition } from '../compositions.ts';
import { prefabsWithRole, type DressingTheme, type Prefab } from '../prefabs/index.ts';
import {
  bayRuns,
  CORNER_SLOTS,
  cornerOrigin,
  edgeRuns,
  endOrigin,
  endRotations,
  endThird,
  farEndOf,
  inFirstHalf,
  laneTilesOf,
  mainAxisOf,
  middleThird,
  mirrorFacing,
  mirrorOrigin,
  mirrorTurn,
  pieceTiles,
  placementSignature,
  rectsOfTiles,
  runLength,
  runOrigin,
  turnsOf,
  type Bounds,
  type ObjectLookup,
  type Run,
  type Turn,
} from './composeLayout.ts';
import { seededRandom, shuffle } from './seededRandom.ts';

export { inWalkingLane } from './composeLayout.ts';

export interface ComposeInput {
  readonly roomId: string;
  readonly rect: TileRect;
  readonly theme: DressingTheme;
  readonly density: DressingDensity;
  readonly composition: RoomComposition;
  readonly seed: string;
  readonly clear: ReadonlySet<string>;
  readonly openings: readonly TilePoint[];
  readonly isWall: (point: TilePoint) => boolean;
  readonly isStructuralWall?: (point: TilePoint) => boolean;
  readonly objectOf: ObjectLookup;
  readonly occupied: Set<string>;
}

export interface Composed {
  readonly objects: readonly ObjectPlacement[];
  readonly decals: readonly FloorDecal[];
  readonly prefabs?: readonly string[];
  readonly additions?: readonly string[];
}

const OPENING_CLEARANCE = 3;
export const MAX_PREFAB_REPEATS = 3;
const MIN_CORNER_SPAN = 8;

interface Slot {
  readonly origin: TilePoint;
  readonly turn: Turn;
  readonly backs: readonly Facing[];
}

const alongLines = (runs: readonly Run[]): Run[][] =>
  (['x', 'y'] as const).map((along) => runs.filter((run) => run.along === along)).filter((line) => line.length > 0);

const fitsRoom = (prefab: Prefab, rect: TileRect): boolean => {
  const min = prefab.minRoom;
  if (!min) return true;
  return (rect.width >= min.width && rect.height >= min.height) || (rect.width >= min.height && rect.height >= min.width);
};

export function composeRoom(input: ComposeInput): Composed {
  const { rect, composition, occupied, clear, objectOf } = input;
  const random = seededRandom(input.seed);
  const formal = composition.formal;
  const axis = mainAxisOf(rect);
  const objects: ObjectPlacement[] = [];
  const decals: FloorDecal[] = [];
  const uses = new Map<string, number>();
  const used: string[] = [];
  const turnCache = new Map<Prefab, readonly Turn[]>();
  const turnOf = (prefab: Prefab, rotation: number): Turn => {
    const cached = turnCache.get(prefab) ?? turnsOf(prefab, objectOf);
    turnCache.set(prefab, cached);
    return cached[((rotation % 4) + 4) % 4] as Turn;
  };

  const nearOpening = (point: TilePoint): boolean =>
    input.openings.some((opening) => Math.max(Math.abs(opening.x - point.x), Math.abs(opening.y - point.y)) <= OPENING_CLEARANCE);
  let focal: Bounds | undefined;
  let lane: Set<string> | undefined;
  const laneTiles = (): Set<string> => {
    lane ??= laneTilesOf(rect, composition.lane, focal, input.openings);
    return lane;
  };

  const usable = (point: TilePoint, ignoreLane: boolean): boolean => {
    const key = tileKey(point);
    return rectContains(rect, point) && clear.has(key) && !occupied.has(key) && !nearOpening(point) && (ignoreLane || !laneTiles().has(key));
  };

  const fits = (slot: Slot, clearance: number, ignoreLane = false): boolean => {
    const { origin, turn, backs } = slot;
    const isBacking = turn.pieces.some((piece) => isWallFixture(objectOf(piece.objectId))) ? (input.isStructuralWall ?? input.isWall) : input.isWall;
    for (const tile of pieceTiles(origin, turn)) if (!usable(tile, ignoreLane)) return false;
    for (const back of backs) {
      const length = back === 'north' || back === 'south' ? turn.width : turn.height;
      for (let index = 0; index < length; index++) {
        const point =
          back === 'north' || back === 'south'
            ? { x: origin.x + index, y: back === 'north' ? origin.y - 1 : origin.y + turn.height }
            : { x: back === 'west' ? origin.x - 1 : origin.x + turn.width, y: origin.y + index };
        if (!isBacking(point)) return false;
      }
    }
    const reach = (side: Facing): number => (backs.includes(side) ? 0 : clearance);
    for (let y = origin.y - reach('north'); y < origin.y + turn.height + reach('south'); y++) {
      for (let x = origin.x - reach('west'); x < origin.x + turn.width + reach('east'); x++) {
        const key = tileKey({ x, y });
        if (!rectContains(rect, { x, y }) || !clear.has(key) || occupied.has(key)) return false;
      }
    }
    return true;
  };

  let block = 0;
  const commit = (slot: Slot): void => {
    block += 1;
    for (const tile of pieceTiles(slot.origin, slot.turn)) occupied.add(tileKey(tile));
    slot.turn.pieces.forEach((piece, index) => {
      objects.push({
        instanceId: `${input.roomId}-dressing-${block}-${index + 1}`,
        objectId: piece.objectId,
        position: { x: slot.origin.x + piece.dx, y: slot.origin.y + piece.dy },
        facing: piece.facing,
      });
    });
    for (const decal of slot.turn.decals) decals.push({ ...decal, rect: { ...decal.rect, x: slot.origin.x + decal.rect.x, y: slot.origin.y + decal.rect.y } });
  };

  const mirrorOf = (slot: Slot): Slot => ({
    origin: mirrorOrigin(slot.origin, slot.turn, rect, axis),
    turn: mirrorTurn(slot.turn, axis),
    backs: slot.backs.map((back) => mirrorFacing(back, axis)),
  });

  const tryPlace = (slot: Slot, prefab: Prefab): number => {
    const clearance = prefab.clearance ?? 1;
    if (!fits(slot, clearance)) return 0;
    if (!formal) {
      commit(slot);
      return 1;
    }
    if (!inFirstHalf(slot.origin, slot.turn, rect, axis)) return 0;
    const mirror = mirrorOf(slot);
    const tiles = pieceTiles(slot.origin, slot.turn).map(tileKey);
    for (const key of tiles) occupied.add(key);
    const mirrorFits = fits(mirror, clearance);
    for (const key of tiles) occupied.delete(key);
    if (!mirrorFits) return 0;
    commit(slot);
    commit(mirror);
    return 2;
  };

  const candidatesFor = (zone: CompositionZone): readonly Prefab[] => prefabsWithRole(input.theme, zone.role).filter((prefab) => fitsRoom(prefab, rect));

  const allowed = (prefab: Prefab, previous: string | undefined): boolean =>
    prefab.id !== previous && (formal || (uses.get(prefab.id) ?? 0) < MAX_PREFAB_REPEATS);

  const record = (prefab: Prefab, count: number): void => {
    uses.set(prefab.id, (uses.get(prefab.id) ?? 0) + count);
    for (let index = 0; index < count; index++) used.push(prefab.id);
  };

  const fillFocal = (zone: CompositionZone): void => {
    const end = zone.at === 'far-end' ? farEndOf(rect, input.openings) : undefined;
    const guard = end ? endThird(rect, end) : middleThird(rect);
    for (let y = guard.y; y < guard.y + guard.height; y++) {
      for (let x = guard.x; x < guard.x + guard.width; x++) if (occupied.has(tileKey({ x, y }))) return;
    }
    if (zone.max === 0) return;
    for (const prefab of shuffle([...candidatesFor(zone)], random)) {
      if (!allowed(prefab, undefined)) continue;
      for (const rotation of end ? endRotations(end) : [0, 1, 2, 3]) {
        const turn = turnOf(prefab, rotation);
        const origin = end
          ? endOrigin(rect, end, turn, prefab.clearance ?? 1)
          : { x: rect.x + Math.floor((rect.width - turn.width) / 2), y: rect.y + Math.floor((rect.height - turn.height) / 2) };
        const slot = { origin, turn, backs: [] };
        if (!end && formal && placementSignature(origin, turn) !== placementSignature(mirrorOrigin(origin, turn, rect, axis), mirrorTurn(turn, axis))) continue;
        if (!fits(slot, prefab.clearance ?? 1, true)) continue;
        commit(slot);
        record(prefab, 1);
        focal = { left: origin.x, top: origin.y, right: origin.x + turn.width - 1, bottom: origin.y + turn.height - 1 };
        lane = undefined;
        return;
      }
    }
  };

  const fillCorners = (zone: CompositionZone): void => {
    if (Math.min(rect.width, rect.height) < MIN_CORNER_SPAN) return;
    let placed = 0;
    for (const corner of CORNER_SLOTS) {
      if (zone.max !== undefined && placed >= zone.max) return;
      for (const prefab of shuffle([...candidatesFor(zone)], random)) {
        if (!allowed(prefab, undefined)) continue;
        const turn = turnOf(prefab, corner.rotation);
        const count = tryPlace({ origin: cornerOrigin(corner, rect, turn), turn, backs: corner.backs }, prefab);
        if (count === 0) continue;
        placed += count;
        record(prefab, count);
        break;
      }
    }
  };

  const fillRuns = (zone: CompositionZone, lines: readonly (readonly Run[])[]): void => {
    const gap = zone.spacing[input.density];
    let placed = 0;
    let previous: string | undefined;
    for (const runs of lines) {
      const start = Math.min(...runs.map((run) => run.start));
      const end = Math.max(...runs.map((run) => run.end));
      let cursor = start;
      let turnIndex = 0;
      while (cursor <= end) {
        if (zone.max !== undefined && placed >= zone.max) return;
        const run = runs[turnIndex % runs.length] as Run;
        const jitter = formal ? 0 : Math.floor(random() * 3) - 1;
        let advance = 1;
        for (const prefab of shuffle([...candidatesFor(zone)], random)) {
          if (!allowed(prefab, previous)) continue;
          const turn = turnOf(prefab, run.rotation);
          const length = runLength(run, turn);
          if (cursor < run.start || cursor + length - 1 > run.end) continue;
          const count = tryPlace({ origin: runOrigin(run, cursor + jitter, turn), turn, backs: run.backs }, prefab);
          if (count === 0) continue;
          placed += count;
          record(prefab, count);
          previous = prefab.id;
          advance = length + gap + jitter;
          turnIndex += 1;
          break;
        }
        cursor += Math.max(1, advance);
      }
    }
  };

  const fieldRotations = (): readonly number[] => {
    if (formal) {
      const invariant = axis === 'x' ? [0, 2] : [1, 3];
      return [invariant[Math.floor(random() * 2)] as number];
    }
    const first = Math.floor(random() * 4);
    return [0, 1, 2, 3].map((offset) => (first + offset) % 4);
  };

  const fillField = (zone: CompositionZone): void => {
    const gap = zone.spacing[input.density];
    const rotations = fieldRotations();
    const spaced: Bounds[] = [];
    const apart = (origin: TilePoint, turn: Turn): boolean =>
      spaced.every(
        (other) =>
          origin.x + turn.width - 1 + gap < other.left || origin.x - gap > other.right || origin.y + turn.height - 1 + gap < other.top || origin.y - gap > other.bottom,
      );
    const remember = (origin: TilePoint, turn: Turn): void => {
      spaced.push({ left: origin.x, top: origin.y, right: origin.x + turn.width - 1, bottom: origin.y + turn.height - 1 });
      if (formal) {
        const mirror = mirrorOrigin(origin, turn, rect, axis);
        spaced.push({ left: mirror.x, top: mirror.y, right: mirror.x + turn.width - 1, bottom: mirror.y + turn.height - 1 });
      }
    };
    let placed = 0;
    let previous: string | undefined;
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (zone.max !== undefined && placed >= zone.max) return;
        if (!usable({ x, y }, false) || !apart({ x, y }, { pieces: [], decals: [], width: 1, height: 1 })) continue;
        const jitter = formal ? 0 : Math.floor(random() * 3) - 1;
        const origin = { x: x + jitter, y };
        search: for (const prefab of shuffle([...candidatesFor(zone)], random)) {
          if (!allowed(prefab, previous)) continue;
          for (const rotation of rotations) {
            const turn = turnOf(prefab, rotation);
            if (!apart(origin, turn)) continue;
            const count = tryPlace({ origin, turn, backs: [] }, prefab);
            if (count === 0) continue;
            placed += count;
            record(prefab, count);
            remember(origin, turn);
            previous = prefab.id;
            break search;
          }
        }
      }
    }
  };

  for (const zone of composition.zones) {
    if (zone.kind === 'focal') fillFocal(zone);
    else if (zone.kind === 'corners') fillCorners(zone);
    else if (zone.kind === 'bays') fillRuns(zone, bayRuns(rect).map((run) => [run]));
    else if (zone.kind === 'edges') fillRuns(zone, alongLines(edgeRuns(rect, composition.lane, focal)));
    else fillField(zone);
  }

  if (composition.laneDecal) {
    const kind = composition.laneDecal;
    const floor = [...laneTiles()].map((key) => {
      const [x, y] = key.split(',').map(Number) as [number, number];
      return { x, y };
    });
    const walkable = floor.filter((point) => rectContains(rect, point) && !input.isWall(point));
    for (const laneRect of rectsOfTiles(walkable)) decals.push({ kind, rect: laneRect });
  }

  return { objects, decals, prefabs: used };
}
