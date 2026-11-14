import type { WorldObjectId } from '../ids.ts';
import type { TileKindId } from '../world/tiles.ts';
import type { DressingTheme } from './prefabs/types.ts';

export type Mount = 'wall' | 'backed' | 'free' | 'seat' | 'flat';

export interface FurnishingProfile {
  readonly mount: Mount;
  readonly homes: readonly DressingTheme[];
  readonly surface?: boolean;
  readonly seatsAt?: 'surface' | 'view';
  readonly backless?: boolean;
  readonly backstop?: boolean;
  readonly inRows?: boolean;
}

const SIGNATURES: Partial<Record<DressingTheme, readonly WorldObjectId[]>> = {};

export const ROOM_SIGNATURES: Readonly<Partial<Record<DressingTheme, readonly WorldObjectId[]>>> = SIGNATURES;

export function registerRoomSignatures(signatures: Readonly<Partial<Record<DressingTheme, readonly WorldObjectId[]>>>): void {
  for (const [theme, ids] of Object.entries(signatures) as [DressingTheme, readonly WorldObjectId[]][]) SIGNATURES[theme] = [...new Set([...(SIGNATURES[theme] ?? []), ...ids])];
}

export const ROOM_FLOORS: Readonly<Partial<Record<TileKindId, readonly DressingTheme[]>>> = {
  ceramic: ['medical', 'ward', 'lab', 'cold', 'canteen'],
  boards: ['archive', 'dormitory', 'office', 'camp', 'canteen', 'chapel', 'garden', 'post', 'home', 'shop'],
};

export const SIGNATURE_MIN_TILES = 60;
export const OPENING_APRON = 1;
export const NARROW_OPENING = 6;
export const WIDE_OPENING_GAP = 3;
export const RHYTHM_LIMIT = 4;
export const REPEAT_LIMIT = 4;
export const BACKLESS_REACH = 2;

