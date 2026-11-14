import type { WorldObjectId } from '../ids.ts';
import { createObjectWalkabilityGrid, parseTileLayout, type DistrictDefinition, type ObjectPlacement, type TileLayout } from '../world/district.ts';
import { doorTilesOf, withOpenDoors } from '../world/doors.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import { objectFootprintTiles } from '../world/footprint.ts';
import { CARDINAL_OFFSETS, rectContains, tileKey, type Facing, type TilePoint, type TileRect } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { TILE_KINDS, type TileKindId } from '../world/tiles.ts';
import { BACKLESS_REACH, NARROW_OPENING, OPENING_APRON, REPEAT_LIMIT, RHYTHM_LIMIT, WIDE_OPENING_GAP, ROOM_FLOORS, ROOM_SIGNATURES, SIGNATURE_MIN_TILES, type FurnishingProfile } from './furnishingCatalogue.ts';
import type { GameContent } from './gameContent.ts';
import { PREFABS } from './prefabs/index.ts';
import type { DressingTheme } from './prefabs/types.ts';

type Report = (problem: string) => void;

const STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };
const OPPOSITE: Readonly<Record<Facing, Facing>> = { north: 'south', south: 'north', east: 'west', west: 'east' };
const FACINGS: readonly Facing[] = ['north', 'east', 'south', 'west'];
const SET_PIECE_PART = /^(.*)-set-(\d+)-\d+$/;

interface Placed {
  readonly placement: ObjectPlacement;
  readonly definition: WorldObjectDefinition;
  readonly profile: FurnishingProfile | undefined;
  readonly tiles: readonly TilePoint[];
  readonly facing: Facing;
}

interface Room {
  readonly id: string;
  readonly rect: TileRect;
  readonly theme: DressingTheme | undefined;
  readonly also: readonly DressingTheme[];
}

interface Scene {
  readonly district: DistrictDefinition;
  readonly layout: TileLayout;
  readonly rooms: readonly Room[];
  readonly placed: readonly Placed[];
  readonly at: ReadonlyMap<string, Placed>;
  readonly report: Report;
  readonly walkableBeyond: (point: TilePoint) => boolean;
  readonly kindAt: (point: TilePoint) => TileKindId;
}

const add = (point: TilePoint, step: TilePoint): TilePoint => ({ x: point.x + step.x, y: point.y + step.y });
const at = (point: TilePoint): string => `${point.x},${point.y}`;
const isDressing = (definition: WorldObjectDefinition): boolean => definition.interactions.length === 0 && definition.door === undefined && definition.countsAs === undefined;
const isWalkableTile = (layout: TileLayout, point: TilePoint): boolean => TILE_KINDS[layout.tileAt(point)].walkable;

const edgeTiles = (item: Placed, toward: Facing): TilePoint[] => {
  const owned = new Set(item.tiles.map(tileKey));
  return item.tiles.map((tile) => add(tile, STEP[toward])).filter((tile) => !owned.has(tileKey(tile)));
};

const roomOf = (scene: Scene, point: TilePoint): Room | undefined =>
  scene.rooms.filter((room) => rectContains(room.rect, point)).sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height)[0];

function sceneOf(content: GameContent, district: DistrictDefinition, report: Report): Scene {
  const layout = parseTileLayout(district.map);
  const logged = new Map((district.dressingLog ?? []).map((entry) => [entry.room, entry]));
  const rooms = Object.entries(district.rooms ?? {}).map(([id, rect]) => ({ id, rect, theme: logged.get(id)?.theme, also: logged.get(id)?.also ?? [] }));
  const placed: Placed[] = [];
  const occupied = new Map<string, Placed>();
  for (const placement of district.objects) {
    const definition = content.worldObjects.get(placement.objectId);
    if (!definition) continue;
    const item = { placement, definition, profile: definition.furnishing, tiles: objectFootprintTiles(definition, placement), facing: placement.facing ?? 'south' };
    placed.push(item);
    if (item.profile?.mount !== 'flat') for (const tile of item.tiles) occupied.set(tileKey(tile), item);
  }
  const levelId = content.levelOfDistrict.get(district.id);
  const level = levelId === undefined ? undefined : content.levels.get(levelId);
  const origin = level?.definition.districts.find((placement) => placement.districtId === district.id)?.origin;
  const kindAt = level && origin ? (point: TilePoint) => level.layout.tileAt(add(point, origin)) : (point: TilePoint) => layout.tileAt(point);
  const walkableBeyond = (point: TilePoint) => TILE_KINDS[kindAt(point)].walkable;
  return { district, layout, rooms, placed, at: occupied, report, walkableBeyond, kindAt };
}

