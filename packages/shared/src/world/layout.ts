import { furnish } from '../content/districts/furnish.ts';
import { setPiece, type SetPiece } from '../content/districts/setPiece.ts';
import { drawBlueprint, type Blueprint, type BlueprintBase } from './blueprint.ts';
import type { AreaDefinition, DistrictDefinition } from './district.ts';
import { tileKey, type TilePoint } from './geometry.ts';
import { LAYOUT_SOURCES } from '../content/districts/layouts/index.ts';
import { cutSquare, LAND_GROUND_ROOM, type LandMap } from './landPlan.ts';
import { resolvePosition } from './layoutPosition.ts';
import { DISTRICT_LAYOUT_SCHEMA, type DistrictLayout, type LayoutPosition } from './layoutSchema.ts';
import { describeIssue } from './schemaIssues.ts';

const idOf = (source: unknown): string =>
  source !== null && typeof source === 'object' && typeof (source as { id?: unknown }).id === 'string' ? (source as { id: string }).id : 'layout';

export function parseLayout(source: unknown): DistrictLayout {
  const parsed = DISTRICT_LAYOUT_SCHEMA.safeParse(source);
  if (!parsed.success) throw new Error(`${idOf(source)}: ${parsed.error.issues.map(describeIssue).join('; ')}`);
  return parsed.data;
}

const nonEmpty = <T>(key: string, values: readonly T[]): Record<string, readonly T[]> => (values.length > 0 ? { [key]: values } : {});

function checkGeometry(layout: DistrictLayout): void {
  const { id, size } = layout;
  const fail = (path: string, reason: string): never => {
    throw new Error(`${id}: ${path}: ${reason}`);
  };
  const outside = (x: number, y: number): boolean => x < 0 || y < 0 || x >= size.width || y >= size.height;
  const rooms = new Set<string>(layout.square ? [LAND_GROUND_ROOM] : []);
  layout.steps.forEach((step, index) => {
    const path = `steps[${index}]`;
    if (layout.square && step.kind === 'exit') fail(path, 'a land square takes its edges from the land; it has no exits');
    if (layout.square && (step.kind === 'room' || step.kind === 'building') && step.id === LAND_GROUND_ROOM) {
      fail(`${path}.id`, `room "${LAND_GROUND_ROOM}" is the land square's own ground`);
    }
    const needRoom = (field: string, room: string): void => {
      if (!rooms.has(room)) fail(`${path}.${field}`, `room "${room}" is not drawn by an earlier step`);
    };
    if ('rect' in step && (outside(step.rect.x, step.rect.y) || outside(step.rect.x + step.rect.width - 1, step.rect.y + step.rect.height - 1))) {
      fail(`${path}.rect`, `${step.rect.x},${step.rect.y} ${step.rect.width}x${step.rect.height} is outside the district's ${size.width}x${size.height}`);
    }
    if (step.kind === 'room' || step.kind === 'building') rooms.add(step.id);
    if (step.kind === 'link') {
      needRoom('from', step.from);
      needRoom('to', step.to);
    }
    if (step.kind === 'exit' || step.kind === 'pillars') needRoom('room', step.room);
  });
  layout.tiles.forEach((tile, index) => {
    if (outside(tile.x, tile.y)) fail(`tiles[${index}]`, `${tile.x},${tile.y} is outside the district's ${size.width}x${size.height}`);
  });
  (layout.heights ?? []).forEach((tile, index) => {
    if (outside(tile.x, tile.y)) fail(`heights[${index}]`, `${tile.x},${tile.y} is outside the district's ${size.width}x${size.height}`);
  });
}

function squareBase(layout: DistrictLayout, land: LandMap | undefined): BlueprintBase | undefined {
  const { id, size, square } = layout;
  if (!square) return undefined;
  if (!land) throw new Error(`${id}: square: a land square needs the land plan`);
  const { squareSize } = land.plan;
  if (size.width !== squareSize || size.height !== squareSize) throw new Error(`${id}: size: a land square is ${squareSize}x${squareSize}`);
  try {
    return cutSquare(land, square, square.split ? layout.region : undefined);
  } catch (error) {
    throw new Error(`${id}: square: ${(error as Error).message}`);
  }
}

