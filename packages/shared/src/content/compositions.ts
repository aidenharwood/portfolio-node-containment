import type { RoomShape } from '../world/blueprint.ts';
import type { FloorDecalKind } from '../world/decals.ts';
import type { TileRect } from '../world/geometry.ts';
import type { DressingTheme, PrefabRole } from './prefabs/index.ts';

export type DressingDensity = 'sparse' | 'normal' | 'dense';

export type CompositionName = 'court' | 'radial' | 'concourse' | 'hall' | 'workroom' | 'yard' | 'nave';

export type CompositionZoneKind = 'focal' | 'bays' | 'corners' | 'edges' | 'field';

export type CompositionLane = 'cross' | 'spine' | 'ring' | 'none';

export interface CompositionZone {
  readonly kind: CompositionZoneKind;
  readonly role: PrefabRole;
  readonly spacing: Readonly<Record<DressingDensity, number>>;
  readonly max?: number;
}

export interface RoomComposition {
  readonly zones: readonly CompositionZone[];
  readonly formal: boolean;
  readonly lane: CompositionLane;
  readonly laneDecal?: FloorDecalKind;
}

const UNSPACED: Readonly<Record<DressingDensity, number>> = { sparse: 0, normal: 0, dense: 0 };

const spaced = (sparse: number, normal: number, dense: number): Readonly<Record<DressingDensity, number>> => ({ sparse, normal, dense });

const focal = (max?: number): CompositionZone => (max === undefined ? { kind: 'focal', role: 'focal', spacing: UNSPACED } : { kind: 'focal', role: 'focal', spacing: UNSPACED, max });
const corners: CompositionZone = { kind: 'corners', role: 'corner', spacing: UNSPACED };
const zone = (kind: CompositionZoneKind, role: PrefabRole, spacing: Readonly<Record<DressingDensity, number>>, max?: number): CompositionZone =>
  max === undefined ? { kind, role, spacing } : { kind, role, spacing, max };

export const COMPOSITIONS: Readonly<Record<CompositionName, RoomComposition>> = {
  court: { zones: [focal(), corners, zone('bays', 'bay', spaced(8, 5, 3)), zone('field', 'island', spaced(9, 6, 4))], formal: false, lane: 'cross' },
  radial: { zones: [focal(), zone('bays', 'bay', spaced(8, 5, 3)), zone('edges', 'island', spaced(8, 5, 4), 8)], formal: true, lane: 'ring' },
  concourse: { zones: [zone('edges', 'edge', spaced(12, 8, 5)), zone('bays', 'bay', spaced(14, 9, 6))], formal: false, lane: 'spine', laneDecal: 'wear' },
  hall: { zones: [zone('bays', 'bay', spaced(6, 4, 2)), zone('field', 'island', spaced(8, 5, 3)), focal(1)], formal: false, lane: 'cross' },
  workroom: { zones: [zone('bays', 'bay', spaced(5, 3, 2)), zone('field', 'island', spaced(8, 6, 4), 1), corners], formal: false, lane: 'none' },
  yard: { zones: [zone('field', 'island', spaced(9, 6, 4)), zone('bays', 'bay', spaced(8, 5, 3))], formal: false, lane: 'cross' },
  nave: { zones: [focal(), zone('field', 'island', spaced(4, 3, 2))], formal: true, lane: 'spine' },
};

const CONCOURSE_RATIO = 2.5;
const WORKROOM_AREA = 500;

export function inferComposition(rect: TileRect, shape: RoomShape, theme: DressingTheme): CompositionName {
  if (shape === 'octagon' || shape === 'round') return 'radial';
  if (theme === 'chapel') return 'nave';
  if (Math.max(rect.width, rect.height) >= CONCOURSE_RATIO * Math.min(rect.width, rect.height)) return 'concourse';
  if (rect.width * rect.height < WORKROOM_AREA) return 'workroom';
  if (theme === 'freight' || theme === 'wet') return 'yard';
  return 'court';
}