function findPurposeIssues(scene: Scene): void {
  if (!scene.district.dressingLog) return;
  for (const room of scene.rooms) {
    if (!room.theme) scene.report(`room "${room.id}" at ${at(room.rect)} has no theme; say what every room is for in its dressing`);
  }
}

function findCatalogueIssues(scene: Scene): void {
  const reported = new Set<WorldObjectId>();
  for (const item of scene.placed) {
    if (!isDressing(item.definition) || item.profile || reported.has(item.placement.objectId)) continue;
    reported.add(item.placement.objectId);
    scene.report(`"${item.placement.objectId}" at ${at(item.placement.position)} has no furnishing profile; give its definition one`);
  }
}

function findHomeIssues(scene: Scene): void {
  const strays = new Map<string, { first: Placed; count: number; room: Room }>();
  for (const item of scene.placed) {
    if (!item.profile || !isDressing(item.definition)) continue;
    const room = roomOf(scene, item.placement.position);
    if (!room?.theme || [room.theme, ...room.also].some((theme) => item.profile?.homes.includes(theme))) continue;
    const key = `${room.id}:${item.placement.objectId}`;
    const known = strays.get(key);
    strays.set(key, known ? { ...known, count: known.count + 1 } : { first: item, count: 1, room });
  }
  for (const { first, count, room } of strays.values()) {
    const what = count === 1 ? `a ${first.definition.name}` : `${count} × ${first.definition.name}`;
    scene.report(`"${first.placement.instanceId}" at ${at(first.placement.position)}: ${what} does not belong in ${room.theme} room "${room.id}"`);
  }
}

const floorOf = (scene: Scene, rect: TileRect): TileKindId | undefined => {
  const counts = new Map<TileKindId, number>();
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const kind = scene.layout.tileAt({ x, y });
      if (TILE_KINDS[kind].walkable) counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
};

const walkableIn = (scene: Scene, rect: TileRect): number => {
  let count = 0;
  for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) if (isWalkableTile(scene.layout, { x, y })) count += 1;
  return count;
};

function findSignatureIssues(scene: Scene): void {
  for (const room of scene.rooms) {
    if (!room.theme || walkableIn(scene, room.rect) < SIGNATURE_MIN_TILES) continue;
    const signature = ROOM_SIGNATURES[room.theme];
    if (!signature || signature.length === 0) continue;
    const present = scene.placed.some((item) => signature.includes(item.placement.objectId) && item.tiles.some((tile) => rectContains(room.rect, tile)));
    if (!present) scene.report(`room "${room.id}" at ${at(room.rect)} is dressed as ${room.theme} but holds none of its signature pieces (${signature.join(', ')})`);
  }
}

function findFloorIssues(scene: Scene): void {
  for (const room of scene.rooms) {
    const floor = floorOf(scene, room.rect);
    const allowed = floor === undefined ? undefined : ROOM_FLOORS[floor];
    if (!room.theme || !allowed || allowed.includes(room.theme)) continue;
    scene.report(`room "${room.id}" at ${at(room.rect)} has a ${floor} floor but is dressed as ${room.theme}; ${floor} is for ${allowed.join(', ')} rooms`);
  }
}

function openingsOf(scene: Scene, rect: TileRect): TilePoint[] {
  const openings: TilePoint[] = [];
  for (let y = rect.y - 1; y <= rect.y + rect.height; y++) {
    for (let x = rect.x - 1; x <= rect.x + rect.width; x++) {
      const point = { x, y };
      if (rectContains(rect, point) || !scene.walkableBeyond(point)) continue;
      if (CARDINAL_OFFSETS.some((offset) => rectContains(rect, add(point, offset)) && isWalkableTile(scene.layout, add(point, offset)))) openings.push(point);
    }
  }
  for (const exit of Object.values(scene.district.exits ?? {})) for (const tile of exit.tiles) if (rectContains(rect, tile)) openings.push(tile);
  return openings;
}

