import type { DistrictLayout } from '../../packages/shared/src/world/layoutSchema.ts';
import type { LandMap } from '../../packages/shared/src/world/landPlan.ts';
import { buildDistrict } from '../../packages/shared/src/world/layout.ts';
import { parseTileLayout, type DistrictDefinition, type TileLayout } from '../../packages/shared/src/world/district.ts';
import { objectFootprintTiles } from '../../packages/shared/src/world/footprint.ts';
import type { Facing, TilePoint } from '../../packages/shared/src/world/geometry.ts';
import type { WorldObjectDefinition } from '../../packages/shared/src/world/entities.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { isKerb } from '../../packages/shared/src/world/streetLights.ts';
import { CITY_KIT_OBJECTS } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_OBJECTS } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { TRANSIT_OBJECTS } from '../../packages/shared/src/content/catalog/transit.ts';
import { WARD_SPOTS, WARD_STATIONS } from '../../packages/shared/src/content/catalog/nodes.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { WILD_KIT } from '../../packages/shared/src/content/span/wilds.ts';
import { SPAN_REGIONS } from '../../packages/shared/src/content/span/people.ts';
import { SPAN_QUEST_OBJECTS } from '../../packages/shared/src/content/span/quests/index.ts';
import { PAD_INSET, PLACES } from './atlas.ts';
import { WILD_POIS } from './wilds.ts';

type Placement = DistrictLayout['objects'][number];
type Step = DistrictLayout['steps'][number];
type Building = Extract<Step, { kind: 'building' }>;

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Lamp {
  readonly object: string;
  readonly at: TilePoint;
  readonly facing: Facing;
}

const STREET_LAMP = 'street-lamp';
const PATH_LIGHT = 'path-light';
const PATH_PITCH = 8;
const PAD_PITCH = 14;
const LAMP_GAP = 3;
const MAX_PATH = 70;
const TURN_COST = 6;
const CLIMB_COST = 2;

const PATH_TILES: Readonly<Record<string, TileKindId>> = {
  'kestrel-reach': 'paving',
  'harrow-terraces': 'gravel',
  halcyon: 'concrete',
  wreckfield: 'plating',
  'glass-steppe': 'gravel',
  'the-spindle': 'plating',
};

const PAVEMENTS: Readonly<Partial<Record<TileKindId, TileKindId>>> = {
  paving: 'concrete',
  asphalt: 'paving',
  concrete: 'plating',
  gravel: 'paving',
  rust: 'plating',
  plating: 'concrete',
  terrazzo: 'paving',
};

const GROUND = new Map(SPAN_REGIONS.map((region) => [region.id, region.ground] as const));
const PADS = new Map(PLACES.map((place) => [place.id, place.pad] as const));
const PATHABLE: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'soil', 'gravel', 'rust', 'paving', 'asphalt', 'concrete', 'plating', 'grate', 'terrazzo']);
const OBJECTS = new Map<string, WorldObjectDefinition>([...CITY_KIT_OBJECTS, ...LANDMARK_OBJECTS, ...TRANSIT_OBJECTS, ...WARD_SPOTS, ...WARD_STATIONS, ...SPAN_KIT.objects, ...WILD_KIT.objects, ...SPAN_QUEST_OBJECTS].map((object) => [object.id, object]));

const STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };
const FACINGS: readonly Facing[] = ['north', 'east', 'south', 'west'];
const OPPOSITE: Readonly<Record<Facing, Facing>> = { north: 'south', south: 'north', east: 'west', west: 'east' };
const key = (point: TilePoint): number => point.y * 4096 + point.x;
const grow = (rect: Rect, by: number): Rect => ({ x: rect.x - by, y: rect.y - by, width: rect.width + 2 * by, height: rect.height + 2 * by });
const inside = (rect: Rect, point: TilePoint): boolean => point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;
const tilesOf = (rect: Rect): TilePoint[] => Array.from({ length: rect.width * rect.height }, (_, index) => ({ x: rect.x + (index % rect.width), y: rect.y + Math.floor(index / rect.width) }));
const isLight = (object: Placement): boolean => (object.object === STREET_LAMP || object.object === PATH_LIGHT) && 'room' in object.at && object.at.room === 'ground';
const isBuilding = (step: Step): step is Building => step.kind === 'building';

export function evenlyAlong(length: number, pitch: number): number[] {
  if (length <= 0) return [];
  const count = Math.max(1, Math.floor((length - 1) / pitch) + 1);
  if (count === 1) return [Math.floor((length - 1) / 2)];
  const step = (length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(index * step));
}

