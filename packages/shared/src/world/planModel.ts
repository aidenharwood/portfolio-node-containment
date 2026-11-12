import { findContentIssues } from '../content/contentIntegrity.ts';
import type { GameContent } from '../content/gameContent.ts';
import type { DistrictId } from '../ids.ts';
import { parseTileLayout, type DistrictDefinition } from './district.ts';
import { objectFootprintTiles } from './footprint.ts';
import { rectContains, tileKey, type Facing, type TilePoint, type TileRect } from './geometry.ts';
import { districtObjects } from './levelLayout.ts';
import { TILE_KINDS } from './tiles.ts';

export type PlanMarkKind = 'fixture' | 'dressing' | 'set-piece' | 'quest' | 'litter' | 'npc' | 'creature' | 'light' | 'anchor';

export interface PlanMark {
  readonly kind: PlanMarkKind;
  readonly id: string;
  readonly label: string;
  readonly tiles: readonly TilePoint[];
  readonly facing?: Facing;
}

export interface PlanIssue {
  readonly message: string;
  readonly tile?: TilePoint;
}

const districtOf = (content: GameContent, districtId: DistrictId): DistrictDefinition => {
  const district = content.districts.get(districtId);
  if (!district) throw new Error(`There is no district "${districtId}".`);
  return district;
};

export function planMarks(content: GameContent, districtId: DistrictId): PlanMark[] {
  const district = districtOf(content, districtId);
  const placedDirectly = new Set(district.objects.map((object) => object.instanceId));
  const objectKind = (instanceId: string, objectId: string): PlanMarkKind => {
    if (!placedDirectly.has(instanceId)) return (content.worldObjects.get(objectId)?.interactions.length ?? 0) > 0 ? 'quest' : 'fixture';
    if (instanceId.includes('/')) return 'set-piece';
    if (instanceId.includes('-dressing-')) return 'dressing';
    if (objectId.startsWith('litter-')) return 'litter';
    return (content.worldObjects.get(objectId)?.interactions.length ?? 0) > 0 ? 'quest' : 'fixture';
  };
  return [
    ...districtObjects(district, content.assemblies).map((object): PlanMark => ({
      kind: objectKind(object.instanceId, object.objectId),
      id: object.instanceId,
      label: object.objectId,
      tiles: objectFootprintTiles(content.worldObjects.get(object.objectId), object),
      ...(object.facing === undefined ? {} : { facing: object.facing }),
    })),
    ...district.npcs.map((npc): PlanMark => ({ kind: 'npc', id: npc.instanceId, label: npc.npcId, tiles: [npc.position] })),
    ...(district.creatures ?? []).map((creature): PlanMark => ({ kind: 'creature', id: creature.instanceId, label: creature.creatureId, tiles: [creature.position] })),
    ...district.lights.map((light, index): PlanMark => ({ kind: 'light', id: `light-${index + 1}`, label: `${light.color} r${light.radius}`, tiles: [light.position] })),
    ...Object.entries(district.anchors ?? {}).map(([name, point]): PlanMark => ({ kind: 'anchor', id: `anchor-${name}`, label: name, tiles: [point] })),
  ];
}

const ISSUE_PATTERN = /^(district|level|zone) ([^:]+): (.*)$/;
const TILE_PATTERN = /(-?\d+),(-?\d+)/;

const isSolidAt = (district: DistrictDefinition, point: TilePoint): boolean => {
  const symbol = district.map[point.y]?.[point.x];
  return symbol !== undefined && symbol !== ' ';
};

export function issuesFromMessages(content: GameContent, districtId: DistrictId, messages: readonly string[]): PlanIssue[] {
  const district = districtOf(content, districtId);
  const issues: PlanIssue[] = [];
  for (const text of messages) {
    const match = ISSUE_PATTERN.exec(text);
    if (!match) continue;
    const [, scope, owner, message] = match as unknown as [string, string, string, string];
    const found = TILE_PATTERN.exec(message);
    const tile = found ? { x: Number(found[1]), y: Number(found[2]) } : undefined;
    if (scope === 'district' || scope === 'zone') {
      if (owner === districtId) issues.push(tile ? { message, tile } : { message });
      continue;
    }
    const level = content.levels.get(owner);
    const placed = level?.districts.find((each) => each.districtId === districtId);
    if (!placed || !tile || !rectContains(placed.rect, tile)) continue;
    const local = { x: tile.x - placed.rect.x, y: tile.y - placed.rect.y };
    if (isSolidAt(district, local)) issues.push({ message, tile: local });
  }
  return issues;
}

export const issuesFor = (content: GameContent, districtId: DistrictId): PlanIssue[] => issuesFromMessages(content, districtId, findContentIssues(content));

const MARK_SYMBOL: Readonly<Record<PlanMarkKind, string>> = {
  fixture: 'F',
  dressing: 'd',
  'set-piece': 'S',
  quest: 'Q',
  litter: ',',
  npc: 'N',
  creature: 'C',
  light: '',
  anchor: '',
};

export function asciiPlan(content: GameContent, districtId: DistrictId, room?: string): string {
  const district = districtOf(content, districtId);
  const layout = parseTileLayout(district.map);
  const area: TileRect = room === undefined ? { x: 0, y: 0, width: layout.width, height: layout.height } : (district.rooms?.[room] ?? (() => {
    throw new Error(`District "${districtId}" has no room "${room}".`);
  })());
  const overlay = new Map<string, string>();
  for (const mark of planMarks(content, districtId)) {
    const symbol = MARK_SYMBOL[mark.kind];
    if (symbol !== '') for (const tile of mark.tiles) overlay.set(tileKey(tile), symbol);
  }
  for (const issue of issuesFor(content, districtId)) if (issue.tile) overlay.set(tileKey(issue.tile), '!');
  const gutter = String(area.y + area.height).length + 1;
  let ruler = ' '.repeat(gutter);
  for (let x = area.x; x < area.x + area.width; x++) ruler += x % 10 === 0 ? String((x / 10) % 10) : ' ';
  const rows = [ruler];
  for (let y = area.y; y < area.y + area.height; y++) {
    let row = String(y).padStart(gutter - 1) + ' ';
    for (let x = area.x; x < area.x + area.width; x++) {
      const point = { x, y };
      const kind = layout.tileAt(point);
      const ground = kind === 'void' ? ' ' : kind === 'door' ? 'D' : kind === 'track' ? '=' : TILE_KINDS[kind].walkable ? '.' : '#';
      row += overlay.get(tileKey(point)) ?? ground;
    }
    rows.push(row);
  }
  return rows.join('\n');
}