const crowds = (item: Placed): boolean => item.definition.blocksMovement && item.profile !== undefined && item.profile.mount !== 'wall' && item.profile.mount !== 'flat';

function openingRuns(openings: readonly TilePoint[]): TilePoint[][] {
  const remaining = new Map(openings.map((tile) => [tileKey(tile), tile]));
  const runs: TilePoint[][] = [];
  for (const start of openings) {
    if (!remaining.delete(tileKey(start))) continue;
    const run = [start];
    for (let index = 0; index < run.length; index++) {
      const here = run[index] as TilePoint;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const next = remaining.get(tileKey({ x: here.x + dx, y: here.y + dy }));
          if (!next) continue;
          remaining.delete(tileKey(next));
          run.push(next);
        }
      }
    }
    runs.push(run);
  }
  return runs;
}

function findOpeningIssues(scene: Scene): void {
  for (const room of scene.rooms) {
    const crowding = scene.placed.filter((item) => isDressing(item.definition) && crowds(item) && rectContains(room.rect, item.placement.position));
    const blocked = new Set(crowding.flatMap((item) => item.tiles).map(tileKey));
    for (const run of openingRuns(openingsOf(scene, room.rect))) {
      const inside = run.flatMap((tile) => CARDINAL_OFFSETS.map((offset) => add(tile, offset))).filter((tile) => rectContains(room.rect, tile) && isWalkableTile(scene.layout, tile));
      if (run.length > NARROW_OPENING) {
        if (longestClearStretch(inside, blocked) >= WIDE_OPENING_GAP) continue;
        const first = inside.find((tile) => blocked.has(tileKey(tile))) ?? run[0] as TilePoint;
        scene.report(`room "${room.id}" at ${at(first)}: its ${run.length}-wide opening is lined shut; leave a gap at least ${WIDE_OPENING_GAP} wide through it`);
        continue;
      }
      const apron = new Set<string>();
      for (const opening of run) {
        for (let dy = -OPENING_APRON; dy <= OPENING_APRON; dy++) for (let dx = -OPENING_APRON; dx <= OPENING_APRON; dx++) apron.add(tileKey({ x: opening.x + dx, y: opening.y + dy }));
      }
      for (const item of crowding) {
        const tile = item.tiles.find((each) => apron.has(tileKey(each)));
        if (tile) scene.report(`"${item.placement.instanceId}" at ${at(tile)} (${item.definition.name}) crowds a doorway of room "${room.id}"; keep the tiles beside every doorway clear`);
      }
    }
  }
}

function longestClearStretch(inside: readonly TilePoint[], blocked: ReadonlySet<string>): number {
  const keys = new Set(inside.map(tileKey));
  let best = 0;
  for (const tile of inside) {
    if (blocked.has(tileKey(tile))) continue;
    for (const step of [{ x: 1, y: 0 }, { x: 0, y: 1 }]) {
      const before = { x: tile.x - step.x, y: tile.y - step.y };
      if (keys.has(tileKey(before)) && !blocked.has(tileKey(before))) continue;
      let length = 0;
      let next = tile;
      while (keys.has(tileKey(next)) && !blocked.has(tileKey(next))) {
        length += 1;
        next = add(next, step);
      }
      best = Math.max(best, length);
    }
  }
  return best;
}

function findBackedIssues(scene: Scene): void {
  for (const item of scene.placed) {
    if (item.profile?.mount !== 'backed') continue;
    const behind = edgeTiles(item, OPPOSITE[item.facing]);
    const backed = behind.every((tile) => {
      if (TILE_KINDS[scene.kindAt(tile)].structure === 'wall') return true;
      const neighbour = scene.at.get(tileKey(tile));
      if (neighbour?.profile?.backstop) return true;
      return neighbour !== undefined && neighbour.profile?.mount === 'backed' && neighbour.facing === OPPOSITE[item.facing];
    });
    if (backed) continue;
    const turn = FACINGS.find((facing) => edgeTiles({ ...item, facing }, OPPOSITE[facing]).every((tile) => TILE_KINDS[scene.kindAt(tile)].structure === 'wall'));
    const advice = turn ? `turn it to face ${turn}` : 'back it onto a wall or racking, or back to back with another';
    scene.report(`"${item.placement.instanceId}" at ${at(item.placement.position)} (${item.definition.name}, facing ${item.facing}) has nothing behind it; ${advice}`);
  }
}