interface Opening {
  readonly tiles: readonly TilePoint[];
  readonly outward: Facing;
}

function openingsOf(map: TileLayout, building: Building): Opening[] {
  const { rect } = building;
  const sides: { outward: Facing; tiles: TilePoint[] }[] = [
    { outward: 'north', tiles: Array.from({ length: rect.width + 2 }, (_, index) => ({ x: rect.x - 1 + index, y: rect.y - 1 })) },
    { outward: 'south', tiles: Array.from({ length: rect.width + 2 }, (_, index) => ({ x: rect.x - 1 + index, y: rect.y + rect.height })) },
    { outward: 'west', tiles: Array.from({ length: rect.height }, (_, index) => ({ x: rect.x - 1, y: rect.y + index })) },
    { outward: 'east', tiles: Array.from({ length: rect.height }, (_, index) => ({ x: rect.x + rect.width, y: rect.y + index })) },
  ];
  const openings: Opening[] = [];
  for (const side of sides) {
    let run: TilePoint[] = [];
    for (const tile of [...side.tiles, undefined]) {
      if (tile && map.tileAt(tile) === 'door') {
        run.push(tile);
        continue;
      }
      if (run.length > 0) openings.push({ tiles: run, outward: side.outward });
      run = [];
    }
  }
  return openings;
}

interface Ground {
  readonly map: TileLayout;
  readonly blocked: ReadonlySet<number>;
  readonly occupied: ReadonlySet<number>;
  readonly walls: readonly Rect[];
  readonly doors: readonly TilePoint[];
  readonly size: number;
  readonly built: DistrictDefinition;
}

function groundOf(layout: DistrictLayout, land: LandMap): Ground {
  const built = buildDistrict(layout, land, {});
  const map = parseTileLayout(built.map, built.heights);
  const blocked = new Set<number>();
  const occupied = new Set<number>();
  const block = (point: TilePoint, by: number): void => {
    for (let dy = -by; dy <= by; dy++) for (let dx = -by; dx <= by; dx++) blocked.add(key({ x: point.x + dx, y: point.y + dy }));
  };
  for (const placement of built.objects) {
    const definition = OBJECTS.get(placement.objectId);
    for (const tile of objectFootprintTiles(definition, placement)) {
      block(tile, definition?.door ? 3 : 1);
      occupied.add(key(tile));
    }
  }
  for (const creature of built.creatures ?? []) for (const tile of tilesOf({ x: creature.position.x, y: creature.position.y, width: 2, height: 2 })) block(tile, 1);
  for (const npc of built.npcs) block(npc.position, 1);
  for (const anchor of Object.values(built.anchors ?? {})) block(anchor, 1);
  for (const assembly of layout.assemblies) {
    if (!('room' in assembly.at) || assembly.at.room !== 'ground') continue;
    for (const tile of tilesOf({ x: assembly.at.dx, y: assembly.at.dy, width: 4, height: 4 })) {
      block(tile, 2);
      occupied.add(key(tile));
    }
  }
  const doors: TilePoint[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const kind = map.tileAt({ x, y });
      if (kind === 'door') doors.push({ x, y });
      if (kind === 'track') block({ x, y }, 1);
    }
  }
  const walls = layout.steps.filter(isBuilding).map((step) => grow(step.rect, 1));
  return { map, blocked, occupied, walls, doors, size: layout.size.width, built };
}

function level(map: TileLayout, tiles: readonly TilePoint[]): boolean {
  const heights = tiles.map((tile) => map.heightAt(tile));
  return Math.max(...heights) - Math.min(...heights) <= 1;
}

function layable(ground: Ground, rect: Rect): boolean {
  const tiles = tilesOf(rect);
  return tiles.every((tile) => PATHABLE.has(ground.map.tileAt(tile)) && !ground.occupied.has(key(tile)) && !ground.walls.some((wall) => inside(wall, tile))) && level(ground.map, tiles);
}

