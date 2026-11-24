import type { DistrictLayout } from '../../packages/shared/src/world/layoutSchema.ts';
import type { LandMap } from '../../packages/shared/src/world/landPlan.ts';
import { buildDistrict } from '../../packages/shared/src/world/layout.ts';
import { parseTileLayout, type DistrictDefinition, type TileLayout } from '../../packages/shared/src/world/district.ts';
import { objectFootprintTiles } from '../../packages/shared/src/world/footprint.ts';
import type { Facing, TilePoint } from '../../packages/shared/src/world/geometry.ts';
import type { WorldObjectDefinition } from '../../packages/shared/src/world/entities.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { evenlyAlong, isKerb } from '../../packages/shared/src/world/streetLights.ts';
import { CITY_KIT_OBJECTS } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_OBJECTS } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { TRANSIT_OBJECTS } from '../../packages/shared/src/content/catalog/transit.ts';
import { WARD_SPOTS, WARD_STATIONS } from '../../packages/shared/src/content/catalog/nodes.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { WILD_KIT } from '../../packages/shared/src/content/span/wilds.ts';
import { SPAN_QUEST_OBJECTS } from '../../packages/shared/src/content/span/quests/index.ts';
import { PAD_INSET } from './atlas.ts';
import { PLACE_SPECS } from './places.ts';
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
  readonly at: TilePoint;
  readonly facing: Facing;
}

const LAMP = 'street-lamp';
const PATH_PITCH = 4;
const PAD_PITCH = 10;
const LAMP_GAP = 3;
const MAX_PATH = 70;
const TURN_COST = 6;

const PATH_TILES: Readonly<Record<string, TileKindId>> = {
  'kestrel-reach': 'paving',
  'harrow-terraces': 'gravel',
  halcyon: 'paving',
  wreckfield: 'plating',
  'glass-steppe': 'gravel',
  'the-spindle': 'plating',
};

const PATHABLE: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'soil', 'gravel', 'rust', 'paving', 'asphalt', 'concrete', 'plating', 'grate']);

const OBJECTS = new Map<string, WorldObjectDefinition>([...CITY_KIT_OBJECTS, ...LANDMARK_OBJECTS, ...TRANSIT_OBJECTS, ...WARD_SPOTS, ...WARD_STATIONS, ...SPAN_KIT.objects, ...WILD_KIT.objects, ...SPAN_QUEST_OBJECTS].map((object) => [object.id, object]));

const STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };
const FACINGS: readonly Facing[] = ['north', 'east', 'south', 'west'];
const key = (point: TilePoint): number => point.y * 4096 + point.x;
const grow = (rect: Rect, by: number): Rect => ({ x: rect.x - by, y: rect.y - by, width: rect.width + 2 * by, height: rect.height + 2 * by });
const inside = (rect: Rect, point: TilePoint): boolean => point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;
const isLamp = (object: Placement): boolean => object.object === LAMP && 'room' in object.at && object.at.room === 'ground';

const isBuilding = (step: Step): step is Building => step.kind === 'building';

function doorTiles(map: TileLayout, building: Building): TilePoint[] {
  const { rect } = building;
  const tiles: TilePoint[] = [];
  for (let x = rect.x - 1; x <= rect.x + rect.width; x++) {
    for (const y of [rect.y - 1, rect.y + rect.height]) if (map.tileAt({ x, y }) === 'door') tiles.push({ x, y });
  }
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (const x of [rect.x - 1, rect.x + rect.width]) if (map.tileAt({ x, y }) === 'door') tiles.push({ x, y });
  }
  return tiles;
}

const outwardOf = (building: Building, door: TilePoint): Facing => {
  const { rect } = building;
  if (door.y < rect.y) return 'north';
  if (door.y >= rect.y + rect.height) return 'south';
  return door.x < rect.x ? 'west' : 'east';
};

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
  const built: DistrictDefinition = buildDistrict(layout, land, {});
  const map = parseTileLayout(built.map);
  const blocked = new Set<number>();
  const occupied = new Set<number>();
  const block = (point: TilePoint, by: number): void => {
    for (let dy = -by; dy <= by; dy++) for (let dx = -by; dx <= by; dx++) blocked.add(key({ x: point.x + dx, y: point.y + dy }));
  };
  for (const placement of built.objects) {
    const definition = OBJECTS.get(placement.objectId);
    const reach = definition?.door ? 3 : 1;
    for (const tile of objectFootprintTiles(definition, placement)) {
      block(tile, reach);
      occupied.add(key(tile));
    }
  }
  for (const creature of built.creatures ?? []) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) block({ x: creature.position.x + dx, y: creature.position.y + dy }, 1);
  for (const npc of built.npcs) block(npc.position, 1);
  for (const anchor of Object.values(built.anchors ?? {})) block(anchor, 1);
  for (const assembly of layout.assemblies) {
    if (!('room' in assembly.at) || assembly.at.room !== 'ground') continue;
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) block({ x: assembly.at.dx + dx, y: assembly.at.dy + dy }, 2);
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

