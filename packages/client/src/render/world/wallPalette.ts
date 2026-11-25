import type { WallMaterialId } from '@containment/shared';

export interface WallPalette {
  readonly body: number;
  readonly joint: number;
  readonly cap: number;
  readonly plinth: number;
  readonly dado: number;
}

export const WALL_PALETTE = {
  brick: { body: 0x6a4234, joint: 0x5e3d31, cap: 0x7a756d, plinth: 0x3a3734, dado: 0x4a2a28 },
  blockwork: { body: 0x5a5f63, joint: 0x45494c, cap: 0x6e7174, plinth: 0x34383b, dado: 0x34403f },
  cladding: { body: 0x3e5560, joint: 0x374b54, cap: 0x55656c, plinth: 0x2a3034, dado: 0x2f3c34 },
  wall: { body: 0xc4c2b8, joint: 0xa3a198, cap: 0xd0cec4, plinth: 0x2a2a2a, dado: 0x2a3a45 },
} as const satisfies Record<WallMaterialId, WallPalette>;

export const FACILITY_WALL = { body: 0x2a3a45, cap: 0x3b4b57, kick: 0x151c21, trim: 0x2f4250 } as const;

export const ROOF_TRAY = 0x3c4044;

export const INTERIOR_PLASTER = 0x7d766a;

export const HAZARD = { yellow: 0xc99a1c, black: 0x17170f } as const;

export const FACADE_BAND = 0xe86a1c;
