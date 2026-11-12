import type { WorldObjectId } from '../../ids.ts';
import type { FloorDecalKind, FloorDecalPattern } from '../../world/decals.ts';
import type { Facing, TileRect } from '../../world/geometry.ts';

export const DRESSING_THEMES = [
  'civic',
  'office',
  'canteen',
  'dormitory',
  'industrial',
  'freight',
  'medical',
  'lab',
  'garden',
  'wet',
  'mine',
  'chapel',
  'ward',
  'archive',
  'post',
  'camp',
  'cold',
  'works',
] as const;

export type DressingTheme = (typeof DRESSING_THEMES)[number];

export type PrefabRole = 'focal' | 'bay' | 'corner' | 'edge' | 'island' | 'wall';

export interface PrefabPiece {
  readonly dx: number;
  readonly dy: number;
  readonly objectId: WorldObjectId;
  readonly facing?: Facing;
}

export interface PrefabDecal {
  readonly kind: FloorDecalKind;
  readonly rect: TileRect;
  readonly pattern?: FloorDecalPattern;
  readonly tint?: string;
}

export interface Prefab {
  readonly id: string;
  readonly themes: readonly DressingTheme[];
  readonly roles: readonly PrefabRole[];
  readonly pieces: readonly PrefabPiece[];
  readonly decals?: readonly PrefabDecal[];
  readonly clearance?: number;
  readonly symmetric?: boolean;
  readonly minRoom?: { readonly width: number; readonly height: number };
}

export type PieceSpec = readonly [dx: number, dy: number, objectId: WorldObjectId, facing?: Facing];

export type PrefabOptions = Partial<Pick<Prefab, 'decals' | 'clearance' | 'symmetric' | 'minRoom'>>;

export const prefab = (
  id: string,
  themes: readonly DressingTheme[],
  roles: readonly PrefabRole[],
  pieces: readonly PieceSpec[],
  options: PrefabOptions = {},
): Prefab => ({
  id,
  themes,
  roles,
  pieces: pieces.map(([dx, dy, objectId, facing]) => (facing ? { dx, dy, objectId, facing } : { dx, dy, objectId })),
  ...options,
});

export const row = (objectId: WorldObjectId, length: number, dy = 0, facing?: Facing, dx = 0): PieceSpec[] =>
  Array.from({ length }, (_, index): PieceSpec => (facing ? [dx + index, dy, objectId, facing] : [dx + index, dy, objectId]));
