import { heightShade, shadeHex } from '../hud/heightShade.ts';
import { footprintsOf, landOrigin, landOriginSquare, rectContains, type DistrictId, type GameContent, type LandMap, type LandStep, type PlanIssue, type ResolvedLevel, type TilePoint, type TileRect } from '@containment/shared';
import { planDrawList, tileColor, type PlanShape } from './planCanvas.ts';
import type { PlanLayer } from './viewState.ts';

const OUTLINE = '#ffd23f';
const SQUARE_COLOUR = '#7d8f9c';
const STEP_COLOURS: Readonly<Record<LandStep['kind'], string>> = {
  fill: '#7fd3ff',
  line: '#ffffff',
  rise: '#d9b26f',
  ramp: '#f0d79a',
  ward: '#c78bff',
  gate: '#ffd23f',
  relief: '#b98a5a',
  soften: '#9fc7a0',
};
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
  const footprints = footprintsOf(level);
  for (const placed of level.districts) {
    const { x, y } = placed.rect;
    for (const shape of planDrawList(content, placed.districtId, withoutTiles)) shapes.push({ ...shape, x: shape.x + x, y: shape.y + y });
    if (layers.includes('rooms')) shapes.push({ kind: 'room', ...(footprints.get(placed.districtId)?.bounds ?? placed.rect), color: OUTLINE, label: content.districts.get(placed.districtId)?.name ?? placed.districtId });
  }
  const land = level.definition.land;
  if (land && layers.includes('land')) shapes.push(...landStepShapes(land));
  if (land && layers.includes('squares')) shapes.push(...squareShapes(content, level, land));
  if (layers.includes('issues')) for (const issue of issues) if (issue.tile) shapes.push({ kind: 'issue', ...issue.tile, width: 1, height: 1, color: '#ff3b3b', label: issue.message });
  return shapes;
}

const cornersOf = (rect: TileRect): TilePoint[] => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width, y: rect.y },
  { x: rect.x + rect.width, y: rect.y + rect.height },
  { x: rect.x, y: rect.y + rect.height },
];

const boxOf = (points: readonly TilePoint[]): TileRect => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return { x, y, width: Math.ceil(Math.max(...xs)) - x, height: Math.ceil(Math.max(...ys)) - y };
};

const stepLabel = (step: LandStep): string => {
  if (step.kind === 'fill' || step.kind === 'line') return step.kind + ' ' + step.tile;
  if (step.kind === 'rise') return 'rise ' + step.height;
  if (step.kind === 'ramp') return 'ramp ' + step.from + '-' + step.to;
  if (step.kind === 'ward') return 'ward ' + step.ward;
  if (step.kind === 'relief') return 'relief ' + step.low + '-' + step.high;
  if (step.kind === 'soften') return 'soften';
  return 'gate ' + step.id;
};

export function landStepOutline(step: LandStep): { readonly kind: 'polygon' | 'polyline'; readonly points: readonly TilePoint[] } {
  if (step.kind === 'line') return { kind: 'polyline', points: step.points.map((point) => ({ x: point.x + 0.5, y: point.y + 0.5 })) };
  if (step.kind === 'ramp' || step.kind === 'gate') return { kind: 'polygon', points: cornersOf(step.rect) };
  return { kind: 'polygon', points: step.shape.kind === 'polygon' ? step.shape.points : cornersOf(step.shape.rect) };
}

export function landStepShapes(land: LandMap): PlanShape[] {
  const origin = landOrigin(land.plan);
  return land.plan.steps.map((step, index) => {
    const world = landStepOutline(step);
    const outline = { kind: world.kind, points: world.points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y })) };
    return { ...outline, ...boxOf(outline.points), color: STEP_COLOURS[step.kind], label: stepLabel(step), step: index };
  });
}

function squareShapes(content: GameContent, level: ResolvedLevel, land: LandMap): PlanShape[] {
  const { squareSize, columns, rows } = land.plan;
  const origin = landOriginSquare(land.plan);
  const shapes: PlanShape[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const names = level.districts.flatMap((placed) => {
        const district = content.districts.get(placed.districtId);
        return district?.square?.column === column + origin.column && district.square.row === row + origin.row ? [district.name] : [];
      });
      const label = names.length > 0 ? names.join(' / ') : column + origin.column + ',' + (row + origin.row);
      shapes.push({ kind: 'square', x: column * squareSize, y: row * squareSize, width: squareSize, height: squareSize, color: SQUARE_COLOUR, label });
    }
  }
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
  const { scene } = level;
  const { width, height } = scene;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const cache = new Map<string, readonly [number, number, number]>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colour = shadeHex(tileColor(scene.tileAt({ x, y })), heightShade(scene, x, y));
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
