import type { WallMaterialId } from '@containment/shared';

export interface WallPalette {
  readonly body: number;
  readonly joint: number;
  readonly cap: number;
  readonly plinth: number;
  readonly dado: number;
}

export const WALL_PALETTE = {
  brick: { body: 0x6e3b2e, joint: 0x5e3327, cap: 0x7a756d, plinth: 0x3a3734, dado: 0x4a2a28 },
  blockwork: { body: 0x5a5f63, joint: 0x45494c, cap: 0x6e7174, plinth: 0x34383b, dado: 0x34403f },
  cladding: { body: 0x3e5560, joint: 0x4d6772, cap: 0x55656c, plinth: 0x2a3034, dado: 0x2f3c34 },
  wall: { body: 0xd8d6cc, joint: 0xb4b2a8, cap: 0xe4e2d8, plinth: 0x2a2a2a, dado: 0x2a3a45 },
} as const satisfies Record<WallMaterialId, WallPalette>;

export const FACILITY_WALL = { body: 0x2a3a45, cap: 0x3b4b57, kick: 0x151c21, trim: 0x2f4250 } as const;

export const ROOF_TRAY = 0x3c4044;

export const INTERIOR_PLASTER = 0x7d766a;