const serves = (item: Placed | undefined): boolean => item !== undefined && (item.profile?.surface === true || !isDressing(item.definition));

const withinReach = (tile: TilePoint): TilePoint[] => {
  const near: TilePoint[] = [];
  for (let dy = -BACKLESS_REACH; dy <= BACKLESS_REACH; dy++) for (let dx = -BACKLESS_REACH; dx <= BACKLESS_REACH; dx++) if (dx !== 0 || dy !== 0) near.push({ x: tile.x + dx, y: tile.y + dy });
  return near;
};

function findSeatIssues(scene: Scene): void {
  for (const item of scene.placed) {
    const profile = item.profile;
    if (profile?.mount !== 'seat') continue;
    const where = `"${item.placement.instanceId}" at ${at(item.placement.position)} (${item.definition.name}, facing ${item.facing})`;
    const ahead = edgeTiles(item, item.facing);
    if (profile.seatsAt === 'view') {
      const blocked = ahead.find((tile) => {
        const kind = scene.kindAt(tile);
        if (kind === 'glass') return false;
        if (!TILE_KINDS[kind].walkable) return true;
        const occupant = scene.at.get(tileKey(tile));
        return occupant !== undefined && occupant.definition.blocksMovement;
      });
      if (blocked) scene.report(`${where} sits with ${TILE_KINDS[scene.kindAt(blocked)].structure === 'wall' ? 'its face to a wall' : 'something in its lap'}; give every bench, pew and armchair open floor in front`);
      continue;
    }
    if (ahead.some((tile) => serves(scene.at.get(tileKey(tile))))) continue;
    if (profile.backless && item.tiles.some((tile) => withinReach(tile).some((near) => serves(scene.at.get(tileKey(near)))))) continue;
    const beside = item.tiles.flatMap((tile) => CARDINAL_OFFSETS.map((offset) => add(tile, offset)));
    const touching = beside.some((tile) => serves(scene.at.get(tileKey(tile))));
    if (touching) scene.report(`${where} sits beside its desk, table or counter rather than facing it; turn it to face what it serves`);
    else scene.report(`${where} serves nothing; put chairs and stools at a desk, table, counter or workbench`);
  }
}

interface Marker {
  readonly name: string;
  readonly position: TilePoint;
}

function rhythmsIn(markers: readonly Marker[]): { name: string; count: number; gap: number; from: TilePoint }[] {
  const found: { name: string; count: number; gap: number; from: TilePoint }[] = [];
  const byName = new Map<string, TilePoint[]>();
  for (const marker of markers) byName.set(marker.name, [...(byName.get(marker.name) ?? []), marker.position]);
  for (const [name, points] of byName) {
    for (const axis of ['x', 'y'] as const) {
      const along = axis === 'x' ? 'y' : 'x';
      const lines = new Map<number, number[]>();
      for (const point of points) lines.set(point[axis], [...(lines.get(point[axis]) ?? []), point[along]]);
      for (const [line, values] of lines) {
        const sorted = [...new Set(values)].sort((a, b) => a - b);
        let start = 0;
        for (let index = 2; index <= sorted.length; index++) {
          const gap = (sorted[start + 1] as number) - (sorted[start] as number);
          if (index < sorted.length && (sorted[index] as number) - (sorted[index - 1] as number) === gap) continue;
          const count = index - start;
          if (gap >= 2 && count > RHYTHM_LIMIT) {
            const from = sorted[start] as number;
            found.push({ name, count, gap, from: axis === 'x' ? { x: line, y: from } : { x: from, y: line } });
          }
          start = index - 1;
        }
      }
    }
  }
  return found;
}

