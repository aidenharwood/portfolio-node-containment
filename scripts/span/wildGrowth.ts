import type { DistrictLayout } from '../../packages/shared/src/world/layoutSchema.ts';
import { cutSquare, type LandMap } from '../../packages/shared/src/world/landPlan.ts';
import { buildDistrict } from '../../packages/shared/src/world/layout.ts';
import { parseTileLayout } from '../../packages/shared/src/world/district.ts';
import { objectFootprintTiles } from '../../packages/shared/src/world/footprint.ts';
import type { Facing } from '../../packages/shared/src/world/geometry.ts';
import type { WorldObjectDefinition } from '../../packages/shared/src/world/entities.ts';
import { TILE_KINDS, type TileKindId } from '../../packages/shared/src/world/tiles.ts';
import { valueNoise } from '../../packages/shared/src/world/noise.ts';
import { RHYTHM_LIMIT } from '../../packages/shared/src/content/furnishingCatalogue.ts';
import { CITY_KIT_OBJECTS } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_OBJECTS } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { TRANSIT_OBJECTS } from '../../packages/shared/src/content/catalog/transit.ts';
import { WARD_SPOTS, WARD_STATIONS } from '../../packages/shared/src/content/catalog/nodes.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { WILD_KIT } from '../../packages/shared/src/content/span/wilds.ts';
import { SPAN_QUEST_OBJECTS } from '../../packages/shared/src/content/span/quests/index.ts';
import { HULL, padOf, placeAt, random, SQUARE } from './atlas.ts';
import { megastructureGround } from './megastructures.ts';
import { distanceField } from './relief.ts';

type Placement = DistrictLayout['objects'][number];
type Feature = 'stone' | 'woods' | 'water' | 'soil' | 'hull';

interface Member {
  readonly object: string;
  readonly count: readonly [number, number];
  readonly at?: 'core' | 'rim';
}

interface Stand {
  readonly weight: number;
  readonly radius: readonly [number, number];
  readonly members: readonly Member[];
  readonly near?: Feature;
  readonly only?: boolean;
  readonly boost?: number;
  readonly facing?: Facing;
}

interface Growth {
  readonly density: number;
  readonly stands: readonly Stand[];
  readonly edge?: readonly Member[];
  readonly bounds?: { readonly hedge: string; readonly wall: string };
  readonly orchard?: string;
}

export const WILD_MARGIN = 3;
const COVER_SCALE = 17;
const COVER_THRESHOLD = 0.4;
const STAND_SPACING = 7;
const REACH: Readonly<Record<Feature, number>> = { stone: 7, woods: 4, water: 3, soil: 2, hull: 24 };
const WINDOW = 10;
const FACINGS: readonly Facing[] = ['south', 'east', 'north', 'west'];
const NATURAL: ReadonlySet<TileKindId> = new Set<TileKindId>(['grass', 'dirt', 'soil', 'gravel', 'rust', 'asphalt', 'concrete']);
const FEATURES: Readonly<Record<Exclude<Feature, 'hull'>, ReadonlySet<TileKindId>>> = {
  stone: new Set<TileKindId>(['rock', 'cliff']),
  woods: new Set<TileKindId>(['trees']),
  water: new Set<TileKindId>(['water', 'coolant']),
  soil: new Set<TileKindId>(['soil']),
};

const m = (object: string, low: number, high: number, at?: Member['at']): Member => ({ object, count: [low, high], ...(at ? { at } : {}) });

const DEADWOOD: Stand = { weight: 0.5, radius: [2, 3], members: [m('tree-stump', 1, 2), m('fallen-log', 0, 1), m('tall-grass', 1, 2, 'rim')] };
const RUIN: Stand = { weight: 0.6, radius: [3, 4], members: [m('ruin-wall', 1, 2, 'core'), m('rubble-heap', 0, 1, 'rim'), m('tall-grass', 1, 3, 'rim')] };

