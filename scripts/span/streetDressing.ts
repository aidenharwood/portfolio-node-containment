import type { DistrictLayout } from '../../packages/shared/src/world/layoutSchema.ts';
import { cutSquare, type LandMap } from '../../packages/shared/src/world/landPlan.ts';
import { buildDistrict } from '../../packages/shared/src/world/layout.ts';
import { parseTileLayout } from '../../packages/shared/src/world/district.ts';
import { objectFootprintTiles } from '../../packages/shared/src/world/footprint.ts';
import type { Facing, TilePoint } from '../../packages/shared/src/world/geometry.ts';
import type { WorldObjectDefinition } from '../../packages/shared/src/world/entities.ts';
import { isKerb } from '../../packages/shared/src/world/streetLights.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { CITY_KIT_OBJECTS } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_OBJECTS } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { TRANSIT_OBJECTS } from '../../packages/shared/src/content/catalog/transit.ts';
import { WARD_SPOTS, WARD_STATIONS } from '../../packages/shared/src/content/catalog/nodes.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { WILD_KIT } from '../../packages/shared/src/content/span/wilds.ts';
import { SPAN_QUEST_OBJECTS } from '../../packages/shared/src/content/span/quests/index.ts';
import { SPAN_REGIONS } from '../../packages/shared/src/content/span/people.ts';
import { placeAt, random, SQUARE, type PlaceSpec } from './atlas.ts';
import { megastructureGround } from './megastructures.ts';
import { nearSeam } from './plan.ts';
import { hasRhythm } from './wildGrowth.ts';

type Placement = DistrictLayout['objects'][number];
type Decal = DistrictLayout['decals'][number];
type Step = DistrictLayout['steps'][number];
type Building = Extract<Step, { kind: 'building' }>;
type Mode = 'wall' | 'free' | 'backed' | 'flat';

export interface Front {
  readonly tiles: readonly TilePoint[];
  readonly facing: Facing;
  readonly tower: boolean;
  readonly building?: Building;
}

const OBJECTS = new Map<string, WorldObjectDefinition>([...CITY_KIT_OBJECTS, ...LANDMARK_OBJECTS, ...TRANSIT_OBJECTS, ...WARD_SPOTS, ...WARD_STATIONS, ...SPAN_KIT.objects, ...WILD_KIT.objects, ...SPAN_QUEST_OBJECTS].map((object) => [object.id, object]));
const GROUND = new Map(SPAN_REGIONS.map((region) => [region.id, region.ground] as const));

export const STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };
export const MODEL_RIGHT: Readonly<Record<Facing, TilePoint>> = { south: { x: 1, y: 0 }, east: { x: 0, y: -1 }, north: { x: -1, y: 0 }, west: { x: 0, y: 1 } };
const FACINGS: readonly Facing[] = ['north', 'east', 'south', 'west'];
const FACADES: ReadonlySet<TileKindId> = new Set<TileKindId>(['wall', 'brick', 'blockwork', 'cladding']);
const TOWERS: ReadonlySet<TileKindId> = new Set<TileKindId>(['blockwork', 'cladding']);
const NEONS = ['neon-sign', 'neon-sign-cyan', 'neon-sign-acid'] as const;
const MARGIN = 2;
const LAMP_GAP = 3;

export const KERB_PITCH: readonly [number, number] = [10, 12];

const add = (point: TilePoint, step: TilePoint, by = 1): TilePoint => ({ x: point.x + step.x * by, y: point.y + step.y * by });

export function frontsOf(size: number, isFloor: (point: TilePoint) => boolean, facadeAt: (point: TilePoint) => { tower: boolean; building?: Building } | undefined): Front[] {
  const fronts: Front[] = [];
  for (const facing of FACINGS) {
    const along = facing === 'north' || facing === 'south' ? { x: 1, y: 0 } : { x: 0, y: 1 };
    const lines = facing === 'north' || facing === 'south' ? size : size;
    for (let line = 0; line < lines; line++) {
      let run: TilePoint[] = [];
      let owner: { tower: boolean; building?: Building } | undefined;
      const flush = (): void => {
        if (run.length > 0 && owner) fronts.push({ tiles: run, facing, tower: owner.tower, ...(owner.building ? { building: owner.building } : {}) });
        run = [];
        owner = undefined;
      };
      for (let step = 0; step < size; step++) {
        const tile = along.x ? { x: step, y: line } : { x: line, y: step };
        const behind = add(tile, STEP[facing], -1);
        const facade = isFloor(tile) ? facadeAt(behind) : undefined;
        if (!facade || (owner && (owner.tower !== facade.tower || owner.building !== facade.building))) flush();
        if (!facade) continue;
        owner = facade;
        run.push(tile);
      }
      flush();
    }
  }
  return fronts;
}

