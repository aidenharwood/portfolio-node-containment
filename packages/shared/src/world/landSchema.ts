import { z } from 'zod';
import type { ExitSide, RoomShape } from './blueprint.ts';
import type { LandPlan, LandStep } from './landPlan.ts';
import { describeIssue } from './schemaIssues.ts';
import { TILE_KIND_IDS } from './tiles.ts';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Writable<T> = T extends readonly (infer Item)[] ? Writable<Item>[] : T extends object ? { -readonly [Key in keyof T]: Writable<T[Key]> } : T;

const SIDES = ['north', 'east', 'south', 'west'] as const;
const SHAPES = ['rect', 'octagon', 'round'] as const;

const int = z.number().int();
const level = int.min(0).max(15);
const tile = z.enum(TILE_KIND_IDS);
const point = z.object({ x: int, y: int }).strict();
const rect = z.object({ x: int, y: int, width: int.positive(), height: int.positive() }).strict();

const shape = z.union([
  z.object({ kind: z.enum(SHAPES), rect }).strict(),
  z.object({ kind: z.literal('polygon'), points: z.array(point).min(3) }).strict(),
]);

const STEP_SCHEMA = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fill'), shape, tile }).strict(),
  z.object({ kind: z.literal('line'), points: z.array(point).min(2), width: int.positive().refine((width) => width % 2 === 1, 'a line is an odd number of tiles wide'), tile }).strict(),
  z.object({ kind: z.literal('rise'), shape, height: level }).strict(),
  z.object({ kind: z.literal('ramp'), rect, side: z.enum(SIDES), from: level, to: level }).strict(),
  z.object({ kind: z.literal('ward'), shape, ward: z.string() }).strict(),
  z.object({ kind: z.literal('gate'), id: z.string(), rect, tile }).strict(),
]);

export const LAND_PLAN_SCHEMA = z
  .object({
    id: z.string(),
    squareSize: int.positive(),
    columns: int.positive(),
    rows: int.positive(),
    steps: z.array(STEP_SCHEMA),
  })
  .strict();

const LAND_ENUMS_MATCH: readonly true[] = [
  true satisfies Same<(typeof SIDES)[number], ExitSide>,
  true satisfies Same<(typeof SHAPES)[number], RoomShape>,
  true satisfies Same<z.infer<typeof STEP_SCHEMA>, Writable<LandStep>>,
  true satisfies Same<z.infer<typeof LAND_PLAN_SCHEMA>, Writable<LandPlan>>,
];

const idOf = (source: unknown): string =>
  source !== null && typeof source === 'object' && typeof (source as { id?: unknown }).id === 'string' ? (source as { id: string }).id : 'land';

export function parseLandPlan(source: unknown): LandPlan {
  const parsed = LAND_PLAN_SCHEMA.safeParse(source);
  if (!parsed.success) throw new Error(`${idOf(source)}: ${parsed.error.issues.map(describeIssue).join('; ')}`);
  return parsed.data;
}