export const WILD_GROWTH: Readonly<Record<string, Growth>> = {
  'kestrel-reach': {
    density: 5,
    stands: [
      { weight: 3, radius: [4, 6], members: [m('broadleaf-tree', 3, 6, 'core'), m('birch-tree', 0, 2), m('bush', 2, 4, 'rim'), m('wildflowers', 2, 4, 'rim'), m('tree-stump', 0, 1, 'rim'), m('fallen-log', 0, 1, 'rim')] },
      { weight: 2, radius: [3, 5], members: [m('birch-tree', 3, 5, 'core'), m('tall-grass', 2, 4), m('wildflowers', 1, 3, 'rim')] },
      { weight: 3, radius: [3, 6], members: [m('wildflowers', 4, 8), m('tall-grass', 3, 6), m('bush', 0, 1)] },
      { weight: 1.5, radius: [1, 2], members: [m('broadleaf-tree', 1, 1, 'core'), m('wildflowers', 1, 2, 'rim'), m('bush', 0, 1, 'rim')] },
      { weight: 1, radius: [3, 5], near: 'stone', boost: 6, members: [m('boulder', 2, 4), m('tall-grass', 1, 3, 'rim'), m('wildflowers', 0, 2, 'rim')] },
      { weight: 2, radius: [2, 4], near: 'water', only: true, members: [m('tall-grass', 3, 6), m('boulder', 0, 2)] },
      { ...RUIN, members: [...RUIN.members, m('bush', 1, 2, 'rim')] },
      DEADWOOD,
    ],
    edge: [m('broadleaf-tree', 1, 1), m('birch-tree', 1, 1), m('bush', 1, 1), m('bush', 1, 1), m('tree-stump', 1, 1)],
  },
  'harrow-terraces': {
    density: 4.5,
    stands: [
      { weight: 2, radius: [3, 5], members: [m('broadleaf-tree', 2, 4, 'core'), m('bush', 2, 3, 'rim'), m('tree-stump', 0, 1, 'rim'), m('tall-grass', 1, 3, 'rim')] },
      { weight: 1.5, radius: [2, 4], near: 'soil', boost: 4, members: [m('hay-bale', 2, 5), m('tall-grass', 1, 2, 'rim')] },
      { weight: 2, radius: [3, 5], members: [m('wildflowers', 3, 6), m('tall-grass', 3, 6)] },
      { weight: 1.5, radius: [1, 2], members: [m('orchard-tree', 1, 1, 'core'), m('wildflowers', 1, 2, 'rim')] },
      { weight: 4, radius: [3, 5], near: 'stone', only: true, members: [m('boulder', 2, 4), m('rock-outcrop', 0, 1, 'core'), m('tall-grass', 1, 3, 'rim')] },
      RUIN,
      DEADWOOD,
    ],
    edge: [m('broadleaf-tree', 1, 1), m('bush', 1, 1), m('bush', 1, 1), m('tree-stump', 1, 1)],
    bounds: { hedge: 'hedgerow', wall: 'field-wall' },
    orchard: 'orchard-tree',
  },
  halcyon: {
    density: 3.4,
    stands: [
      { weight: 3, radius: [2, 4], members: [m('overgrown-planter', 2, 4, 'core'), m('tall-grass', 1, 3, 'rim'), m('rubble-heap', 0, 1, 'rim')] },
      { weight: 3, radius: [2, 4], members: [m('rubble-heap', 2, 4), m('tall-grass', 1, 3), m('ruin-wall', 0, 1, 'core')] },
      { weight: 1.5, radius: [3, 4], members: [m('ruin-wall', 1, 2, 'core'), m('rubble-heap', 1, 2, 'rim'), m('tall-grass', 1, 3, 'rim'), m('bush', 0, 1, 'rim')] },
      { weight: 2, radius: [2, 4], members: [m('tall-grass', 3, 6), m('bush', 0, 2)] },
      DEADWOOD,
    ],
  },
  wreckfield: {
    density: 5.5,
    stands: [
      { weight: 2, radius: [3, 5], near: 'hull', boost: 5, members: [m('scrap-mound', 2, 5), m('tyre-heap', 1, 3), m('wrecked-panel', 0, 2, 'rim')] },
      { weight: 1.5, radius: [2, 4], members: [m('tyre-heap', 3, 5), m('scrap-mound', 0, 1)] },
      { weight: 2.5, radius: [3, 5], members: [m('dead-tree', 2, 5, 'core'), m('tree-stump', 1, 2, 'rim'), m('fallen-log', 0, 1, 'rim'), m('tall-grass', 1, 3, 'rim')] },
      { weight: 1.5, radius: [2, 4], near: 'hull', boost: 3, members: [m('wrecked-panel', 1, 2, 'core'), m('scrap-mound', 1, 2, 'rim')] },
      { weight: 3, radius: [3, 5], near: 'stone', only: true, members: [m('boulder', 2, 4), m('rock-outcrop', 0, 2, 'core')] },
      RUIN,
      DEADWOOD,
    ],
  },
  'glass-steppe': {
    density: 4,
    stands: [
      { weight: 4, radius: [3, 6], members: [m('glass-crystals', 3, 7), m('fused-shards', 3, 6)] },
      { weight: 2, radius: [3, 5], near: 'stone', boost: 4, members: [m('obsidian-outcrop', 1, 3, 'core'), m('fused-shards', 2, 4, 'rim'), m('glass-crystals', 0, 2, 'rim')] },
      { weight: 2, radius: [2, 5], members: [m('fused-shards', 4, 8)] },
      { weight: 1, radius: [3, 4], members: [m('ruin-wall', 1, 2, 'core'), m('rubble-heap', 0, 1, 'rim'), m('fused-shards', 1, 3, 'rim')] },
      { ...DEADWOOD, weight: 0.3 },
    ],
  },
  'the-spindle': {
    density: 5,
    stands: [
      { weight: 4, radius: [3, 6], facing: 'east', members: [m('windbent-pine', 3, 6, 'core'), m('boulder', 0, 2, 'rim'), m('tree-stump', 0, 1, 'rim')] },
      { weight: 3, radius: [3, 5], near: 'stone', boost: 2, members: [m('rock-outcrop', 1, 2, 'core'), m('boulder', 2, 4)] },
      { weight: 1.5, radius: [1, 2], facing: 'east', members: [m('windbent-pine', 1, 2, 'core'), m('boulder', 0, 1, 'rim')] },
      RUIN,
      { ...DEADWOOD, members: [m('fallen-log', 1, 1), m('tree-stump', 1, 2)] },
    ],
  },
};