function drawLayout(layout: DistrictLayout, land?: LandMap): Blueprint {
  const base = squareBase(layout, land);
  checkGeometry(layout);
  let plan: Blueprint;
  try {
    plan = drawBlueprint(layout.size, layout.steps, [], [], base);
  } catch (error) {
    throw new Error(`${layout.id}: steps: ${(error as Error).message}`);
  }
  const doorways = new Map<string, string>();
  for (const [name, exit] of Object.entries(plan.exits)) for (const tile of exit.tiles) doorways.set(tileKey(tile), `exit "${name}"`);
  for (const [name, tiles] of Object.entries(plan.links)) for (const tile of tiles) doorways.set(tileKey(tile), `link "${name.replace('>', '" to "')}"`);
  layout.tiles.forEach((tile, index) => {
    const doorway = doorways.get(tileKey(tile));
    if (doorway) throw new Error(`${layout.id}: tiles[${index}]: ${tile.x},${tile.y} is part of ${doorway}; change that step instead of painting over it`);
  });
  const heights = layout.heights ?? [];
  if (layout.tiles.length === 0 && heights.length === 0) return plan;
  try {
    return drawBlueprint(layout.size, layout.steps, layout.tiles, heights, base);
  } catch (error) {
    throw new Error(`${layout.id}: ${(error as Error).message}`);
  }
}

interface AnchorCache {
  readonly plain: Map<string, TilePoint>;
  readonly lands: WeakMap<LandMap, Map<string, TilePoint>>;
}

const anchorCaches = new WeakMap<object, AnchorCache>();

function anchorCache(land: LandMap | undefined, layouts: Readonly<Record<string, unknown>>): Map<string, TilePoint> {
  let caches = anchorCaches.get(layouts);
  if (!caches) {
    caches = { plain: new Map(), lands: new WeakMap() };
    anchorCaches.set(layouts, caches);
  }
  if (!land) return caches.plain;
  const known = caches.lands.get(land);
  if (known) return known;
  const fresh = new Map<string, TilePoint>();
  caches.lands.set(land, fresh);
  return fresh;
}

function foreignAnchor(districtId: string, name: string, path: string, land: LandMap | undefined, layouts: Readonly<Record<string, unknown>>): TilePoint {
  const key = `${districtId}:${name}`;
  const cache = anchorCache(land, layouts);
  const known = cache.get(key);
  if (known) return known;
  const source = layouts[districtId];
  if (source === undefined) throw new Error(`${path}: district "${districtId}" has no layout`);
  const layout = parseLayout(source);
  const position = layout.anchors[name];
  if (!position) throw new Error(`${path}: district "${districtId}" has no anchor "${name}"`);
  const point = resolvePosition(drawLayout(layout, land), position, path);
  cache.set(key, point);
  return point;
}

