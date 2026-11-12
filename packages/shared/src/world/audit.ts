import { findContentIssues } from '../content/contentIntegrity.ts';
import { LAYOUT_SOURCES } from '../content/districts/layouts/index.ts';
import type { GameContent } from '../content/gameContent.ts';
import type { DistrictId } from '../ids.ts';
import { parseTileLayout, type DistrictDefinition } from './district.ts';
import { rectContains, tileKey, type TilePoint, type TileRect } from './geometry.ts';
import { parseLayout } from './layout.ts';
import type { DistrictLayout } from './layoutSchema.ts';
import { districtObjects } from './levelLayout.ts';
import { issuesFromMessages } from './planModel.ts';
import { TILE_KINDS } from './tiles.ts';

export type AuditKind = 'issue' | 'empty-room' | 'density' | 'dark-room' | 'dead-end' | 'people' | 'seam';

export interface AuditFinding {
  readonly districtId: DistrictId;
  readonly room?: string;
  readonly kind: AuditKind;
  readonly message: string;
  readonly tile?: TilePoint;
}

const EMPTY_MIN_TILES = 20;
const DENSITY_MIN_TILES = 40;
const SPARSE_RATIO = 0.25;
const CROWDED_RATIO = 3;
const STEP_OUT: Readonly<Record<string, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };

interface RoomStats {
  readonly room: string;
  readonly rect: TileRect;
  readonly walkable: number;
  readonly placements: number;
  readonly lit: boolean;
  readonly purposeful: boolean;
  readonly openings: number;
}

const centre = (rect: TileRect): TilePoint => ({ x: rect.x + Math.floor(rect.width / 2), y: rect.y + Math.floor(rect.height / 2) });

function roomStats(content: GameContent, district: DistrictDefinition, layout: DistrictLayout): RoomStats[] {
  const tiles = parseTileLayout(district.map);
  const objects = districtObjects(district, content.assemblies);
  return Object.entries(district.rooms ?? {}).map(([room, rect]) => {
    let walkable = 0;
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) if (TILE_KINDS[tiles.tileAt({ x, y })].walkable) walkable += 1;
    const inside = (point: TilePoint): boolean => rectContains(rect, point);
    const roomObjects = objects.filter((object) => inside(object.position));
    const people = [...district.npcs, ...(district.creatures ?? [])].filter((placement) => inside(placement.position));
    const sconced = district.areas.some((area) => area.rect.x < rect.x + rect.width && rect.x < area.rect.x + area.rect.width && area.rect.y < rect.y + rect.height && rect.y < area.rect.y + area.rect.height);
    const lit = sconced || district.lights.some((light) => inside(light.position)) || roomObjects.some((object) => content.worldObjects.get(object.objectId)?.light !== undefined);
    const purposeful = people.length > 0 || roomObjects.some((object) => (content.worldObjects.get(object.objectId)?.interactions.length ?? 0) > 0);
    const openings = openingsOf(rect, (point) => TILE_KINDS[tiles.tileAt(point)].walkable);
    return { room, rect, walkable, placements: roomObjects.length + people.length, lit, purposeful, openings };
  });
}

function openingsOf(rect: TileRect, walkable: (point: TilePoint) => boolean): number {
  const outside: TilePoint[] = [];
  for (let y = rect.y - 1; y <= rect.y + rect.height; y++) {
    for (let x = rect.x - 1; x <= rect.x + rect.width; x++) {
      const point = { x, y };
      if (rectContains(rect, point) || !walkable(point)) continue;
      const inward = [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
      if (inward.some((next) => rectContains(rect, next) && walkable(next))) outside.push(point);
    }
  }
  const seen = new Set<string>();
  let groups = 0;
  for (const start of outside) {
    if (seen.has(tileKey(start))) continue;
    groups += 1;
    const queue = [start];
    seen.add(tileKey(start));
    while (queue.length > 0) {
      const point = queue.pop() as TilePoint;
      for (const next of outside) {
        if (seen.has(tileKey(next)) || Math.max(Math.abs(next.x - point.x), Math.abs(next.y - point.y)) > 1) continue;
        seen.add(tileKey(next));
        queue.push(next);
      }
    }
  }
  return groups;
}

const lowerMedian = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
};