function footpath(ground: Ground, start: TilePoint, goal: Rect): TilePoint[] {
  const { map, size } = ground;
  const near = grow({ x: start.x, y: start.y, width: 2, height: 2 }, 2);
  const open = (cell: TilePoint): boolean => {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const tile = { x: cell.x + dx, y: cell.y + dy };
        if (tile.x < 2 || tile.y < 2 || tile.x >= size - 2 || tile.y >= size - 2) return false;
        if (!PATHABLE.has(map.tileAt(tile)) || ground.walls.some((wall) => inside(near, tile) ? inside(wall, tile) : inside(grow(wall, 1), tile))) return false;
        if (ground.occupied.has(key(tile))) return false;
      }
    }
    return true;
  };
  const arrived = (cell: TilePoint): boolean => inside(goal, cell) || inside(goal, { x: cell.x + 1, y: cell.y + 1 }) || inside(goal, { x: cell.x + 1, y: cell.y }) || inside(goal, { x: cell.x, y: cell.y + 1 });
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
      const nextState = state(next, turn);
      const nextCost = current.cost + 1 + (turn === heading ? 0 : TURN_COST);
      if (nextCost > MAX_PATH * 2 + TURN_COST * 6) continue;
      if (nextCost >= (cost.get(nextState) ?? Infinity)) continue;
      cost.set(nextState, nextCost);
      from.set(nextState, current.state);
      frontier.push({ state: nextState, cost: nextCost });
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
    const straight = !last || !before || (cell.x - last.x === last.x - before.x && cell.y - last.y === last.y - before.y);
    if (!straight) {
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
  const there = cells[index + 1] ?? here;
  const back = cells[index - 1] ?? here;
  const dx = there !== here ? there.x - here.x : here.x - back.x;
  const dy = there !== here ? there.y - here.y : here.y - back.y;
  if (dx > 0) return 'east';
  if (dx < 0) return 'west';
  return dy < 0 ? 'north' : 'south';
}

function verges(cell: TilePoint, heading: Facing): Lamp[] {
  if (heading === 'north' || heading === 'south') return [{ at: { x: cell.x - 1, y: cell.y }, facing: 'east' }, { at: { x: cell.x + 2, y: cell.y }, facing: 'west' }];
  return [{ at: { x: cell.x, y: cell.y - 1 }, facing: 'south' }, { at: { x: cell.x, y: cell.y + 2 }, facing: 'north' }];
}

