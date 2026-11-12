import type { ZodIssue } from 'zod';
import { furnish } from '../content/districts/furnish.ts';
import { setPiece, type SetPiece } from '../content/districts/setPiece.ts';
import { drawBlueprint } from './blueprint.ts';
import type { AreaDefinition, DistrictDefinition } from './district.ts';
import type { TilePoint } from './geometry.ts';
import { resolvePosition } from './layoutPosition.ts';
import { DISTRICT_LAYOUT_SCHEMA, type DistrictLayout, type LayoutPosition } from './layoutSchema.ts';

const pathOf = (path: readonly (string | number)[]): string =>
  path.reduce<string>((text, segment) => (typeof segment === 'number' ? `${text}[${segment}]` : text === '' ? segment : `${text}.${segment}`), '');

const describeIssue = (issue: ZodIssue): string => {
  const where = pathOf(issue.path);
  return where === '' ? issue.message : `${where}: ${issue.message}`;
};

const idOf = (source: unknown): string =>
  source !== null && typeof source === 'object' && typeof (source as { id?: unknown }).id === 'string' ? (source as { id: string }).id : 'layout';

export function parseLayout(source: unknown): DistrictLayout {
  const parsed = DISTRICT_LAYOUT_SCHEMA.safeParse(source);
  if (!parsed.success) throw new Error(`${idOf(source)}: ${parsed.error.issues.map(describeIssue).join('; ')}`);
  return parsed.data;
}

const nonEmpty = <T>(key: string, values: readonly T[]): Record<string, readonly T[]> => (values.length > 0 ? { [key]: values } : {});

export function buildDistrict(source: unknown): DistrictDefinition {
  const layout = parseLayout(source);
  const id = layout.id;
  const plan = drawBlueprint(layout.size, layout.steps, layout.tiles);
  const at = (position: LayoutPosition, path: string): TilePoint => resolvePosition(plan, position, `${id}: ${path}`);

  const areas: AreaDefinition[] = layout.areas.map((area, index) => {
    const options = { ...(area.safe === undefined ? {} : { safe: area.safe }), ...(area.multiCombat === undefined ? {} : { multiCombat: area.multiCombat }) };
    if ('room' in area) {
      if (!plan.rooms[area.room]) throw new Error(`${id}: areas[${index}].room: room "${area.room}" is not in this district`);
      return plan.area(area.room, area.name, options);
    }
    return { id: area.id, name: area.name, rect: area.rect, ...options };
  });

  const anchors = Object.fromEntries(Object.entries(layout.anchors).map(([name, position]) => [name, at(position, `anchors.${name}`)]));

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
    ...(layout.reachedOnlyByTram === undefined ? {} : { reachedOnlyByTram: layout.reachedOnlyByTram }),
    ...(layout.deadEnd === undefined ? {} : { deadEnd: layout.deadEnd }),
    ambience: layout.ambience,
    map: plan.map,
    rooms: plan.rooms,
    exits: plan.exits,
    ...(Object.keys(anchors).length > 0 ? { anchors } : {}),
    ...(layout.recovery === undefined ? {} : { recovery: { districtId: layout.recovery.districtId, position: at(layout.recovery.at, 'recovery.at') } }),
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
    ...(layout.furnish.decalSwaps === undefined ? {} : { decalSwaps: layout.furnish.decalSwaps }),
  });
}

export function anchorsOf<K extends string>(district: DistrictDefinition, keys: readonly K[]): Readonly<Record<K, TilePoint>> {
  const entries = keys.map((key) => {
    const point = district.anchors?.[key];
    if (!point) throw new Error(`${district.id}: anchor "${key}" is not in the layout`);
    return [key, point] as const;
  });
  return Object.fromEntries(entries) as Record<K, TilePoint>;
}