const OBJECTS = new Map<string, WorldObjectDefinition>([...CITY_KIT_OBJECTS, ...LANDMARK_OBJECTS, ...TRANSIT_OBJECTS, ...WARD_SPOTS, ...WARD_STATIONS, ...SPAN_KIT.objects, ...WILD_KIT.objects, ...SPAN_QUEST_OBJECTS].map((object) => [object.id, object]));

const SET_PIECE_PART = /^(.*)-set-(\d+)-\d+$/;

export const coverAt = (x: number, y: number, scale = COVER_SCALE, seed = 7): number => valueNoise(seed, x / scale, y / scale);

const roll = (x: number, y: number, seed: number): number => valueNoise(seed, x, y);

export function hasRhythm(values: readonly number[]): boolean {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  let start = 0;
  for (let index = 2; index <= sorted.length; index++) {
    const gap = (sorted[start + 1] as number) - (sorted[start] as number);
    if (index < sorted.length && (sorted[index] as number) - (sorted[index - 1] as number) === gap) continue;
    if (gap >= 2 && index - start > RHYTHM_LIMIT) return true;
    start = index - 1;
  }
  return false;
}

export interface Ground {
  readonly size: number;
  readonly natural: Uint8Array;
  readonly walkable: Uint8Array;
  readonly occupied: Uint8Array;
  readonly blocked: Uint8Array;
  readonly noBlock: Uint8Array;
  readonly noFlora: Uint8Array;
}