export function kerbStops(length: number, next: () => number): number[] {
  const stops: number[] = [];
  let at = 2 + Math.floor(next() * 3);
  while (at < length - 1) {
    stops.push(at);
    at += KERB_PITCH[0] + Math.floor(next() * (KERB_PITCH[1] - KERB_PITCH[0] + 1));
  }
  return stops;
}

export function doorRuns(building: Building, doors: readonly TilePoint[]): { facing: Facing; tiles: TilePoint[] }[] {
  const { rect } = building;
  const sideOf = (door: TilePoint): Facing | undefined => {
    if (door.y === rect.y - 1 && door.x >= rect.x && door.x < rect.x + rect.width) return 'north';
    if (door.y === rect.y + rect.height && door.x >= rect.x && door.x < rect.x + rect.width) return 'south';
    if (door.x === rect.x - 1 && door.y >= rect.y && door.y < rect.y + rect.height) return 'west';
    if (door.x === rect.x + rect.width && door.y >= rect.y && door.y < rect.y + rect.height) return 'east';
    return undefined;
  };
  const runs: { facing: Facing; tiles: TilePoint[] }[] = [];
  for (const facing of FACINGS) {
    const mine = doors.filter((door) => sideOf(door) === facing).sort((a, b) => a.x - b.x || a.y - b.y);
    let run: TilePoint[] = [];
    for (const door of mine) {
      const prev = run[run.length - 1];
      if (prev && Math.abs(prev.x - door.x) + Math.abs(prev.y - door.y) !== 1) {
        runs.push({ facing, tiles: run });
        run = [];
      }
      run.push(door);
    }
    if (run.length > 0) runs.push({ facing, tiles: run });
  }
  return runs;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const STREETS = new WeakMap<LandMap, Box[]>();

export function streetLines(boxes: readonly Box[], isAsphalt: (x: number, y: number) => boolean, isPaving: (x: number, y: number) => boolean): Box[] {
  const lines: Box[] = [];
  for (const box of boxes) {
    for (const vertical of [true, false]) {
      const start = vertical ? box.x + box.width : box.y + box.height;
      const middle = vertical ? box.y + Math.floor(box.height / 2) : box.x + Math.floor(box.width / 2);
      let gap = 0;
      while (gap < 12 && (vertical ? isAsphalt(start + gap, middle) : isAsphalt(middle, start + gap))) gap++;
      if (gap < 6 || gap > 10 || !(vertical ? isPaving(start + gap, middle) : isPaving(middle, start + gap))) continue;
      const offset = start + Math.floor(gap / 2) - 1;
      lines.push(vertical ? { x: offset, y: box.y, width: 2, height: box.height } : { x: box.x, y: offset, width: box.width, height: 2 });
    }
  }
  return lines;
}

export function towerBoxes(land: LandMap, region: { x: number; y: number; width: number; height: number }): Box[] {
  const seen = new Set<number>();
  const boxes: Box[] = [];
  const kind = (x: number, y: number): TileKindId => land.tileAt({ x, y });
  for (let y = region.y; y < region.y + region.height; y++) for (let x = region.x; x < region.x + region.width; x++) {
    const material = kind(x, y);
    if (!TOWERS.has(material) || seen.has(y * 4096 + x)) continue;
    let minX = x;
    let minY = y;
    let maxX = x;
    let maxY = y;
    let count = 0;
    const stack: [number, number][] = [[x, y]];
    seen.add(y * 4096 + x);
    while (stack.length > 0) {
      const [px, py] = stack.pop() as [number, number];
      count++;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const qx = px + dx;
        const qy = py + dy;
        if (seen.has(qy * 4096 + qx) || kind(qx, qy) !== material) continue;
        seen.add(qy * 4096 + qx);
        stack.push([qx, qy]);
      }
    }
    if (count < 64) continue;
    const midY = Math.floor((minY + maxY) / 2);
    const midX = Math.floor((minX + maxX) / 2);
    let left = minX;
    while (kind(left - 1, midY) === 'paving') left--;
    let right = maxX;
    while (kind(right + 1, midY) === 'paving') right++;
    let top = minY;
    while (kind(midX, top - 1) === 'paving') top--;
    let bottom = maxY;
    while (kind(midX, bottom + 1) === 'paving') bottom++;
    boxes.push({ x: left, y: top, width: right - left + 1, height: bottom - top + 1 });
  }
  return boxes;
}

function halcyonStreets(land: LandMap): Box[] {
  const known = STREETS.get(land);
  if (known) return known;
  const area = { x: SQUARE, y: SQUARE, width: SQUARE * 9, height: SQUARE * 3 };
  const lines = streetLines(towerBoxes(land, area), (x, y) => land.tileAt({ x, y }) === 'asphalt', (x, y) => land.tileAt({ x, y }) === 'paving');
  STREETS.set(land, lines);
  return lines;
}

interface Context {
  readonly layout: DistrictLayout;
  readonly place: PlaceSpec | undefined;
  readonly halcyon: boolean;
  readonly wreck: boolean;
  readonly site: boolean;
}