function footpath(ground: Ground, start: TilePoint, goal: Rect): TilePoint[] {
  const { map, size } = ground;
  const near = grow({ x: start.x, y: start.y, width: 2, height: 2 }, 2);
  const open = (cell: TilePoint): boolean => {
    const tiles = tilesOf({ x: cell.x, y: cell.y, width: 2, height: 2 });
    for (const tile of tiles) {
      if (tile.x < 2 || tile.y < 2 || tile.x >= size - 2 || tile.y >= size - 2) return false;
      if (!PATHABLE.has(map.tileAt(tile)) || ground.occupied.has(key(tile))) return false;
      if (ground.walls.some((wall) => (inside(near, tile) ? inside(wall, tile) : inside(grow(wall, 1), tile)))) return false;
    }
    return level(map, tiles);
  };
  const arrived = (cell: TilePoint): boolean => tilesOf({ x: cell.x, y: cell.y, width: 2, height: 2 }).some((tile) => inside(goal, tile));
  if (!open(start)) return [];
  const state = (cell: TilePoint, heading: number): number => (cell.y * size + cell.x) * 4 + heading;
  const cost = new Map<number, number>();
  const from = new Map<number, number>();
  const frontier: { state: number; cost: number }[] = [];
  for (let heading = 0; heading < 4; heading++) {
    const first = state(start, heading);
    cost.set(first, heading === 2 ? 0 : TURN_COST);
    frontier.push({ state: first, cost: cost.get(first)! });
  }
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost || a.state - b.state);
    const current = frontier.shift()!;
    if (current.cost !== cost.get(current.state)) continue;
    const heading = current.state % 4;
    const index = Math.floor(current.state / 4);
    const cell = { x: index % size, y: Math.floor(index / size) };
    if (arrived(cell)) {
      const path: TilePoint[] = [];
      let walk: number | undefined = current.state;
      while (walk !== undefined) {
        const at = Math.floor(walk / 4);
        path.unshift({ x: at % size, y: Math.floor(at / size) });
        walk = from.get(walk);
      }
      return path.length > MAX_PATH ? [] : path;
    }
    for (let turn = 0; turn < 4; turn++) {
      const step = STEP[FACINGS[turn]!];
      const next = { x: cell.x + step.x, y: cell.y + step.y };
      if (!open(next)) continue;
      const climb = Math.abs(map.heightAt(next) - map.heightAt(cell));
      const nextCost = current.cost + 1 + climb * CLIMB_COST + (turn === heading ? 0 : TURN_COST);
      if (nextCost > MAX_PATH * 3 || nextCost >= (cost.get(state(next, turn)) ?? Infinity)) continue;
      cost.set(state(next, turn), nextCost);
      from.set(state(next, turn), current.state);
      frontier.push({ state: state(next, turn), cost: nextCost });
    }
  }
  return [];
}