export function buildDistrict(source: unknown, land?: LandMap, layouts: Readonly<Record<string, unknown>> = LAYOUT_SOURCES): DistrictDefinition {
  const layout = parseLayout(source);
  const id = layout.id;
  const plan = drawLayout(layout, land);
  const at = (position: LayoutPosition, path: string): TilePoint => {
    const point = resolvePosition(plan, position, `${id}: ${path}`);
    if (layout.square && plan.map[point.y]?.[point.x] === ' ') throw new Error(`${id}: ${path}: ${point.x},${point.y} is not this square's land`);
    return point;
  };

  const areas: AreaDefinition[] = layout.areas.map((area, index) => {
    const options = { ...(area.safe === undefined ? {} : { safe: area.safe }), ...(area.multiCombat === undefined ? {} : { multiCombat: area.multiCombat }) };
    if ('room' in area) {
      if (!plan.rooms[area.room]) throw new Error(`${id}: areas[${index}].room: room "${area.room}" is not in this district`);
      return plan.area(area.room, area.name, options);
    }
    return { id: area.id, name: area.name, rect: area.rect, ...options };
  });

  const anchors = Object.fromEntries(Object.entries(layout.anchors).map(([name, position]) => [name, at(position, `anchors.${name}`)]));

  const recoveryPosition = (recovery: NonNullable<DistrictLayout['recovery']>): TilePoint => {
    if ('at' in recovery) return at(recovery.at, 'recovery.at');
    if (recovery.districtId !== id) return foreignAnchor(recovery.districtId, recovery.anchor, `${id}: recovery.anchor`, land, layouts);
    const own = anchors[recovery.anchor];
    if (!own) throw new Error(`${id}: recovery.anchor: this district has no anchor "${recovery.anchor}"`);
    return own;
  };
  const recovery = layout.recovery === undefined ? undefined : { districtId: layout.recovery.districtId, position: recoveryPosition(layout.recovery) };

  const setPieces: SetPiece[] = layout.setPieces.map((piece, index) => {
    try {
      return setPiece(plan, piece.at.room, piece.prefab, piece.at.dx, piece.at.dy, piece.facing, piece.id);
    } catch (error) {
      throw new Error(`${id}: setPieces[${index}]: ${(error as Error).message}`);
    }
  });

  const district: DistrictDefinition = {
    id,
    name: layout.name,
    subtitle: layout.subtitle,
    tier: layout.tier,
    ...(layout.condition === undefined ? {} : { condition: layout.condition }),
    region: layout.region,
    ...(layout.square === undefined ? {} : { square: layout.square }),
    ...(layout.reachedOnlyByTram === undefined ? {} : { reachedOnlyByTram: layout.reachedOnlyByTram }),
    ...(layout.deadEnd === undefined ? {} : { deadEnd: layout.deadEnd }),
    ambience: layout.ambience,
    map: plan.map,
    ...(plan.heights === undefined ? {} : { heights: plan.heights }),
    rooms: plan.rooms,
    exits: plan.exits,
    ...(Object.keys(anchors).length > 0 ? { anchors } : {}),
    ...(recovery === undefined ? {} : { recovery }),
    areas,
    npcs: layout.npcs.map((npc, index) => ({ instanceId: npc.id, npcId: npc.npc, position: at(npc.at, `npcs[${index}].at`) })),
    objects: layout.objects.map((object, index) => ({
      instanceId: object.id,
      objectId: object.object,
      position: at(object.at, `objects[${index}].at`),
      ...(object.facing === undefined ? {} : { facing: object.facing }),
    })),
    ...nonEmpty(
      'assemblies',
      layout.assemblies.map((assembly, index) => ({
        instanceId: assembly.id,
        assemblyId: assembly.assembly,
        position: at(assembly.at, `assemblies[${index}].at`),
        ...(assembly.facing === undefined ? {} : { facing: assembly.facing }),
        ...(assembly.span === undefined ? {} : { span: assembly.span }),
      })),
    ),
    ...nonEmpty(
      'creatures',
      layout.creatures.map((creature, index) => ({ instanceId: creature.id, creatureId: creature.creature, position: at(creature.at, `creatures[${index}].at`) })),
    ),
    lights: layout.lights.map((light, index) => ({ position: at(light.at, `lights[${index}].at`), radius: light.radius, color: light.color, intensity: light.intensity })),
    ...nonEmpty(
      'decals',
      layout.decals.map((decal, index) => ({
        kind: decal.kind,
        rect: { ...at(decal.at, `decals[${index}].at`), width: decal.width, height: decal.height },
        ...(decal.pattern === undefined ? {} : { pattern: decal.pattern }),
        ...(decal.tint === undefined ? {} : { tint: decal.tint }),
      })),
    ),
  };

  return furnish(plan, district, layout.dressing, {
    ...(layout.furnish.cast === undefined ? {} : { cast: layout.furnish.cast }),
    ...(setPieces.length > 0 ? { setPieces } : {}),
    ...(layout.furnish.landmarks === undefined ? {} : { landmarks: layout.furnish.landmarks }),
  });
}

export function firstHollowOf(source: unknown): TilePoint {
  const layout = parseLayout(source);
  const hollow = layout.steps.find((step): step is Extract<typeof step, { kind: 'hollow' }> => step.kind === 'hollow');
  if (!hollow) throw new Error(`${layout.id}: the layout has no hollow step`);
  return { x: hollow.rect.x, y: hollow.rect.y };
}

export function anchorsOf<K extends string>(district: DistrictDefinition, keys: readonly K[]): Readonly<Record<K, TilePoint>> {
  const entries = keys.map((key) => {
    const point = district.anchors?.[key];
    if (!point) throw new Error(`${district.id}: anchor "${key}" is not in the layout`);
    return [key, point] as const;
  });
  return Object.fromEntries(entries) as Record<K, TilePoint>;
}