export function auditDistrict(content: GameContent, districtId: DistrictId, layout: DistrictLayout = parseLayout(LAYOUT_SOURCES[districtId]), messages: readonly string[] | null = null): AuditFinding[] {
  const district = content.districts.get(districtId);
  if (!district) throw new Error(`There is no district "${districtId}".`);
  const findings: AuditFinding[] = [];
  for (const issue of issuesFromMessages(content, districtId, messages ?? findContentIssues(content))) {
    findings.push({ districtId, kind: 'issue', message: issue.message, ...(issue.tile ? { tile: issue.tile } : {}) });
  }

  const stats = roomStats(content, district, layout);
  const sized = stats.filter((room) => room.walkable >= DENSITY_MIN_TILES);
  const median = lowerMedian(sized.map((room) => (room.placements * 100) / room.walkable));
  for (const room of stats) {
    const at = centre(room.rect);
    if (room.walkable >= EMPTY_MIN_TILES && room.placements === 0) findings.push({ districtId, room: room.room, kind: 'empty-room', message: `"${room.room}" has ${room.walkable} walkable tiles and nothing in it`, tile: at });
    if (room.walkable >= DENSITY_MIN_TILES && median > 0) {
      const density = (room.placements * 100) / room.walkable;
      if (density < median * SPARSE_RATIO) findings.push({ districtId, room: room.room, kind: 'density', message: `"${room.room}" is sparse: ${density.toFixed(1)} placements per 100 tiles against a district median of ${median.toFixed(1)}`, tile: at });
      if (density > median * CROWDED_RATIO) findings.push({ districtId, room: room.room, kind: 'density', message: `"${room.room}" is crowded: ${density.toFixed(1)} placements per 100 tiles against a district median of ${median.toFixed(1)}`, tile: at });
    }
    if (room.walkable > 0 && !room.lit) findings.push({ districtId, room: room.room, kind: 'dark-room', message: `"${room.room}" has no light and no lit object`, tile: at });
    if (room.openings <= 1 && !room.purposeful) findings.push({ districtId, room: room.room, kind: 'dead-end', message: `"${room.room}" has ${room.openings === 0 ? 'no way in' : 'one way in'} and nothing to do`, tile: at });
  }

  const safe = district.areas.filter((area) => area.safe);
  const inSafe = (point: TilePoint): boolean => safe.some((area) => rectContains(area.rect, point));
  const levelId = content.levelOfDistrict.get(districtId);
  const onFloor = levelId !== undefined && content.levels.get(levelId)?.definition.kind === 'floor';
  for (const creature of district.creatures ?? []) {
    if (inSafe(creature.position)) findings.push({ districtId, kind: 'people', message: `creature "${creature.instanceId}" stands in a safe area`, tile: creature.position });
  }
  if (onFloor) {
    for (const npc of district.npcs) {
      if (!inSafe(npc.position)) findings.push({ districtId, kind: 'people', message: `npc "${npc.instanceId}" stands outside every safe area`, tile: npc.position });
    }
  }
  return findings;
}

export function auditSeams(content: GameContent): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const level of content.levels.values()) {
    const exitTiles = new Map<string, { districtId: DistrictId; exit: string; width: number }>();
    for (const placed of level.districts) {
      for (const [exit, value] of Object.entries(content.districts.get(placed.districtId)?.exits ?? {})) {
        for (const tile of value.tiles) exitTiles.set(tileKey({ x: tile.x + placed.rect.x, y: tile.y + placed.rect.y }), { districtId: placed.districtId, exit, width: value.tiles.length });
      }
    }
    const reported = new Set<string>();
    for (const placed of level.districts) {
      for (const [exit, value] of Object.entries(content.districts.get(placed.districtId)?.exits ?? {})) {
        const step = STEP_OUT[value.side];
        if (!step) continue;
        for (const tile of value.tiles) {
          const levelTile = { x: tile.x + placed.rect.x, y: tile.y + placed.rect.y };
          const across = exitTiles.get(tileKey({ x: levelTile.x + step.x, y: levelTile.y + step.y }));
          if (!across || across.districtId === placed.districtId) continue;
          const pair = [`${placed.districtId}.${exit}`, `${across.districtId}.${across.exit}`].sort().join(' / ');
          if (reported.has(pair)) continue;
          const walkable = TILE_KINDS[level.layout.tileAt(levelTile)].walkable;
          if (across.width !== value.tiles.length || !walkable) {
            reported.add(pair);
            findings.push({
              districtId: placed.districtId,
              kind: 'seam',
              message: `${placed.districtId} exit "${exit}" (${value.tiles.length} wide) meets ${across.districtId} exit "${across.exit}" (${across.width} wide)${walkable ? '' : ' across an unwalkable tile'} on ${level.id}`,
              tile,
            });
          }
        }
      }
    }
  }
  return findings;
}