export function dressStreets(layout: DistrictLayout, land: LandMap): DistrictLayout {
  if (!layout.square) return layout;
  const size = layout.size.width;
  const { column, row } = layout.square;
  const originX = column * SQUARE;
  const originY = row * SQUARE;
  const built = buildDistrict(layout, land, {});
  const map = parseTileLayout(built.map, built.heights);
  const base = cutSquare(land, layout.square, layout.square.split ? layout.region : undefined);
  const place = placeAt(column, row);
  const context: Context = { layout, place, halcyon: layout.region === 'halcyon', wreck: layout.region === 'wreckfield', site: place?.kind === 'site' };
  const at = (x: number, y: number): number => y * size + x;
  const inside = (point: TilePoint): boolean => point.x >= 0 && point.y >= 0 && point.x < size && point.y < size;
  const kindAt = (point: TilePoint): TileKindId => map.tileAt(point);
  const heightAt = (point: TilePoint): number => map.heightAt(point);
  const grid = (): Uint8Array => new Uint8Array(size * size);
  const walkable = grid();
  const occupied = grid();
  const blocked = grid();
  const noBlock = grid();
  const noWall = grid();
  const noFlat = grid();
  const keep = (x: number, y: number, block: number, wall: number, flat: number): void => {
    const reach = Math.max(block, wall, flat);
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (!inside({ x: px, y: py })) continue;
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance <= block) noBlock[at(px, py)] = 1;
      if (distance <= wall) noWall[at(px, py)] = 1;
      if (distance <= flat) noFlat[at(px, py)] = 1;
    }
  };
  const keepRect = (rect: { x: number; y: number; width: number; height: number }, block: number, wall: number, flat: number): void => {
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) keep(x, y, block, wall, flat);
  };
  const buildings = layout.steps.filter((step): step is Building => step.kind === 'building');
  const ringOf = (building: Building) => ({ x: building.rect.x - 1, y: building.rect.y - 1, width: building.rect.width + 2, height: building.rect.height + 2 });
  const within = (rect: { x: number; y: number; width: number; height: number }, point: TilePoint): boolean => point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;
  const doors: TilePoint[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const kind = map.tileAt({ x, y });
    const index = at(x, y);
    walkable[index] = TILE_KINDS[kind].walkable && kind !== 'door' && kind !== 'track' ? 1 : 0;
    if (x < MARGIN || y < MARGIN || x >= size - MARGIN || y >= size - MARGIN) keep(x, y, 0, 0, 0);
    if (kind === 'door') {
      doors.push({ x, y });
      keep(x, y, 4, 1, 0);
    }
    if (kind === 'track') keep(x, y, 3, 1, 1);
    if (kind !== base.tiles[index] && TILE_KINDS[kind].walkable && !buildings.some((building) => within(ringOf(building), { x, y }))) keep(x, y, 1, -1, -1);
    if (nearSeam(originX + x, originY + y, 3)) keep(x, y, 0, 0, 0);
  }
  for (const building of buildings) keepRect(ringOf(building), 0, building.edge ? 0 : -1, 0);
  const lights: TilePoint[] = [];
  for (const placement of built.objects) {
    const definition = OBJECTS.get(placement.objectId);
    const landmark = placement.instanceId.startsWith(layout.id + '-landmark');
    const interactive = (definition?.interactions.length ?? 0) > 0;
    if (definition?.id === 'street-lamp' || definition?.id === 'path-light') lights.push(placement.position);
    for (const tile of objectFootprintTiles(definition, placement)) {
      if (!inside(tile)) continue;
      occupied[at(tile.x, tile.y)] = 1;
      if (definition?.blocksMovement ?? true) blocked[at(tile.x, tile.y)] = 1;
      if (definition?.door) keep(tile.x, tile.y, 5, 2, 1);
      else if (landmark) keep(tile.x, tile.y, 4, 1, 1);
      else if (interactive) keep(tile.x, tile.y, 3, 1, 1);
      else keep(tile.x, tile.y, 1, 0, 0);
    }
  }
  for (const assembly of layout.assemblies) if ('room' in assembly.at && assembly.at.room === 'ground') keepRect({ x: assembly.at.dx, y: assembly.at.dy, width: 4, height: 4 }, 3, 2, 2);
  for (const creature of built.creatures ?? []) keepRect({ x: creature.position.x, y: creature.position.y, width: 2, height: 2 }, 3, 0, 1);
  for (const npc of built.npcs) keep(npc.position.x, npc.position.y, 2, 0, 1);
  for (const anchor of Object.values(built.anchors ?? {})) keep(anchor.x, anchor.y, 3, 1, 1);
  const giants = megastructureGround(layout.square);
  for (const tile of [...giants.footings, ...giants.overhead]) {
    const [x, y] = tile.split(',').map(Number) as [number, number];
    keep(x, y, 2, 1, 1);
  }

  const lines = new Map<string, number[]>();
  const loose = (object: string): boolean => {
    const profile = OBJECTS.get(object)?.furnishing;
    return profile !== undefined && !profile.inRows && profile.mount !== 'flat' && profile.mount !== 'wall';
  };
  const remember = (object: string, x: number, y: number): void => {
    lines.set(object + ':y' + y, [...(lines.get(object + ':y' + y) ?? []), x]);
    lines.set(object + ':x' + x, [...(lines.get(object + ':x' + x) ?? []), y]);
  };
  for (const placement of built.objects) if (loose(placement.objectId)) remember(placement.objectId, placement.position.x, placement.position.y);

  const placed: Placement[] = [];
  const decals: Decal[] = [];
  const footprint = (object: string, origin: TilePoint, facing: Facing): TilePoint[] => {
    const foot = OBJECTS.get(object)?.footprint ?? { width: 1, height: 1 };
    const turned = facing === 'east' || facing === 'west';
    const width = turned ? foot.height : foot.width;
    const height = turned ? foot.width : foot.height;
    const tiles: TilePoint[] = [];
    for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) tiles.push({ x: origin.x + dx, y: origin.y + dy });
    return tiles;
  };
  const fits = (object: string, origin: TilePoint, facing: Facing, mode: Mode, backing: ReadonlySet<TileKindId> = FACADES): TilePoint[] | null => {
    const definition = OBJECTS.get(object);
    if (!definition) throw new Error('street dressing names unknown object ' + object);
    const tiles = footprint(object, origin, facing);
    const level = heightAt(tiles[0] as TilePoint);
    for (const tile of tiles) {
      if (!inside(tile)) return null;
      const index = at(tile.x, tile.y);
      if (!walkable[index] || occupied[index] || heightAt(tile) !== level) return null;
      if (mode === 'wall' && noWall[index]) return null;
      if ((mode === 'free' || mode === 'backed') && noBlock[index]) return null;
      if (mode === 'flat' && noFlat[index]) return null;
    }
    const back = STEP[facing];
    if (mode === 'wall') {
      for (const tile of tiles) {
        const behind = add(tile, back, -1);
        if (!inside(behind) || !backing.has(kindAt(behind))) return null;
      }
    }
    if (mode === 'free' || mode === 'backed') {
      const owned = new Set(tiles.map((tile) => tile.y * size + tile.x));
      for (const tile of tiles) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const near = { x: tile.x + dx, y: tile.y + dy };
          if (owned.has(near.y * size + near.x)) continue;
          if (!inside(near)) return null;
          const behindWall = mode === 'backed' && (dx === -back.x && back.x !== 0 || dy === -back.y && back.y !== 0);
          if (behindWall) {
            if (TILE_KINDS[kindAt(near)].walkable && blocked[at(near.x, near.y)]) return null;
            continue;
          }
          if (!walkable[at(near.x, near.y)] || blocked[at(near.x, near.y)]) return null;
        }
      }
      if (mode === 'backed') for (const tile of tiles) if (!FACADES.has(kindAt(add(tile, back, -1)))) return null;
    }
    if (loose(object) && (hasRhythm([...(lines.get(object + ':y' + origin.y) ?? []), origin.x]) || hasRhythm([...(lines.get(object + ':x' + origin.x) ?? []), origin.y]))) return null;
    return tiles;
  };
  const put = (object: string, origin: TilePoint, facing: Facing, mode: Mode, backing?: ReadonlySet<TileKindId>): boolean => {
    const tiles = fits(object, origin, facing, mode, backing);
    if (!tiles) return false;
    const blocks = OBJECTS.get(object)?.blocksMovement ?? true;
    for (const tile of tiles) {
      occupied[at(tile.x, tile.y)] = 1;
      if (blocks) blocked[at(tile.x, tile.y)] = 1;
    }
    if (loose(object)) remember(object, origin.x, origin.y);
    placed.push({ id: layout.id + '-d' + placed.length, object, at: { room: 'ground', dx: origin.x, dy: origin.y }, ...(facing === 'south' ? {} : { facing }) });
    return true;
  };
  const paint = (kind: Decal['kind'], rect: { x: number; y: number; width: number; height: number }, pattern?: Decal['pattern'], tint?: string): boolean => {
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) {
      if (!inside({ x, y }) || !walkable[at(x, y)] || noFlat[at(x, y)]) return false;
    }
    decals.push({ kind, at: { room: 'ground', dx: rect.x, dy: rect.y }, width: rect.width, height: rect.height, ...(pattern ? { pattern } : {}), ...(tint ? { tint } : {}) });
    return true;
  };

  const next = random(column * 92821 + row * 68917 + 7);
  const pickOf = <T>(options: readonly T[]): T => options[Math.floor(next() * options.length) % options.length] as T;
  const isFloor = (point: TilePoint): boolean => inside(point) && walkable[at(point.x, point.y)] === 1 && !buildings.some((building) => within(building.rect, point));
  const facadeAt = (point: TilePoint): { tower: boolean; building?: Building } | undefined => {
    if (!inside(point) || !FACADES.has(kindAt(point))) return undefined;
    const building = buildings.find((each) => within(ringOf(each), point) && !within(each.rect, point));
    if (building) return building.edge ? undefined : building.id === 'tram-terminal' ? undefined : { tower: false, building };
    return TOWERS.has(kindAt(point)) && base.tiles[at(point.x, point.y)] === kindAt(point) ? { tower: true } : undefined;
  };
  const fronts = frontsOf(size, isFloor, facadeAt);
  const along = (front: Front): TilePoint => (front.facing === 'north' || front.facing === 'south' ? { x: 1, y: 0 } : { x: 0, y: 1 });
  const depthOf = (front: Front, kinds: ReadonlySet<TileKindId>): number => {
    let depth = 99;
    for (const tile of front.tiles) {
      let d = 0;
      while (d < 8 && inside(add(tile, STEP[front.facing], d)) && kinds.has(kindAt(add(tile, STEP[front.facing], d)))) d++;
      depth = Math.min(depth, d);
    }
    return depth;
  };
  const doorSide = (front: Front): boolean => front.tiles.some((tile) => doors.some((door) => Math.abs(door.x - tile.x) + Math.abs(door.y - tile.y) <= 1));

  const dressFacade = (front: Front, choices: readonly { readonly objects: readonly string[]; readonly weight: number; readonly run?: number }[], density: number): void => {
    const step = along(front);
    let cursor = Math.floor(next() * 2);
    let last = '';
    while (cursor < front.tiles.length) {
      if (next() > density) {
        cursor++;
        continue;
      }
      const usable = choices.filter((choice) => !choice.objects.includes(last));
      const total = usable.reduce((sum, choice) => sum + choice.weight, 0);
      let roll = next() * total;
      const choice = usable.find((each) => (roll -= each.weight) < 0) ?? usable[0];
      if (!choice) break;
      const object = pickOf(choice.objects);
      const width = OBJECTS.get(object)?.footprint?.width ?? 1;
      const origin = front.tiles[cursor] as TilePoint;
      if (choice.run) {
        let laid = 0;
        for (let i = 0; i < choice.run && cursor + i < front.tiles.length; i++) if (put(object, add(origin, step, i), front.facing, 'wall')) laid++;
        cursor += Math.max(1, laid) + 1;
      } else if (put(object, origin, front.facing, 'wall')) cursor += width + (next() < 0.5 ? 1 : 0);
      else cursor++;
      last = object;
    }
  };

  const TOWER_FACADE = [
    { objects: ['roll-shutter'], weight: 3 },
    { objects: ['blade-sign'], weight: 2.2 },
    { objects: NEONS, weight: 2 },
    { objects: ['ac-unit'], weight: 2 },
    { objects: ['wall-vent'], weight: 1 },
    { objects: ['holo-panel'], weight: 1.4 },
    { objects: ['cable-run'], weight: 0.8, run: 2 },
  ];
  const SHOP_FRONT = [
    { objects: ['blade-sign'], weight: 2 },
    { objects: NEONS, weight: 2.5 },
    { objects: ['roll-shutter'], weight: 1.5 },
    { objects: ['ac-unit'], weight: 1 },
  ];
  const SERVICE_SIDE = [
    { objects: ['ac-unit'], weight: 2.5 },
    { objects: ['wall-vent'], weight: 1 },
    { objects: ['cable-run'], weight: 1, run: 2 },
  ];
  const QUIET_SIDE = [
    { objects: ['ac-unit'], weight: 1.5 },
    { objects: ['wall-vent'], weight: 0.7 },
    { objects: ['cable-run'], weight: 0.5, run: 2 },
  ];

  const ground = GROUND.get(layout.region);
  const lampAt = (point: TilePoint, facing: Facing): boolean => {
    if (!inside(point) || point.x < MARGIN || point.y < MARGIN || point.x >= size - MARGIN || point.y >= size - MARGIN) return false;
    if (lights.some((light) => Math.max(Math.abs(light.x - point.x), Math.abs(light.y - point.y)) < LAMP_GAP)) return false;
    if (doors.some((door) => Math.max(Math.abs(door.x - point.x), Math.abs(door.y - point.y)) < 3)) return false;
    if (!isKerb(kindAt, point, ground)) return false;
    if (!put('street-lamp', point, facing, 'free')) return false;
    lights.push(point);
    return true;
  };

  if (context.halcyon) {
    const towerFronts = fronts.filter((front) => front.tower);
    for (const front of towerFronts) dressFacade(front, TOWER_FACADE, 0.55);
    for (const front of towerFronts) {
      const depth = depthOf(front, new Set<TileKindId>(['paving']));
      if (depth < 3 || front.tiles.length < 6) continue;
      const step = along(front);
      const out = STEP[front.facing];
      const scene = next();
      const start = 1 + Math.floor(next() * Math.max(1, front.tiles.length - 6));
      const anchor = front.tiles[start] as TilePoint;
      if (scene < 0.4) {
        put('street-stall', add(anchor, out, 1), front.facing, 'free');
        put('street-stall', add(add(anchor, out, 1), step, 3), front.facing, 'free');
        put(next() < 0.5 ? 'trash-bags' : 'litter-bin', add(add(anchor, out, 1), step, 6), front.facing, 'free');
      } else if (scene < 0.7) {
        const kerb = add(anchor, out, depth - 1);
        for (let i = 0; i < 3; i++) put('parked-bike', add(kerb, step, i * 3), front.facing, 'free');
      } else if (scene < 0.85) {
        if (put('dumpster', anchor, front.facing, 'backed')) put('trash-bags', add(anchor, step, 3), front.facing, 'free');
      } else put('trash-bags', add(anchor, out, 1), front.facing, 'free');
    }
    for (const front of towerFronts) {
      const depth = depthOf(front, new Set<TileKindId>(['paving']));
      if (depth < 2 || depth > 7) continue;
      const step = along(front);
      const out = STEP[front.facing];
      const first = add(front.tiles[0] as TilePoint, out, depth);
      for (const stop of kerbStops(front.tiles.length, next)) {
        const spot = add(first, step, stop);
        if (!lampAt(spot, front.facing)) lampAt(add(spot, step, 1), front.facing) || lampAt(add(spot, step, -1), front.facing);
      }
      if (next() < 0.55) {
        const stain = add(first, step, Math.floor(next() * Math.max(1, front.tiles.length - 3)));
        const lengthwise = step.x !== 0;
        paint('water-stain', { x: stain.x, y: stain.y, width: lengthwise ? 2 + Math.floor(next() * 2) : 1, height: lengthwise ? 1 : 2 + Math.floor(next() * 2) });
      }
      if (next() < 0.25) {
        const vent = add(add(first, out, 2), step, Math.floor(next() * Math.max(1, front.tiles.length - 2)));
        put('steam-vent', vent, 'south', 'flat');
        put('steam-vent', add(vent, step, 2), 'south', 'flat');
      }
    }
  }

  if (context.halcyon) {
    for (const line of halcyonStreets(land)) {
      const local = { x: line.x - originX, y: line.y - originY, width: line.width, height: line.height };
      const vertical = local.height > local.width;
      const length = vertical ? local.height : local.width;
      let from = -1;
      for (let i = 0; i <= length; i++) {
        const cell = vertical ? { x: local.x, y: local.y + i } : { x: local.x + i, y: local.y };
        const cells = vertical ? [cell, { x: cell.x + 1, y: cell.y }] : [cell, { x: cell.x, y: cell.y + 1 }];
        const ok = i < length && cells.every((each) => inside(each) && each.x >= MARGIN && each.y >= MARGIN && each.x < size - MARGIN && each.y < size - MARGIN && walkable[at(each.x, each.y)] && !noFlat[at(each.x, each.y)] && kindAt(each) === 'asphalt');
        if (ok && from < 0) from = i;
        if (!ok && from >= 0) {
          if (i - from >= 4) paint('lane-line', vertical ? { x: local.x, y: local.y + from, width: 2, height: i - from } : { x: local.x + from, y: local.y, width: i - from, height: 2 });
          from = -1;
        }
      }
    }
  }

  const cityFronts = fronts.filter((front) => !front.tower && front.building && front.building.wall !== 'wall');
  const directorateFronts = fronts.filter((front) => !front.tower && front.building && front.building.wall === 'wall');
  const busy = context.halcyon && place !== undefined;
  for (const front of cityFronts) {
    const facing = front.facing;
    const main = doorSide(front);
    if (busy) dressFacade(front, main ? SHOP_FRONT : SERVICE_SIDE, main ? 0.7 : 0.45);
    else if (place && layout.region === 'harrow-terraces') dressFacade(front, [{ objects: ['wall-vent'], weight: 1 }], main ? 0 : 0.12);
    else if (place) dressFacade(front, main ? QUIET_SIDE.slice(0, 1) : QUIET_SIDE, main ? 0.12 : 0.2);
    else if (!main && (context.halcyon || context.wreck)) dressFacade(front, QUIET_SIDE, 0.18);
    if (!main && facing !== 'south' && (busy || context.wreck) && front.tiles.length >= 6 && next() < 0.5) {
      const spot = front.tiles[2 + Math.floor(next() * (front.tiles.length - 4))] as TilePoint;
      if (put('dumpster', spot, facing, 'backed')) put('trash-bags', add(spot, along(front), 3), facing, 'free');
    }
  }

  const sealed = context.site || layout.id === 'last-post';
  for (const building of buildings) {
    if (building.wall !== 'wall' || building.edge || building.id === 'tram-terminal') continue;
    for (const run of doorRuns(building, doors)) {
      const { facing, tiles } = run;
      const step = along({ tiles, facing, tower: false });
      const out = STEP[facing];
      const first = tiles[0] as TilePoint;
      const last = tiles[tiles.length - 1] as TilePoint;
      const before = add(add(first, out), step, -1);
      const after = add(add(last, out), step, 1);
      const lowSide = MODEL_RIGHT[facing].x + MODEL_RIGHT[facing].y > 0;
      if (sealed && tiles.length === 2) {
        putBeside(before, facing, lowSide ? 'blast-frame-left' : 'blast-frame-right');
        putBeside(after, facing, lowSide ? 'blast-frame-right' : 'blast-frame-left');
      }
      if (sealed || next() < 0.6) put(next() < 0.5 || sealed ? 'class-placard' : 'warning-sign', add(before, step, -1), facing, 'wall');
      if (sealed) put('warning-sign', add(after, step, 1), facing, 'wall');
      if (sealed || next() < 0.5) {
        const near = add(first, out);
        const lengthwise = step.x !== 0;
        const rect = lengthwise
          ? { x: Math.min(first.x, last.x) - 1, y: facing === 'south' ? near.y : near.y - 1, width: tiles.length + 2, height: 2 }
          : { x: facing === 'east' ? near.x : near.x - 1, y: Math.min(first.y, last.y) - 1, width: 2, height: tiles.length + 2 };
        paint('stencil', rect, 'border', sealed ? '#e8b81c' : undefined);
      }
    }
  }
  if (sealed) {
    for (const front of directorateFronts) {
      if (next() < (doorSide(front) ? 0.6 : 0.25)) put('siren-beacon', front.tiles[Math.min(1, front.tiles.length - 1)] as TilePoint, front.facing, 'wall');
      if (!doorSide(front) && next() < 0.5) dressFacade(front, [{ objects: ['warning-sign'], weight: 1 }, { objects: ['cable-run'], weight: 1, run: 2 }], 0.2);
    }
  }
  function putBeside(point: TilePoint, facing: Facing, object: string): boolean {
    if (!inside(point)) return false;
    const index = at(point.x, point.y);
    if (!walkable[index] || occupied[index] || !FACADES.has(kindAt(add(point, STEP[facing], -1)))) return false;
    occupied[index] = 1;
    placed.push({ id: layout.id + '-d' + placed.length, object, at: { room: 'ground', dx: point.x, dy: point.y }, ...(facing === 'south' ? {} : { facing }) });
    return true;
  }

  for (const building of buildings) {
    if (building.edge !== 'fence') continue;
    const { rect } = building;
    const sides: { from: TilePoint; step: TilePoint; length: number; facing: Facing }[] = [
      { from: { x: rect.x, y: rect.y }, step: { x: 1, y: 0 }, length: rect.width, facing: 'south' },
      { from: { x: rect.x, y: rect.y + rect.height - 1 }, step: { x: 1, y: 0 }, length: rect.width, facing: 'north' },
      { from: { x: rect.x, y: rect.y }, step: { x: 0, y: 1 }, length: rect.height, facing: 'east' },
      { from: { x: rect.x + rect.width - 1, y: rect.y }, step: { x: 0, y: 1 }, length: rect.height, facing: 'west' },
    ];
    for (const side of sides) {
      for (let i = 1; i + 1 < side.length - 1; i += 2) {
        const origin = add(side.from, side.step, i);
        const tiles = footprint('razor-wire', origin, side.facing);
        if (tiles.some((tile) => doors.some((door) => Math.max(Math.abs(door.x - tile.x), Math.abs(door.y - tile.y)) <= 2))) continue;
        if (tiles.some((tile) => !inside(tile) || !walkable[at(tile.x, tile.y)] || occupied[at(tile.x, tile.y)] || kindAt(add(tile, STEP[side.facing], -1)) !== 'fence')) continue;
        for (const tile of tiles) occupied[at(tile.x, tile.y)] = 1;
        placed.push({ id: layout.id + '-d' + placed.length, object: 'razor-wire', at: { room: building.id, dx: origin.x - rect.x, dy: origin.y - rect.y }, ...(side.facing === 'south' ? {} : { facing: side.facing }) });
      }
    }
  }

  const open = (rect: { x: number; y: number; width: number; height: number }): TilePoint[] => {
    const spots: TilePoint[] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) if (inside({ x, y }) && walkable[at(x, y)] && !noBlock[at(x, y)] && !occupied[at(x, y)]) spots.push({ x, y });
    return spots;
  };
  const scatterScene = (rect: { x: number; y: number; width: number; height: number }, scene: (spot: TilePoint) => boolean, tries = 12): boolean => {
    const spots = open(rect);
    for (let attempt = 0; attempt < tries && spots.length > 0; attempt++) {
      const spot = spots[Math.floor(next() * spots.length)] as TilePoint;
      if (scene(spot)) return true;
    }
    return false;
  };
  const padRect = { x: 6, y: 6, width: size - 12, height: size - 12 };
  const cornerRects = [
    { x: 6, y: 6, width: 12, height: 10 },
    { x: size - 18, y: 6, width: 12, height: 10 },
    { x: 6, y: size - 16, width: 12, height: 10 },
    { x: size - 18, y: size - 16, width: 12, height: 10 },
  ];

  if (context.site) {
    const towers = [...cornerRects].sort(() => next() - 0.5).slice(0, 2);
    for (const rect of towers) scatterScene(rect, (spot) => put('sentry-tower', spot, pickOf(FACINGS), 'free'), 30);
    for (let chicane = 0; chicane < 2; chicane++) {
      scatterScene(padRect, (spot) => {
        const facing = next() < 0.5 ? 'south' : 'east';
        const step = facing === 'south' ? { x: 1, y: 0 } : { x: 0, y: 1 };
        if (!put('jersey-barrier', spot, facing, 'free')) return false;
        put('jersey-barrier', add(spot, step, 3), facing, 'free');
        if (next() < 0.5) put('jersey-barrier', add(spot, step, 6), facing, 'free');
        return true;
      }, 30);
    }
    scatterScene(padRect, (spot) => {
      if (!put('decon-tent', spot, 'south', 'free')) return false;
      const posts = add(spot, { x: 0, y: 1 }, 3);
      for (let i = -1; i < 3; i++) put('cordon-post', add(posts, { x: 1, y: 0 }, i * 2), 'south', 'free');
      return true;
    }, 40);
    const holding = buildings.find((building) => building.id.includes('holding') || building.id.includes('cell'));
    const cluster = holding ? { x: holding.rect.x - 4, y: holding.rect.y + holding.rect.height + 2, width: holding.rect.width + 8, height: 6 } : padRect;
    scatterScene(cluster, (spot) => {
      if (!put('containment-crate', spot, 'south', 'free')) return false;
      put('containment-crate', add(spot, { x: 3, y: 0 }), next() < 0.5 ? 'south' : 'north', 'free');
      return true;
    }, 30);
    scatterScene(padRect, (spot) => paint('stencil', { x: spot.x, y: spot.y, width: 4, height: 4 }, 'compass', '#e8e4d8'), 20);
    scatterScene(padRect, (spot) => paint('stencil', { x: spot.x, y: spot.y, width: 5, height: 2 }, 'stripe', '#e8b81c'), 20);
  } else if (layout.id === 'last-post') {
    scatterScene(padRect, (spot) => put('jersey-barrier', spot, 'south', 'free') && (put('jersey-barrier', add(spot, { x: 3, y: 0 }), 'south', 'free') || true), 30);
    scatterScene(padRect, (spot) => put('containment-crate', spot, 'south', 'free'), 20);
  }

  if (place && !context.site && (place.kind === 'hub' || place.kind === 'town')) {
    const stalls = context.halcyon ? 3 : 1;
    for (let i = 0; i < stalls; i++) {
      scatterScene(padRect, (spot) => {
        const facing = next() < 0.5 ? 'south' : 'north';
        if (!put('street-stall', spot, facing, 'free')) return false;
        put('street-stall', add(spot, { x: 3, y: 0 }), facing, 'free');
        put(next() < 0.5 ? 'trash-bags' : 'litter-bin', add(spot, { x: 6, y: 0 }), facing, 'free');
        return true;
      }, 30);
    }
    if (context.halcyon) {
      for (let i = 0; i < 2; i++) scatterScene(padRect, (spot) => put('parked-bike', spot, 'south', 'free') && (put('parked-bike', add(spot, { x: 3, y: 0 }), 'south', 'free') || true), 20);
      for (let i = 0; i < 3; i++) scatterScene(padRect, (spot) => paint('water-stain', { x: spot.x, y: spot.y, width: 2 + Math.floor(next() * 2), height: 1 + Math.floor(next() * 2) }), 10);
      scatterScene(padRect, (spot) => put('steam-vent', spot, 'south', 'flat') && (put('steam-vent', add(spot, { x: 2, y: 1 }), 'south', 'flat') || true), 10);
    }
  }

  if (context.wreck) {
    const yards = place ? cornerRects : [{ x: 10, y: 10, width: size - 20, height: size - 20 }];
    const count = place ? 2 : context.site ? 1 : 1;
    for (let i = 0; i < count; i++) {
      scatterScene(yards[i % yards.length] as { x: number; y: number; width: number; height: number }, (spot) => {
        const facing = next() < 0.5 ? 'south' : 'east';
        if (!put('cargo-container', spot, facing, 'free')) return false;
        const beside = facing === 'south' ? { x: 0, y: 3 } : { x: 3, y: 0 };
        put(next() < 0.5 ? 'containment-crate' : 'barricade', add(spot, beside), facing, 'free');
        put('trash-bags', add(spot, beside, 2), facing, 'free');
        return true;
      }, 40);
    }
  }

  return placed.length === 0 && decals.length === 0 ? layout : { ...layout, objects: [...layout.objects, ...placed], decals: [...layout.decals, ...decals] };
}