export function emptyGround(size: number): Ground {
  const grid = (): Uint8Array => new Uint8Array(size * size);
  return { size, natural: grid(), walkable: grid(), occupied: grid(), blocked: grid(), noBlock: grid(), noFlora: grid() };
}

export function footprintOf(object: string, x: number, y: number, facing: Facing): { x: number; y: number }[] {
  const foot = OBJECTS.get(object)?.footprint ?? { width: 1, height: 1 };
  const turned = facing === 'east' || facing === 'west';
  const width = turned ? foot.height : foot.width;
  const height = turned ? foot.width : foot.height;
  const tiles: { x: number; y: number }[] = [];
  for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) tiles.push({ x: x + dx, y: y + dy });
  return tiles;
}

export function canGrow(ground: Ground, tiles: readonly { x: number; y: number }[], blocks: boolean): boolean {
  const { size } = ground;
  const owned = new Set(tiles.map((tile) => tile.y * size + tile.x));
  for (const tile of tiles) {
    if (tile.x < 0 || tile.y < 0 || tile.x >= size || tile.y >= size) return false;
    const index = tile.y * size + tile.x;
    if (!ground.natural[index] || !ground.walkable[index] || ground.occupied[index] || (blocks ? ground.noBlock[index] : ground.noFlora[index])) return false;
  }
  if (!blocks) return true;
  for (const tile of tiles) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tile.x + dx;
        const y = tile.y + dy;
        if (owned.has(y * size + x)) continue;
        if (x < 0 || y < 0 || x >= size || y >= size) return false;
        if (!ground.walkable[y * size + x] || ground.blocked[y * size + x]) return false;
      }
    }
  }
  return true;
}

function featureField(land: LandMap, originX: number, originY: number, size: number, kinds: ReadonlySet<TileKindId>): Float32Array {
  const span = size + WINDOW * 2;
  const source = new Uint8Array(span * span);
  for (let y = 0; y < span; y++) for (let x = 0; x < span; x++) source[y * span + x] = kinds.has(land.tileAt({ x: originX - WINDOW + x, y: originY - WINDOW + y })) ? 1 : 0;
  const field = distanceField(span, span, source);
  const local = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) local[y * size + x] = Math.min(field[(y + WINDOW) * span + x + WINDOW] as number, 255);
  return local;
}

