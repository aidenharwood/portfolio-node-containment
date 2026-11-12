import type { GearMotif } from '../gear/items.ts';
import { footprintTiles, isInFootprint } from '../world/footprint.ts';
import { CARDINAL_OFFSETS, tileKey, type Facing, type TilePoint } from '../world/geometry.ts';
import type { CreatureAttack, CreatureId } from './creatures.ts';
import type { CombatStyle } from './weapons.ts';

export const TELEGRAPH_SHAPES = ['line', 'cone', 'ring', 'body', 'circleOnTarget'] as const;
export type TelegraphShape = (typeof TELEGRAPH_SHAPES)[number];

export const HAZARD_KINDS = ['coolant', 'fire', 'salt', 'static'] as const;
export type HazardKind = (typeof HAZARD_KINDS)[number];

export interface TelegraphMechanic {
  readonly kind: 'telegraph';
  readonly id: string;
  readonly shape: TelegraphShape;
  readonly reach: number;
  readonly windupTicks: number;
  readonly cooldownTicks: number;
  readonly style: CombatStyle;
  readonly accuracy: number;
  readonly maxHit: number;
}

export interface SummonMechanic {
  readonly kind: 'summon';
  readonly id: string;
  readonly creatureId: CreatureId;
  readonly count: number;
  readonly everyTicks?: number;
  readonly maxAlive: number;
}

export interface HazardMechanic {
  readonly kind: 'hazard';
  readonly id: string;
  readonly hazard: HazardKind;
  readonly seedTiles: number;
  readonly spreadEveryTicks: number;
  readonly damagePerTick: number;
  readonly maxTiles: number;
}

export interface EnrageMechanic {
  readonly kind: 'enrage';
  readonly id: string;
  readonly afterTicks: number;
  readonly speedFactor: number;
}

export type BossMechanic = TelegraphMechanic | SummonMechanic | HazardMechanic | EnrageMechanic;

export interface EncounterPhase {
  readonly belowIntegrity: number;
  readonly announce: string;
  readonly attack?: CreatureAttack;
  readonly guard?: GearMotif;
  readonly enables: readonly string[];
}

export interface EncounterDefinition {
  readonly mechanics: readonly BossMechanic[];
  readonly phases?: readonly EncounterPhase[];
}

export const MIN_TELEGRAPH_WINDUP = 3;
export const MIN_SURROUND_WINDUP = 4;
export const HAZARD_SEED_RADIUS = 3;

const FACING_STEP: Readonly<Record<Facing, TilePoint>> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export function telegraphHitShare(tier: number): number {
  if (tier <= 2) return 0.25;
  return 0.25 + (Math.min(13, tier) - 2) * (0.2 / 11);
}

export const isSurroundShape = (shape: TelegraphShape): boolean => shape === 'body' || shape === 'ring';

export const minimumWindup = (shape: TelegraphShape): number => (isSurroundShape(shape) ? MIN_SURROUND_WINDUP : MIN_TELEGRAPH_WINDUP);

function ringAround(anchor: TilePoint, size: number, reach: number): TilePoint[] {
  const tiles: TilePoint[] = [];
  for (let y = anchor.y - reach; y < anchor.y + size + reach; y++) {
    for (let x = anchor.x - reach; x < anchor.x + size + reach; x++) {
      if (!isInFootprint({ x, y }, anchor, size)) tiles.push({ x, y });
    }
  }
  return tiles;
}

function forward(anchor: TilePoint, size: number, facing: Facing, depth: number, spread: number): TilePoint[] {
  const step = FACING_STEP[facing];
  const tiles: TilePoint[] = [];
  for (let row = 1; row <= depth; row++) {
    const half = spread * row;
    for (let across = -half; across < size + half; across++) {
      if (step.x !== 0) {
        const x = step.x > 0 ? anchor.x + size - 1 + row : anchor.x - row;
        tiles.push({ x, y: anchor.y + across });
      } else {
        const y = step.y > 0 ? anchor.y + size - 1 + row : anchor.y - row;
        tiles.push({ x: anchor.x + across, y });
      }
    }
  }
  return tiles;
}

export function telegraphTiles(
  shape: TelegraphShape,
  reach: number,
  anchor: TilePoint,
  size: number,
  facing: Facing,
  target: TilePoint,
  isOpen: (point: TilePoint) => boolean,
): TilePoint[] {
  const tiles =
    shape === 'line'
      ? forward(anchor, size, facing, reach, 0)
      : shape === 'cone'
        ? forward(anchor, size, facing, reach, 1)
        : shape === 'ring'
          ? ringAround(anchor, size, reach)
          : shape === 'body'
            ? [...footprintTiles(anchor, size), ...ringAround(anchor, size, 1)]
            : footprintTiles({ x: target.x - reach, y: target.y - reach }, reach * 2 + 1);
  return tiles.filter(isOpen);
}

export function phaseIndexFor(encounter: EncounterDefinition, integrityFraction: number): number {
  return (encounter.phases ?? []).filter((phase) => integrityFraction < phase.belowIntegrity).length;
}

export function activeMechanicIds(encounter: EncounterDefinition, phaseIndex: number): Set<string> {
  const phases = encounter.phases ?? [];
  const gated = new Set(phases.flatMap((phase) => phase.enables));
  const active = new Set(encounter.mechanics.map((mechanic) => mechanic.id).filter((id) => !gated.has(id)));
  for (const phase of phases.slice(0, phaseIndex)) for (const id of phase.enables) active.add(id);
  return active;
}

export function seedHazard(anchor: TilePoint, size: number, count: number, isOpen: (point: TilePoint) => boolean, random: () => number): TilePoint[] {
  const candidates = ringAround(anchor, size, HAZARD_SEED_RADIUS).filter(isOpen);
  const chosen: TilePoint[] = [];
  while (chosen.length < count && candidates.length > 0) {
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
    chosen.push(candidates.splice(index, 1)[0]!);
  }
  return chosen;
}

export function spreadHazard(tiles: readonly TilePoint[], isOpen: (point: TilePoint) => boolean, maxTiles: number, random: () => number): TilePoint[] {
  const grown = [...tiles];
  const present = new Set(grown.map(tileKey));
  for (const tile of tiles) {
    if (grown.length >= maxTiles) break;
    const offset = CARDINAL_OFFSETS[Math.min(CARDINAL_OFFSETS.length - 1, Math.floor(random() * CARDINAL_OFFSETS.length))]!;
    const next = { x: tile.x + offset.x, y: tile.y + offset.y };
    if (present.has(tileKey(next)) || !isOpen(next)) continue;
    present.add(tileKey(next));
    grown.push(next);
  }
  return grown;
}

export const enragedSpeedTicks = (speedTicks: number, speedFactor: number): number => Math.max(1, Math.round(speedTicks / speedFactor));
