import { rectContains, type DistrictId, type GameContent, type PlanIssue, type ResolvedLevel, type TilePoint } from '@containment/shared';
import { planDrawList, tileColor, type PlanShape } from './planCanvas.ts';
import type { PlanLayer } from './viewState.ts';

const OUTLINE = '#ffd23f';
const ISSUE_PATTERN = /^(district|level|zone) ([^:]+): (.*)$/;
const TILE_PATTERN = /(-?\d+),(-?\d+)/;

export function districtAtLevelTile(content: GameContent, level: ResolvedLevel, tile: TilePoint): { districtId: DistrictId; local: TilePoint } | null {
  for (const placed of level.districts) {
    if (!rectContains(placed.rect, tile)) continue;
    const local = { x: tile.x - placed.rect.x, y: tile.y - placed.rect.y };
    const symbol = content.districts.get(placed.districtId)?.map[local.y]?.[local.x];
    if (symbol !== undefined && symbol !== ' ') return { districtId: placed.districtId, local };
  }
  return null;
}

export function originOf(level: ResolvedLevel, districtId: DistrictId): TilePoint {
  const rect = level.districts.find((each) => each.districtId === districtId)?.rect;
  return rect ? { x: rect.x, y: rect.y } : { x: 0, y: 0 };
}

export function levelPlan(content: GameContent, level: ResolvedLevel, layers: readonly PlanLayer[], issues: readonly PlanIssue[] = []): PlanShape[] {
  const shapes: PlanShape[] = [];
  const withoutTiles = layers.filter((layer) => layer !== 'tiles' && layer !== 'issues');
  for (const placed of level.districts) {
    const { x, y } = placed.rect;
    for (const shape of planDrawList(content, placed.districtId, withoutTiles)) shapes.push({ ...shape, x: shape.x + x, y: shape.y + y });
    if (layers.includes('rooms')) shapes.push({ kind: 'room', ...placed.rect, color: OUTLINE, label: content.districts.get(placed.districtId)?.name ?? placed.districtId });
  }
  if (layers.includes('issues')) for (const issue of issues) if (issue.tile) shapes.push({ kind: 'issue', ...issue.tile, width: 1, height: 1, color: '#ff3b3b', label: issue.message });
  return shapes;
}

export function levelIssues(content: GameContent, level: ResolvedLevel, messages: readonly string[]): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const inLevel = new Set(level.districts.map((placed) => placed.districtId));
  for (const text of messages) {
    const match = ISSUE_PATTERN.exec(text);
    if (!match) continue;
    const [, scope, owner, message] = match as unknown as [string, string, string, string];
    const found = TILE_PATTERN.exec(message);
    const tile = found ? { x: Number(found[1]), y: Number(found[2]) } : undefined;
    if (scope === 'level') {
      if (owner === level.id) issues.push(tile ? { message, tile } : { message });
      continue;
    }
    if (!inLevel.has(owner)) continue;
    const origin = originOf(level, owner);
    const label = `${content.districts.get(owner)?.name ?? owner}: ${message}`;
    issues.push(tile ? { message: label, tile: { x: tile.x + origin.x, y: tile.y + origin.y } } : { message: label });
  }
  return issues;
}

export interface TileImage {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
}

export function tileImageOf(level: ResolvedLevel): TileImage {
  const { width, height } = level.layout;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const cache = new Map<string, readonly [number, number, number]>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colour = tileColor(level.layout.tileAt({ x, y }));
      let rgb = cache.get(colour);
      if (!rgb) {
        rgb = [parseInt(colour.slice(1, 3), 16), parseInt(colour.slice(3, 5), 16), parseInt(colour.slice(5, 7), 16)];
        cache.set(colour, rgb);
      }
      const at = (y * width + x) * 4;
      pixels[at] = rgb[0];
      pixels[at + 1] = rgb[1];
      pixels[at + 2] = rgb[2];
      pixels[at + 3] = 255;
    }
  }
  return { width, height, pixels };
}