function findRhythmIssues(scene: Scene): void {
  const setPieces = new Map<string, { prefab: string; origin: TilePoint; room: string }>();
  for (const item of scene.placed) {
    const match = SET_PIECE_PART.exec(item.placement.instanceId);
    if (!match) continue;
    const [, prefix, index] = match as unknown as [string, string, string];
    const room = scene.rooms.find((each) => prefix.endsWith(`-${each.id}`));
    const prefab = room ? scene.district.dressingLog?.find((entry) => entry.room === room.id)?.setPieces[Number(index) - 1]?.prefab : undefined;
    if (!room || !prefab || PREFABS[prefab]?.rows) continue;
    const key = `${prefix}-${index}`;
    const known = setPieces.get(key);
    const position = item.placement.position;
    setPieces.set(key, { prefab, room: room.id, origin: known ? { x: Math.min(known.origin.x, position.x), y: Math.min(known.origin.y, position.y) } : position });
  }
  for (const room of scene.rooms) {
    const loose = scene.placed
      .filter((item) => !SET_PIECE_PART.test(item.placement.instanceId) && isDressing(item.definition) && item.profile && !item.profile.inRows && item.profile.mount !== 'flat' && item.profile.mount !== 'wall')
      .filter((item) => rectContains(room.rect, item.placement.position))
      .map((item) => ({ name: item.placement.objectId, position: item.placement.position }));
    const inRoom = [...setPieces.values()].filter((piece) => piece.room === room.id);
    const pieces = inRoom.map((piece) => ({ name: `the ${piece.prefab} set-piece`, position: piece.origin }));
    const counts = new Map<string, TilePoint[]>();
    for (const piece of inRoom) counts.set(piece.prefab, [...(counts.get(piece.prefab) ?? []), piece.origin]);
    for (const [prefab, origins] of counts) {
      if (origins.length > REPEAT_LIMIT) scene.report(`room "${room.id}" at ${at(origins[0] as TilePoint)}: ${origins.length} × the ${prefab} set-piece in one room; vary the groups, at most ${REPEAT_LIMIT} of one`);
    }
    for (const rhythm of rhythmsIn([...loose, ...pieces])) {
      scene.report(`room "${room.id}" from ${at(rhythm.from)}: ${rhythm.count} × ${rhythm.name} repeat every ${rhythm.gap} tiles in a line; place things in groups that each have a reason, not on a fixed pitch`);
    }
  }
}

function findAccessIssues(content: GameContent, level: ResolvedLevel, issues: string[]): void {
  const definitionOf = (objectId: WorldObjectId) => content.worldObjects.get(objectId);
  const grid = withOpenDoors(createObjectWalkabilityGrid(level.layout, level.objects, definitionOf), level.layout, doorTilesOf(level.objects, definitionOf), () => true);
  for (const placed of level.definition.districts) {
    const district = content.districts.get(placed.districtId);
    if (!district) continue;
    const { origin } = placed;
    for (const placement of district.objects) {
      const definition = definitionOf(placement.objectId);
      if (!definition || isDressing(definition) || definition.door !== undefined || definition.deck) continue;
      const tiles = objectFootprintTiles(definition, placement).map((tile) => ({ x: tile.x + origin.x, y: tile.y + origin.y }));
      const owned = new Set(tiles.map(tileKey));
      const open = tiles.some((tile) => CARDINAL_OFFSETS.some((offset) => {
        const next = add(tile, offset);
        return !owned.has(tileKey(next)) && grid.isWalkable(next);
      }));
      if (!open) issues.push(`district ${district.id}: "${placement.instanceId}" at ${at(placement.position)} (${definition.name}) is boxed in; leave a free tile beside anything players use`);
    }
  }
}

export function findPlacementIssues(content: GameContent): string[] {
  const issues = [...content.districts.values()].flatMap((district) => findDistrictPlacementIssues(content, district));
  for (const level of content.levels.values()) findAccessIssues(content, level, issues);
  return issues;
}

export function findDistrictPlacementIssues(content: GameContent, district: DistrictDefinition): string[] {
  const issues: string[] = [];
  if (district.rooms) {
    const scene = sceneOf(content, district, (problem) => issues.push(`district ${district.id}: ${problem}`));
    findPurposeIssues(scene);
    findCatalogueIssues(scene);
    findHomeIssues(scene);
    findSignatureIssues(scene);
    findFloorIssues(scene);
    findOpeningIssues(scene);
    if (district.condition !== 'uncanny') {
      findBackedIssues(scene);
      findSeatIssues(scene);
    }
    findRhythmIssues(scene);
  }
  return issues;
}
