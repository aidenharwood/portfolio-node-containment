import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type CharacterAppearance } from '@containment/shared';
import { buildItemModel } from '../src/render/items/itemModels.ts';
import { wornModelsFor } from '../src/render/models/characterModel.ts';

const APPEARANCE: CharacterAppearance = { physique: 'male', bodyType: 'average', height: 1, skinTone: '#c48a62', hairStyle: 'crop', hairColor: '#3b2618', eyeColor: '#3d6e9c', faceMark: 'none', augment: 'none' } as CharacterAppearance;

const TIERS = ['scrap', 'iron', 'steel', 'alloy', 'sinter', 'vault-glass'];
const LINES: Readonly<Record<string, readonly string[]>> = {
  bulwark: TIERS,
  skirmisher: ['patchwork', 'oilskin', 'rigger', 'slipway', 'cordon', 'gloam'],
  warden: ['sackcloth', 'felt', 'vigil', 'tidewarden', 'redline', 'hollow'],
};
const PIECES: Readonly<Record<string, readonly string[]>> = {
  bulwark: ['helm', 'plate', 'gauntlets', 'greaves', 'boots', 'pavise'],
  skirmisher: ['hood', 'jacket', 'gloves', 'trousers', 'treads', 'pack'],
  warden: ['cowl', 'robe', 'wraps', 'breeches', 'footwraps', 'mantle'],
};
const WEAPONS = ['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator'];

const MIN_DISTANCE = 0.2;
const GRID = 16;

type Point = readonly [number, number, number];

const parse = (key: string): Point => key.split(',').map(Number) as unknown as Point;

function silhouette(points: readonly Point[], u: 0 | 1 | 2, v: 0 | 1 | 2): Set<string> {
  const cells = new Set<string>();
  if (points.length === 0) return cells;
  const range = (axis: 0 | 1 | 2) => [Math.min(...points.map((point) => point[axis])), Math.max(...points.map((point) => point[axis]))] as const;
  const [u0, u1] = range(u);
  const [v0, v1] = range(v);
  const scale = (value: number, low: number, high: number) => Math.min(GRID - 1, Math.floor(((value - low) / Math.max(1, high - low + 1)) * GRID));
  for (const point of points) cells.add(`${scale(point[u], u0, u1)},${scale(point[v], v0, v1)}`);
  return cells;
}

const distance = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  let shared = 0;
  for (const key of a) if (b.has(key)) shared++;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : 1 - shared / union;
};

interface Shape {
  readonly views: readonly Set<string>[];
}

const shapeDistance = (a: Shape, b: Shape): number => Math.max(...a.views.map((view, index) => distance(view, b.views[index]!)));

const wornPoints = (gear: readonly string[]): Map<string, Point> => {
  const models = wornModelsFor(APPEARANCE, gear);
  const points = new Map<string, Point>();
  for (const model of [...Object.values(models.parts), ...(models.weapon ? [models.weapon] : [])]) for (const key of model.occupied()) points.set(key, parse(key));
  return points;
};

const NAKED = wornPoints([]);

const gearShape = (itemId: string): Shape => {
  const added = [...wornPoints([itemId]).entries()].filter(([key]) => !NAKED.has(key)).map(([, point]) => point);
  return { views: [silhouette(added, 0, 1), silhouette(added, 2, 1)] };
};

const iconShape = (itemId: string): Shape => {
  const item = GAME_CONTENT.items.get(itemId);
  assert.ok(item, itemId);
  return { views: [silhouette(buildItemModel(item).occupied().map(parse), 0, 1)] };
};

function assertDistinct(label: string, ids: readonly string[], shape: (id: string) => Shape): void {
  const shapes = ids.map(shape);
  const failures: string[] = [];
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const d = shapeDistance(shapes[a]!, shapes[b]!);
      if (d < MIN_DISTANCE) failures.push(`${ids[a]} ~ ${ids[b]} (${(d * 100).toFixed(0)}%)`);
    }
  }
  assert.deepEqual(failures, [], `${label}: tiers share a silhouette`);
}

for (const [line, names] of Object.entries(LINES)) {
  PIECES[line]!.forEach((piece) => {
    const ids = names.map((name) => `${name}-${piece}`);
    test(`worn ${line} ${piece} has its own silhouette at every tier`, () => assertDistinct(`worn ${piece}`, ids, gearShape));
    test(`${line} ${piece} icons differ in shape at every tier`, () => assertDistinct(`icon ${piece}`, ids, iconShape));
  });
}

for (const kind of WEAPONS) {
  const ids = TIERS.map((tier) => `${tier}-${kind}`);
  test(`held ${kind} has its own silhouette at every tier`, () => assertDistinct(`held ${kind}`, ids, gearShape));
  test(`${kind} icons differ in shape at every tier`, () => assertDistinct(`icon ${kind}`, ids, iconShape));
}