export function lightStreets(layout: DistrictLayout, land: LandMap): DistrictLayout {
  if (!layout.square) return layout;
  const kept = layout.objects.filter((object) => !isLamp(object));
  const unlit: DistrictLayout = { ...layout, objects: kept };
  const before = groundOf(unlit, land);
  const buildings = layout.steps.filter(isBuilding);
  const poi = WILD_POIS[layout.id];
  const home = poi ? buildings.find((step) => step.id === poi.building.id) : undefined;
  const pathTile = PATH_TILES[layout.region] ?? 'paving';
  const steps: Step[] = [];
  const route: TilePoint[] = [];
  const forecourts: { outward: Facing; rect: Rect }[] = [];

  if (home) {
    const door = doorTiles(before.map, home).sort((a, b) => a.x - b.x || a.y - b.y)[0];
    const landmark = before.built.objects.filter((object) => object.instanceId.startsWith(layout.id + '-landmark/')).flatMap((object) => objectFootprintTiles(OBJECTS.get(object.objectId), object));
    if (door && landmark.length > 0) {
      const xs = landmark.map((tile) => tile.x);
      const ys = landmark.map((tile) => tile.y);
      const goal = grow({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 }, 2);
      const outward = outwardOf(home, door);
      const forecourt: Rect = outward === 'south' || outward === 'north'
        ? { x: door.x - 3, y: outward === 'south' ? door.y + 1 : door.y - 2, width: 8, height: 2 }
        : { x: outward === 'east' ? door.x + 1 : door.x - 2, y: door.y - 3, width: 2, height: 8 };
      const cells = footpath(before, { x: outward === 'west' ? door.x - 2 : outward === 'east' ? door.x + 1 : door.x, y: outward === 'north' ? door.y - 2 : outward === 'south' ? door.y + 1 : door.y }, goal);
      let fits = true;
      for (let y = forecourt.y; y < forecourt.y + forecourt.height; y++) for (let x = forecourt.x; x < forecourt.x + forecourt.width; x++) if (!PATHABLE.has(before.map.tileAt({ x, y }))) fits = false;
      if (fits) {
        steps.push({ kind: 'patch', rect: forecourt, tile: pathTile });
        forecourts.push({ outward, rect: forecourt });
      }
      steps.push(...patches(cells, pathTile));
      route.push(...cells);
    }
  }

  const paved: DistrictLayout = { ...unlit, steps: [...layout.steps, ...steps] };
  const after = groundOf(paved, land);
  const lamps: Lamp[] = [];
  const onRoute = new Set(route.flatMap((cell) => [key(cell), key({ x: cell.x + 1, y: cell.y }), key({ x: cell.x, y: cell.y + 1 }), key({ x: cell.x + 1, y: cell.y + 1 })]));
  const usable = (point: TilePoint): boolean => {
    const { size } = after;
    if (point.x < 2 || point.y < 2 || point.x >= size - 2 || point.y >= size - 2) return false;
    const kind = after.map.tileAt(point);
    if (!PATHABLE.has(kind) && kind !== 'terrazzo' && kind !== 'hazard') return false;
    if (onRoute.has(key(point)) || after.blocked.has(key(point))) return false;
    if (after.walls.some((wall) => inside(wall, point))) return false;
    if (after.doors.some((door) => Math.max(Math.abs(door.x - point.x), Math.abs(door.y - point.y)) < 3)) return false;
    if (lamps.some((lamp) => Math.max(Math.abs(lamp.at.x - point.x), Math.abs(lamp.at.y - point.y)) < LAMP_GAP)) return false;
    return isKerb((tile) => after.map.tileAt(tile), point);
  };
  const stand = (lamp: Lamp): boolean => {
    if (!usable(lamp.at)) return false;
    lamps.push(lamp);
    return true;
  };

  for (const { outward, rect } of forecourts) {
    const flanks: Lamp[] = outward === 'south' || outward === 'north'
      ? [{ at: { x: rect.x, y: outward === 'south' ? rect.y : rect.y + 1 }, facing: outward }, { at: { x: rect.x + rect.width - 1, y: outward === 'south' ? rect.y : rect.y + 1 }, facing: outward }]
      : [{ at: { x: outward === 'east' ? rect.x : rect.x + 1, y: rect.y }, facing: outward }, { at: { x: outward === 'east' ? rect.x : rect.x + 1, y: rect.y + rect.height - 1 }, facing: outward }];
    for (const flank of flanks) stand(flank);
  }

  let side = 0;
  for (let index = 3; index < route.length - 2; index += PATH_PITCH) {
    const options = verges(route[index]!, headingOf(route, index)).filter((lamp) => {
      const behind = { x: lamp.at.x - STEP[lamp.facing].x, y: lamp.at.y - STEP[lamp.facing].y };
      return TILE_KINDS[after.map.tileAt(behind)].walkable && !after.walls.some((wall) => inside(wall, behind));
    });
    if (options.length === 0) continue;
    if (stand(options[side % options.length]!) || stand(options[(side + 1) % options.length]!)) side++;
  }

  if (PLACE_SPECS[layout.id]) {
    for (const building of buildings) {
      for (const door of doorTiles(after.map, building).sort((a, b) => a.x - b.x || a.y - b.y).filter((tile, index, all) => index === 0 || Math.abs(tile.x - all[index - 1]!.x) + Math.abs(tile.y - all[index - 1]!.y) > 1)) {
        const outward = outwardOf(building, door);
        const out = STEP[outward];
        const row = { x: door.x + out.x, y: door.y + out.y };
        const along = outward === 'north' || outward === 'south' ? { x: 1, y: 0 } : { x: 0, y: 1 };
        stand({ at: { x: row.x - along.x * 3, y: row.y - along.y * 3 }, facing: outward });
        stand({ at: { x: row.x + along.x * 4, y: row.y + along.y * 4 }, facing: outward });
      }
    }
    const pad: Rect = { x: PAD_INSET, y: PAD_INSET, width: layout.size.width - 2 * PAD_INSET, height: layout.size.height - 2 * PAD_INSET };
    const sides: { from: TilePoint; step: TilePoint; length: number; facing: Facing }[] = [
      { from: { x: pad.x - 1, y: pad.y - 1 }, step: { x: 1, y: 0 }, length: pad.width + 2, facing: 'south' },
      { from: { x: pad.x + pad.width, y: pad.y - 1 }, step: { x: 0, y: 1 }, length: pad.height + 2, facing: 'west' },
      { from: { x: pad.x + pad.width, y: pad.y + pad.height }, step: { x: -1, y: 0 }, length: pad.width + 2, facing: 'north' },
      { from: { x: pad.x - 1, y: pad.y + pad.height }, step: { x: 0, y: -1 }, length: pad.height + 2, facing: 'east' },
    ];
    for (const edge of sides) {
      for (const offset of evenlyAlong(edge.length, PAD_PITCH)) {
        const at = { x: edge.from.x + edge.step.x * offset, y: edge.from.y + edge.step.y * offset };
        if (stand({ at, facing: edge.facing })) continue;
        for (const nudge of [1, -1, 2, -2]) if (stand({ at: { x: at.x + edge.step.x * nudge, y: at.y + edge.step.y * nudge }, facing: edge.facing })) break;
      }
    }
  }

  if (lamps.length === 0) throw new Error(layout.id + ': no road or path to stand a street lamp beside');
  const placed: Placement[] = lamps.map((lamp, index) => ({ id: layout.id + '-street-lamp-' + index, object: LAMP, at: { room: 'ground', dx: lamp.at.x, dy: lamp.at.y }, facing: lamp.facing }));
  return { ...paved, objects: [...kept, ...placed] };
}
