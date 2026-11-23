import { PLACES, padOf, RAIL, SQUARE, type PlaceSpec, type RailPoint } from './atlas.ts';
import { BRIDGE_PLANS_FOR_LAND } from './bridges.ts';
import { TRACK_GAUGE } from './plan.ts';

export interface RailRise {
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly height: number;
}

interface Tile {
  readonly x: number;
  readonly y: number;
}

export const RAIL_MIN_RUN = 6;
const SMOOTHING = 12;
const FLAT_REACH = 5;
const LOWEST = 1;
const HIGHEST = 14;
const PINNED = 1e6;
const CHANGE_COST = 0.25;

interface Stretch {
  readonly start: number;
  readonly cells: readonly (readonly Tile[])[];
}

function stretchesOf(line: readonly RailPoint[]): Stretch[] {
  let start = 0;
  return line.slice(1).map((b, index) => {
    const a = line[index] as RailPoint;
    const horizontal = a.y === b.y;
    const length = Math.abs(horizontal ? b.x - a.x : b.y - a.y);
    const forward = (horizontal ? b.x - a.x : b.y - a.y) > 0;
    const cells: Tile[][] = [];
    for (let k = 0; k <= length + 1; k++) {
      const c = forward ? (horizontal ? a.x : a.y) + k : (horizontal ? a.x : a.y) + 1 - k;
      const tiles: Tile[] = [];
      for (let across = 0; across < TRACK_GAUGE; across++) tiles.push(horizontal ? { x: c, y: a.y + across } : { x: a.x + across, y: c });
      cells.push(tiles);
    }
    const stretch = { start, cells };
    start += length;
    return stretch;
  });
}

const stationAt = (tile: Tile): PlaceSpec | undefined =>
  PLACES.find((place) => place.station && Math.floor(tile.x / SQUARE) === place.column && Math.floor(tile.y / SQUARE) === place.row);

export function gradeRail(heightAt: (x: number, y: number) => number): RailRise[] {
  const rises: RailRise[] = [];
  const known = new Map<string, number>();
  for (const line of RAIL) {
    const stretches = stretchesOf(line);
    const last = stretches[stretches.length - 1] as Stretch;
    const count = last.start + last.cells.length;
    const byIndex: Tile[][] = Array.from({ length: count }, () => []);
    for (const stretch of stretches) stretch.cells.forEach((tiles, k) => (byIndex[stretch.start + k] as Tile[]).push(...tiles));
    const terrain = byIndex.map((tiles) => Math.max(LOWEST, tiles.reduce((total, tile) => total + heightAt(tile.x, tile.y), 0) / tiles.length));
    const target = terrain.map((_, index) => {
      let sum = 0;
      let n = 0;
      for (let k = Math.max(0, index - SMOOTHING); k <= Math.min(count - 1, index + SMOOTHING); k++) {
        sum += terrain[k] as number;
        n++;
      }
      return Math.min(HIGHEST, sum / n);
    });
    const pin = new Array<number | undefined>(count).fill(undefined);
    const flat = new Uint8Array(count);
    const holdFlat = (from: number, to: number): void => {
      for (let index = Math.max(0, from); index <= Math.min(count - 1, to); index++) flat[index] = 1;
    };
    for (const stretch of stretches.slice(1)) holdFlat(stretch.start - FLAT_REACH, stretch.start + 1 + FLAT_REACH);
    byIndex.forEach((tiles, index) => {
      for (const tile of tiles) {
        const joined = known.get(tile.x + ',' + tile.y);
        if (joined !== undefined) pin[index] = joined;
        const station = stationAt(tile);
        if (station) pin[index] = padHeight(station, heightAt);
        if (BRIDGE_PLANS_FOR_LAND.some((bridge) => Math.abs(bridge.x - tile.x) <= 2 && Math.abs(bridge.y - tile.y) <= 2)) holdFlat(index - 4, index + 5);
      }
    });
    pin.forEach((value, index) => {
      if (value !== undefined && (pin[index - 1] === undefined || pin[index + 1] === undefined)) holdFlat(index - FLAT_REACH, index + FLAT_REACH);
    });
    const heights = solve(target, pin, flat);
    for (const stretch of stretches) {
      let from = 0;
      for (let k = 1; k <= stretch.cells.length; k++) {
        const height = heights[stretch.start + from] as number;
        if (k < stretch.cells.length && heights[stretch.start + k] === height) continue;
        const tiles = stretch.cells.slice(from, k).flat();
        const x = Math.min(...tiles.map((tile) => tile.x));
        const y = Math.min(...tiles.map((tile) => tile.y));
        rises.push({ rect: { x, y, width: Math.max(...tiles.map((tile) => tile.x)) - x + 1, height: Math.max(...tiles.map((tile) => tile.y)) - y + 1 }, height });
        for (const tile of tiles) known.set(tile.x + ',' + tile.y, height);
        from = k;
      }
    }
  }
  return rises;
}

function padHeight(place: PlaceSpec, heightAt: (x: number, y: number) => number): number {
  const pad = padOf(place);
  return heightAt(pad.x + Math.floor(pad.width / 2), pad.y + Math.floor(pad.height / 2));
}

function solve(target: readonly number[], pin: readonly (number | undefined)[], flat: Uint8Array): number[] {
  const count = target.length;
  const runs = RAIL_MIN_RUN + 1;
  const states = (HIGHEST + 1) * runs;
  const cost = new Float64Array(count * states).fill(Infinity);
  const from = new Int32Array(count * states).fill(-1);
  const stateOf = (height: number, run: number): number => height * runs + run;
  const local = (index: number, height: number): number => {
    const pinned = pin[index];
    if (pinned !== undefined && pinned !== height) return PINNED;
    return Math.abs(height - (target[index] as number));
  };
  const relax = (at: number, value: number, previous: number): void => {
    if (value >= (cost[at] as number)) return;
    cost[at] = value;
    from[at] = previous;
  };
  for (let height = LOWEST; height <= HIGHEST; height++) cost[stateOf(height, RAIL_MIN_RUN)] = local(0, height);
  for (let index = 1; index < count; index++) {
    for (let height = LOWEST; height <= HIGHEST; height++) {
      for (let run = 1; run <= RAIL_MIN_RUN; run++) {
        const previous = (index - 1) * states + stateOf(height, run);
        const here = cost[previous] as number;
        if (here === Infinity) continue;
        relax(index * states + stateOf(height, Math.min(RAIL_MIN_RUN, run + 1)), here + local(index, height), previous);
        if (run < RAIL_MIN_RUN || flat[index] || flat[index - 1]) continue;
        for (const next of [height - 1, height + 1]) {
          if (next >= LOWEST && next <= HIGHEST) relax(index * states + stateOf(next, 1), here + local(index, next) + CHANGE_COST, previous);
        }
      }
    }
  }
  let best = (count - 1) * states;
  for (let state = 0; state < states; state++) if ((cost[(count - 1) * states + state] as number) < (cost[best] as number)) best = (count - 1) * states + state;
  const heights = new Array<number>(count);
  for (let at = best, index = count - 1; index >= 0; index--) {
    heights[index] = Math.floor((at - index * states) / runs);
    at = from[at] as number;
  }
  return heights;
}