export function growWild(layout: DistrictLayout, land: LandMap): DistrictLayout {
  const growth = WILD_GROWTH[layout.region];
  if (!layout.square || !growth) return layout;
  const size = layout.size.width;
  const { column, row } = layout.square;
  const originX = column * SQUARE;
  const originY = row * SQUARE;
  const built = buildDistrict(layout, land, {});
  const map = parseTileLayout(built.map, built.heights);
  const base = cutSquare(land, layout.square, layout.square.split ? layout.region : undefined);
  const ground = emptyGround(size);
  const at = (x: number, y: number): number => y * size + x;
  const keep = (x: number, y: number, blockRing: number, floraRing: number): void => {
    const reach = Math.max(blockRing, floraRing);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= size || py >= size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (distance <= blockRing) ground.noBlock[at(px, py)] = 1;
        if (distance <= floraRing) ground.noFlora[at(px, py)] = 1;
      }
    }
  };
  const keepRect = (rect: { x: number; y: number; width: number; height: number }, blockRing: number, floraRing: number): void => {
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) keep(x, y, blockRing, floraRing);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const kind = map.tileAt({ x, y });
      const index = at(x, y);
      ground.walkable[index] = TILE_KINDS[kind].walkable && kind !== 'door' ? 1 : 0;
      ground.natural[index] = kind === base.tiles[index] && NATURAL.has(kind) ? 1 : 0;
      if (x < WILD_MARGIN || y < WILD_MARGIN || x >= size - WILD_MARGIN || y >= size - WILD_MARGIN) keep(x, y, 0, 0);
      if (kind !== base.tiles[index]) keep(x, y, 2, 1);
      if (kind === 'door') keep(x, y, 5, 3);
      if (kind === 'track') keep(x, y, 3, 1);
    }
  }
  for (const step of layout.steps) if (step.kind === 'building') keepRect(step.rect, 3, 2);
  const place = placeAt(column, row);
  if (place) {
    const pad = padOf(place);
    keepRect({ x: pad.x - originX, y: pad.y - originY, width: pad.width, height: pad.height }, 2, 1);
  }
  for (const placement of built.objects) {
    const definition = OBJECTS.get(placement.objectId);
    const landmark = placement.instanceId.startsWith(layout.id + '-landmark');
    const ring = definition?.door ? [9, 4] : landmark ? [5, 2] : (definition?.interactions.length ?? 1) > 0 ? [3, 2] : [2, 1];
    for (const tile of objectFootprintTiles(definition, placement)) {
      if (tile.x < 0 || tile.y < 0 || tile.x >= size || tile.y >= size) continue;
      ground.occupied[at(tile.x, tile.y)] = 1;
      if (definition?.blocksMovement ?? true) ground.blocked[at(tile.x, tile.y)] = 1;
      keep(tile.x, tile.y, ring[0] as number, ring[1] as number);
    }
  }
  for (const assembly of layout.assemblies) if ('room' in assembly.at && assembly.at.room === 'ground') keepRect({ x: assembly.at.dx, y: assembly.at.dy, width: 4, height: 4 }, 3, 2);
  for (const creature of built.creatures ?? []) keepRect({ x: creature.position.x, y: creature.position.y, width: 2, height: 2 }, 3, 1);
  for (const npc of built.npcs) keep(npc.position.x, npc.position.y, 3, 1);
  for (const anchor of Object.values(built.anchors ?? {})) keep(anchor.x, anchor.y, 3, 1);
  const giants = megastructureGround(layout.square);
  for (const tile of [...giants.footings, ...giants.overhead]) {
    const [x, y] = tile.split(',').map(Number) as [number, number];
    keep(x, y, 1, 1);
  }

  const fields: Readonly<Record<Exclude<Feature, 'hull'>, Float32Array>> = {
    stone: featureField(land, originX, originY, size, FEATURES.stone),
    woods: featureField(land, originX, originY, size, FEATURES.woods),
    water: featureField(land, originX, originY, size, FEATURES.water),
    soil: featureField(land, originX, originY, size, FEATURES.soil),
  };
  const distanceTo = (feature: Feature, x: number, y: number): number => {
    if (feature !== 'hull') return fields[feature][at(x, y)] as number;
    const gx = originX + x;
    const gy = originY + y;
    return Math.max(Math.max(HULL.x - gx, 0, gx - (HULL.x + HULL.width - 1)), Math.max(HULL.y - gy, 0, gy - (HULL.y + HULL.height - 1)));
  };
  const near = (feature: Feature, x: number, y: number): boolean => distanceTo(feature, x, y) <= REACH[feature];

  const lines = new Map<string, number[]>();
  const rhythmFree = (object: string, x: number, y: number): boolean => !hasRhythm([...(lines.get(object + ':y' + y) ?? []), x]) && !hasRhythm([...(lines.get(object + ':x' + x) ?? []), y]);
  const loose = (object: string): boolean => {
    const definition = OBJECTS.get(object);
    const profile = definition?.furnishing;
    return definition !== undefined && definition.interactions.length === 0 && !definition.door && !profile?.inRows && profile?.mount !== 'flat' && profile?.mount !== 'wall';
  };
  const remember = (object: string, x: number, y: number): void => {
    lines.set(object + ':y' + y, [...(lines.get(object + ':y' + y) ?? []), x]);
    lines.set(object + ':x' + x, [...(lines.get(object + ':x' + x) ?? []), y]);
  };
  for (const placement of built.objects) if (!SET_PIECE_PART.test(placement.instanceId) && loose(placement.objectId)) remember(placement.objectId, placement.position.x, placement.position.y);

  const grown: Placement[] = [];
  const stand = (object: string, tiles: readonly { x: number; y: number }[], facing: Facing): void => {
    const blocks = OBJECTS.get(object)?.blocksMovement ?? true;
    for (const tile of tiles) {
      ground.occupied[at(tile.x, tile.y)] = 1;
      if (blocks) ground.blocked[at(tile.x, tile.y)] = 1;
    }
    const origin = tiles[0] as { x: number; y: number };
    grown.push({ id: layout.id + '-w' + grown.length, object, at: { room: 'ground', dx: origin.x, dy: origin.y }, ...(facing === 'south' ? {} : { facing }) });
  };
  const put = (object: string, x: number, y: number, facing: Facing): boolean => {
    const definition = OBJECTS.get(object);
    if (!definition) throw new Error('wild growth names unknown object ' + object);
    const tiles = footprintOf(object, x, y, facing);
    if (!canGrow(ground, tiles, definition.blocksMovement)) return false;
    if (loose(object) && !rhythmFree(object, x, y)) return false;
    if (loose(object)) remember(object, x, y);
    stand(object, tiles, facing);
    return true;
  };

  const next = random(column * 7919 + row * 104729 + 31);
  const facingOf = (fixed?: Facing): Facing => fixed ?? (FACINGS[Math.floor(next() * FACINGS.length)] as Facing);
  const grow = (choice: Stand, centre: { x: number; y: number }): void => {
    const radius = choice.radius[0] + next() * (choice.radius[1] - choice.radius[0]);
    for (const member of choice.members) {
      const count = member.count[0] + Math.floor(next() * (member.count[1] - member.count[0] + 1));
      let placed = 0;
      for (let attempt = 0; attempt < count * 10 && placed < count; attempt++) {
        const angle = next() * Math.PI * 2;
        const reach = member.at === 'core' ? Math.sqrt(next()) * 0.6 : member.at === 'rim' ? 0.55 + next() * 0.55 : Math.sqrt(next());
        const x = Math.round(centre.x + Math.cos(angle) * radius * reach);
        const y = Math.round(centre.y + Math.sin(angle) * radius * reach);
        if (put(member.object, x, y, facingOf(choice.facing))) placed++;
      }
    }
  };

  if (growth.bounds) {
    const heightAt = (x: number, y: number): number => base.heights[at(x, y)] as number;
    const lip = (x: number, y: number, dx: number, dy: number): boolean => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || !ground.natural[at(nx, ny)]) return false;
      return heightAt(x, y) > heightAt(nx, ny);
    };
    for (const along of ['x', 'y'] as const) {
      for (let lineAt = WILD_MARGIN; lineAt < size - WILD_MARGIN; lineAt++) {
        let run: { x: number; y: number }[] = [];
        const flush = (): void => {
          let cursor = Math.floor(next() * 3);
          while (cursor + 3 <= run.length) {
            const length = Math.min(run.length - cursor, 3 + Math.floor(next() * 4));
            const piece = run.slice(cursor, cursor + length);
            const middle = piece[Math.floor(piece.length / 2)] as { x: number; y: number };
            const kind = coverAt(originX + middle.x, originY + middle.y, 11, 23);
            const object = kind > 0.62 ? growth.bounds!.wall : kind > 0.34 ? growth.bounds!.hedge : undefined;
            if (object && canGrow(ground, piece, true)) for (const tile of piece) stand(object, [tile], along === 'x' ? 'south' : 'east');
            cursor += length + 2 + Math.floor(next() * 3);
          }
          run = [];
        };
        for (let step = WILD_MARGIN; step < size - WILD_MARGIN; step++) {
          const x = along === 'x' ? step : lineAt;
          const y = along === 'x' ? lineAt : step;
          const contour = ground.natural[at(x, y)] && (along === 'x' ? lip(x, y, 0, 1) || lip(x, y, 0, -1) : lip(x, y, 1, 0) || lip(x, y, -1, 0));
          if (contour) run.push({ x, y });
          else flush();
        }
        flush();
      }
    }
  }

  if (growth.orchard) {
    const orchard = growth.orchard;
    for (let attempt = 0; attempt < 30; attempt++) {
      const x0 = WILD_MARGIN + Math.floor(next() * (size - 2 * WILD_MARGIN - 10));
      const y0 = WILD_MARGIN + Math.floor(next() * (size - 2 * WILD_MARGIN - 7));
      if (coverAt(originX + x0, originY + y0, 13, 41) < 0.55) continue;
      const spots: { x: number; y: number }[] = [];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) spots.push({ x: x0 + i * 3, y: y0 + j * 3 });
      const heights = spots.map((spot) => base.heights[at(spot.x, spot.y)] as number);
      if (Math.max(...heights) - Math.min(...heights) > 1) continue;
      const fit = spots.filter((spot) => canGrow(ground, [spot], true));
      if (fit.length < 9) continue;
      for (const spot of fit) put(orchard, spot.x, spot.y, facingOf());
      for (let i = 0; i < 5; i++) put(next() < 0.5 ? 'wildflowers' : 'tall-grass', x0 + Math.floor(next() * 10), y0 + Math.floor(next() * 7), facingOf());
      break;
    }
  }

  if (growth.edge) {
    for (let y = WILD_MARGIN; y < size - WILD_MARGIN; y++) {
      for (let x = WILD_MARGIN; x < size - WILD_MARGIN; x++) {
        const distance = distanceTo('woods', x, y);
        if (distance < 1 || distance > 3) continue;
        const chance = roll(originX + x, originY + y, 59);
        if (distance >= 2 && chance < 0.2) {
          const member = growth.edge[Math.floor(roll(originX + x, originY + y, 61) * growth.edge.length) % growth.edge.length] as Member;
          put(member.object, x, y, facingOf());
        } else if (chance > 0.8) put(chance > 0.9 ? 'wildflowers' : 'tall-grass', x, y, facingOf());
      }
    }
  }

  let natural = 0;
  for (let index = 0; index < size * size; index++) natural += ground.natural[index] as number;
  const target = Math.round((natural * growth.density) / 1000);
  const centres: { x: number; y: number }[] = [];
  for (let attempt = 0; attempt < target * 10 && centres.length < target; attempt++) {
    const x = WILD_MARGIN + Math.floor(next() * (size - 2 * WILD_MARGIN));
    const y = WILD_MARGIN + Math.floor(next() * (size - 2 * WILD_MARGIN));
    if (!ground.natural[at(x, y)] || ground.noFlora[at(x, y)]) continue;
    if (coverAt(originX + x, originY + y) < COVER_THRESHOLD) continue;
    if (centres.some((centre) => Math.hypot(centre.x - x, centre.y - y) < STAND_SPACING)) continue;
    centres.push({ x, y });
    const weights = growth.stands.map((choice) => {
      if (!choice.near) return choice.weight;
      if (near(choice.near, x, y)) return choice.weight * (choice.boost ?? 4);
      return choice.only ? 0 : choice.weight;
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let pick = next() * total;
    const chosen = growth.stands.find((_, index) => (pick -= weights[index] as number) < 0);
    if (chosen) grow(chosen, { x, y });
  }

  return grown.length === 0 ? layout : { ...layout, objects: [...layout.objects, ...grown] };
}
