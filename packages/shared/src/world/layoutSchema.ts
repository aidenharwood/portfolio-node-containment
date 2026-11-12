import { z } from 'zod';
import type { CompositionName, DressingDensity } from '../content/compositions.ts';
import type { Condition } from '../content/conditions.ts';
import { DRESSING_THEMES } from '../content/prefabs/types.ts';
import type { ExitSide, RoomShape } from './blueprint.ts';
import type { FloorDecalKind, FloorDecalPattern } from './decals.ts';
import type { Facing } from './geometry.ts';
import { TILE_KIND_IDS } from './tiles.ts';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const FACINGS = ['north', 'east', 'south', 'west'] as const;
const SHAPES = ['rect', 'octagon', 'round'] as const;
const CONDITIONS = ['pristine', 'worn', 'breached', 'overgrown', 'flooded', 'alien', 'uncanny'] as const;
const DENSITIES = ['sparse', 'normal', 'dense'] as const;
const COMPOSITION_NAMES = ['court', 'radial', 'concourse', 'hall', 'workroom', 'yard', 'nave'] as const;
const DECAL_KINDS = ['inlay', 'mosaic', 'rug', 'runner', 'lane-paint', 'hazard-paint', 'wear', 'scorch', 'moss', 'water-stain', 'salt-crust', 'alien-vein', 'cracks'] as const;
const DECAL_PATTERNS = ['solid', 'border', 'checker', 'compass', 'stripe'] as const;

const LAYOUT_ENUMS_MATCH: readonly true[] = [
  true satisfies Same<(typeof FACINGS)[number], Facing>,
  true satisfies Same<(typeof FACINGS)[number], ExitSide>,
  true satisfies Same<(typeof SHAPES)[number], RoomShape>,
  true satisfies Same<(typeof CONDITIONS)[number], Condition>,
  true satisfies Same<(typeof DENSITIES)[number], DressingDensity>,
  true satisfies Same<(typeof COMPOSITION_NAMES)[number], CompositionName>,
  true satisfies Same<(typeof DECAL_KINDS)[number], FloorDecalKind>,
  true satisfies Same<(typeof DECAL_PATTERNS)[number], FloorDecalPattern>,
];

const int = z.number().int();
const facing = z.enum(FACINGS);
const tile = z.enum(TILE_KIND_IDS);
const point = z.object({ x: int, y: int }).strict();
const rect = z.object({ x: int, y: int, width: int.positive(), height: int.positive() }).strict();

export const LAYOUT_POSITION_SCHEMA = z.union([
  z.object({ room: z.string(), dx: int, dy: int }).strict(),
  z.object({ exit: z.string(), index: int.nonnegative() }).strict(),
  z.object({ link: z.tuple([z.string(), z.string()]), index: int.nonnegative() }).strict(),
  point,
]);

const roomPosition = z.object({ room: z.string(), dx: int, dy: int }).strict();

const STEP_SCHEMA = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('room'), id: z.string(), rect, floor: tile, shape: z.enum(SHAPES) }).strict(),
  z.object({ kind: z.literal('link'), from: z.string(), to: z.string(), width: int.positive(), floor: tile, offset: int.optional() }).strict(),
  z.object({ kind: z.literal('exit'), id: z.string(), room: z.string(), side: z.enum(FACINGS), width: int.positive(), offset: int.optional(), gate: z.boolean(), floor: tile.optional() }).strict(),
  z.object({ kind: z.literal('patch'), rect, tile }).strict(),
  z.object({ kind: z.literal('pillars'), room: z.string(), everyX: int.positive(), everyY: int.positive(), inset: int.nonnegative() }).strict(),
  z.object({ kind: z.literal('hollow'), rect }).strict(),
  z.object({ kind: z.literal('track'), points: z.array(point) }).strict(),
]);

const areaOptions = { safe: z.boolean().optional(), multiCombat: z.boolean().optional() };

const ROOM_DRESSING_SCHEMA = z
  .object({
    theme: z.enum(DRESSING_THEMES),
    density: z.enum(DENSITIES).optional(),
    composition: z.enum(COMPOSITION_NAMES).optional(),
    condition: z.enum(CONDITIONS).optional(),
    people: int.nonnegative().optional(),
    cast: z.array(z.string()).optional(),
  })
  .strict();

export const DISTRICT_LAYOUT_SCHEMA = z
  .object({
    id: z.string(),
    name: z.string(),
    subtitle: z.string(),
    tier: int,
    region: z.string(),
    condition: z.enum(CONDITIONS).optional(),
    reachedOnlyByTram: z.boolean().optional(),
    deadEnd: z.boolean().optional(),
    ambience: z.object({ darkness: z.number(), tint: z.string(), fog: z.string(), fixtures: z.enum(['working', 'failing']).optional() }).strict(),
    size: z.object({ width: int.positive(), height: int.positive() }).strict(),
    steps: z.array(STEP_SCHEMA),
    tiles: z.array(z.object({ x: int, y: int, tile }).strict()),
    areas: z.array(z.union([z.object({ room: z.string(), name: z.string(), ...areaOptions }).strict(), z.object({ id: z.string(), name: z.string(), rect, ...areaOptions }).strict()])),
    anchors: z.record(LAYOUT_POSITION_SCHEMA),
    recovery: z.union([z.object({ districtId: z.string(), at: LAYOUT_POSITION_SCHEMA }).strict(), z.object({ districtId: z.string(), anchor: z.string() }).strict()]).optional(),
    objects: z.array(z.object({ id: z.string(), object: z.string(), at: LAYOUT_POSITION_SCHEMA, facing: facing.optional() }).strict()),
    assemblies: z.array(z.object({ id: z.string(), assembly: z.string(), at: LAYOUT_POSITION_SCHEMA, facing: facing.optional(), span: int.positive().optional() }).strict()),
    npcs: z.array(z.object({ id: z.string(), npc: z.string(), at: LAYOUT_POSITION_SCHEMA }).strict()),
    creatures: z.array(z.object({ id: z.string(), creature: z.string(), at: LAYOUT_POSITION_SCHEMA }).strict()),
    lights: z.array(z.object({ at: LAYOUT_POSITION_SCHEMA, radius: z.number(), color: z.string(), intensity: z.number() }).strict()),
    decals: z.array(
      z.object({ kind: z.enum(DECAL_KINDS), pattern: z.enum(DECAL_PATTERNS).optional(), tint: z.string().optional(), at: LAYOUT_POSITION_SCHEMA, width: int.positive(), height: int.positive() }).strict(),
    ),
    setPieces: z.array(z.object({ id: z.string().optional(), prefab: z.string(), at: roomPosition, facing }).strict()),
    dressing: z.record(z.union([z.enum(DRESSING_THEMES), ROOM_DRESSING_SCHEMA])),
    furnish: z
      .object({
        cast: z.array(z.string()).optional(),
        landmarks: z.array(z.string()).optional(),
        decalSwaps: z.record(z.enum(DECAL_KINDS)).optional(),
      })
      .strict(),
  })
  .strict();

export type DistrictLayout = z.infer<typeof DISTRICT_LAYOUT_SCHEMA>;
export type LayoutPosition = z.infer<typeof LAYOUT_POSITION_SCHEMA>;

export const LAYOUT_CHOICES = {
  facings: FACINGS,
  shapes: SHAPES,
  conditions: CONDITIONS,
  densities: DENSITIES,
  compositions: COMPOSITION_NAMES,
  decalKinds: DECAL_KINDS,
  decalPatterns: DECAL_PATTERNS,
  themes: DRESSING_THEMES,
  tiles: TILE_KIND_IDS,
} as const;