function patches(cells: readonly TilePoint[], tile: TileKindId): Step[] {
  const steps: Step[] = [];
  let run: TilePoint[] = [];
  const flush = (): void => {
    if (run.length === 0) return;
    const xs = run.map((cell) => cell.x);
    const ys = run.map((cell) => cell.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    steps.push({ kind: 'patch', rect: { x, y, width: Math.max(...xs) - x + 2, height: Math.max(...ys) - y + 2 }, tile });
    run = [];
  };
  for (const cell of cells) {
    const last = run[run.length - 1];
    const before = run[run.length - 2];
    if (last && before && (cell.x - last.x !== last.x - before.x || cell.y - last.y !== last.y - before.y)) {
      const corner = run.pop()!;
      flush();
      run = [corner];
    }
    run.push(cell);
  }
  flush();
  return steps;
}

function headingOf(cells: readonly TilePoint[], index: number): Facing {
  const here = cells[index]!;
  const there = cells[index + 1];
  const back = cells[index - 1] ?? here;
  const dx = there ? there.x - here.x : here.x - back.x;
  const dy = there ? there.y - here.y : here.y - back.y;
  if (dx > 0) return 'east';
  if (dx < 0) return 'west';
  return dy < 0 ? 'north' : 'south';
}

function verges(cell: TilePoint, heading: Facing): Lamp[] {
  if (heading === 'north' || heading === 'south') return [{ object: PATH_LIGHT, at: { x: cell.x - 1, y: cell.y }, facing: 'east' }, { object: PATH_LIGHT, at: { x: cell.x + 2, y: cell.y }, facing: 'west' }];
  return [{ object: PATH_LIGHT, at: { x: cell.x, y: cell.y - 1 }, facing: 'south' }, { object: PATH_LIGHT, at: { x: cell.x, y: cell.y + 2 }, facing: 'north' }];
}

const along = (outward: Facing): TilePoint => (outward === 'north' || outward === 'south' ? { x: 1, y: 0 } : { x: 0, y: 1 });
const offset = (point: TilePoint, step: TilePoint, by: number): TilePoint => ({ x: point.x + step.x * by, y: point.y + step.y * by });

function frontage(building: Building, outward: Facing, depth: number): Rect {
  const { rect } = building;
  if (outward === 'south') return { x: rect.x - 1, y: rect.y + rect.height + 1, width: rect.width + 2, height: depth };
  if (outward === 'north') return { x: rect.x - 1, y: rect.y - 1 - depth, width: rect.width + 2, height: depth };
  if (outward === 'east') return { x: rect.x + rect.width + 1, y: rect.y - 1, width: depth, height: rect.height + 2 };
  return { x: rect.x - 1 - depth, y: rect.y - 1, width: depth, height: rect.height + 2 };
}

function pavingRuns(ground: Ground, rect: Rect, tile: TileKindId): Step[] {
  const steps: Step[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    let from: number | undefined;
    for (let x = rect.x; x <= rect.x + rect.width; x++) {
      const point = { x, y };
      const ok = x < rect.x + rect.width && PATHABLE.has(ground.map.tileAt(point)) && !ground.walls.some((wall) => inside(wall, point));
      if (ok && from === undefined) from = x;
      if (!ok && from !== undefined) {
        steps.push({ kind: 'patch', rect: { x: from, y, width: x - from, height: 1 }, tile });
        from = undefined;
      }
    }
  }
  return steps;
}

export function lightStreets(layout: DistrictLayout, land: LandMap): DistrictLayout {
  if (!layout.square) return layout;
  const kept = layout.objects.filter((object) => !isLight(object));
  const unlit: DistrictLayout = { ...layout, objects: kept };
  const before = groundOf(unlit, land);
  const ground = GROUND.get(layout.region);
  const buildings = layout.steps.filter(isBuilding);
  const poi = WILD_POIS[layout.id];
  const home = poi ? buildings.find((step) => step.id === poi.building.id) : undefined;
  const padKind = PADS.get(layout.id);
  const steps: Step[] = [];
  const route: TilePoint[] = [];
  const forecourts: { outward: Facing; rect: Rect }[] = [];
  const fronts: { opening: Opening; kerb: number }[] = [];

  if (home) {
    const opening = openingsOf(before.map, home)[0];
    const landmark = before.built.objects.filter((object) => object.instanceId.startsWith(layout.id + '-landmark/')).flatMap((object) => objectFootprintTiles(OBJECTS.get(object.objectId), object));
    if (opening && landmark.length > 0) {
      const pathTile = PATH_TILES[layout.region] ?? 'paving';
      const xs = landmark.map((tile) => tile.x);
      const ys = landmark.map((tile) => tile.y);
      const goal = grow({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 }, 2);
      const { outward } = opening;
      const first = opening.tiles[0]!;
      const out = STEP[outward];
      const mouth = offset(first, out, 1);
      const forecourt: Rect = outward === 'south' || outward === 'north'
        ? { x: first.x - 3, y: outward === 'south' ? mouth.y : mouth.y - 1, width: opening.tiles.length + 6, height: 2 }
        : { x: outward === 'east' ? mouth.x : mouth.x - 1, y: first.y - 3, width: 2, height: opening.tiles.length + 6 };
      if (layable(before, forecourt)) {
        steps.push({ kind: 'patch', rect: forecourt, tile: pathTile });
        forecourts.push({ outward, rect: forecourt });
      }
      const start = { x: outward === 'west' ? mouth.x - 1 : mouth.x, y: outward === 'north' ? mouth.y - 1 : mouth.y };
      const cells = footpath(before, start, goal);
      steps.push(...patches(cells, pathTile));
      route.push(...cells);
    }
  }

  if (padKind) {
    const pavement = PAVEMENTS[padKind] ?? 'paving';
    const paved = new Set<string>();
    for (const building of buildings) {
      for (const opening of openingsOf(before.map, building)) {
        fronts.push({ opening, kerb: 3 });
        const sideKey = building.id + ':' + opening.outward;
        if (paved.has(sideKey)) continue;
        paved.add(sideKey);
        steps.push(...pavingRuns(before, frontage(building, opening.outward, 2), pavement));
      }
    }
  }

  const lit: DistrictLayout = { ...unlit, steps: [...layout.steps, ...steps] };
  const after = groundOf(lit, land);
  const lamps: Lamp[] = [];
  const onRoute = new Set(route.flatMap((cell) => tilesOf({ x: cell.x, y: cell.y, width: 2, height: 2 }).map(key)));
  const usable = (point: TilePoint): boolean => {
    const { size } = after;
    if (point.x < 2 || point.y < 2 || point.x >= size - 2 || point.y >= size - 2) return false;
    if (!PATHABLE.has(after.map.tileAt(point))) return false;
    if (onRoute.has(key(point)) || after.blocked.has(key(point))) return false;
    if (after.walls.some((wall) => inside(wall, point))) return false;
    if (after.doors.some((door) => Math.max(Math.abs(door.x - point.x), Math.abs(door.y - point.y)) < 3)) return false;
    if (lamps.some((lamp) => Math.max(Math.abs(lamp.at.x - point.x), Math.abs(lamp.at.y - point.y)) < LAMP_GAP)) return false;
    return isKerb((tile) => after.map.tileAt(tile), point, ground);
  };
  const stand = (lamp: Lamp): boolean => {
    if (!usable(lamp.at)) return false;
    lamps.push(lamp);
    return true;
  };

  for (const { outward, rect } of forecourts) {
    const step = along(outward);
    const first = outward === 'south' || outward === 'north' ? { x: rect.x - 1, y: outward === 'south' ? rect.y : rect.y + 1 } : { x: outward === 'east' ? rect.x : rect.x + 1, y: rect.y - 1 };
    const length = (outward === 'south' || outward === 'north' ? rect.width : rect.height) + 1;
    stand({ object: PATH_LIGHT, at: first, facing: step.x ? 'east' : 'south' });
    stand({ object: PATH_LIGHT, at: offset(first, step, length), facing: step.x ? 'west' : 'north' });
  }

  let turn = 0;
  for (let index = 4; index < route.length - 2; index += PATH_PITCH) {
    const options = verges(route[index]!, headingOf(route, index)).filter((lamp) => {
      const behind = offset(lamp.at, STEP[OPPOSITE[lamp.facing]], 1);
      return TILE_KINDS[after.map.tileAt(behind)].walkable && !after.walls.some((wall) => inside(wall, behind));
    });
    if (options.length === 0) continue;
    if (stand(options[turn % options.length]!) || stand(options[(turn + 1) % options.length]!)) turn++;
  }

  for (const { opening, kerb } of fronts) {
    const step = along(opening.outward);
    const first = opening.tiles[0]!;
    const last = opening.tiles[opening.tiles.length - 1]!;
    stand({ object: STREET_LAMP, at: offset(offset(first, STEP[opening.outward], kerb), step, -3), facing: opening.outward });
    stand({ object: STREET_LAMP, at: offset(offset(last, STEP[opening.outward], kerb), step, 3), facing: opening.outward });
  }

  if (padKind) {
    const pad: Rect = { x: PAD_INSET, y: PAD_INSET, width: layout.size.width - 2 * PAD_INSET, height: layout.size.height - 2 * PAD_INSET };
    const sides: { from: TilePoint; step: TilePoint; length: number; facing: Facing }[] = [
      { from: { x: pad.x - 1, y: pad.y - 1 }, step: { x: 1, y: 0 }, length: pad.width + 2, facing: 'south' },
      { from: { x: pad.x + pad.width, y: pad.y - 1 }, step: { x: 0, y: 1 }, length: pad.height + 2, facing: 'west' },
      { from: { x: pad.x + pad.width, y: pad.y + pad.height }, step: { x: -1, y: 0 }, length: pad.width + 2, facing: 'north' },
      { from: { x: pad.x - 1, y: pad.y + pad.height }, step: { x: 0, y: -1 }, length: pad.height + 2, facing: 'east' },
    ];
    for (const edge of sides) {
      for (const at of evenlyAlong(edge.length, PAD_PITCH).map((by) => offset(edge.from, edge.step, by))) {
        if (stand({ object: STREET_LAMP, at, facing: edge.facing })) continue;
        for (const nudge of [1, -1, 2, -2]) if (stand({ object: STREET_LAMP, at: offset(at, edge.step, nudge), facing: edge.facing })) break;
      }
    }
  }

  const placed: Placement[] = lamps.map((lamp, index) => ({ id: layout.id + '-' + lamp.object + '-' + index, object: lamp.object, at: { room: 'ground', dx: lamp.at.x, dy: lamp.at.y }, facing: lamp.facing }));
  return { ...lit, objects: [...kept, ...placed] };
}
