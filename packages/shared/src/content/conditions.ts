import type { WorldObjectId } from '../ids.ts';
import type { FloorDecalKind } from '../world/decals.ts';

export type Condition = 'pristine' | 'worn' | 'breached' | 'overgrown' | 'flooded' | 'alien' | 'uncanny';

export interface ConditionRule {
  readonly swapShare: number;
  readonly swaps: Readonly<Partial<Record<WorldObjectId, WorldObjectId>>>;
  readonly adds: readonly string[];
  readonly addsPerThousandTiles: number;
  readonly decals: readonly FloorDecalKind[];
  readonly decalsPerThousandTiles: number;
}

const rule = (overrides: Partial<ConditionRule>): ConditionRule => ({
  swapShare: 0,
  swaps: {},
  adds: [],
  addsPerThousandTiles: 0,
  decals: [],
  decalsPerThousandTiles: 0,
  ...overrides,
});

export const CONDITION_RULES: Readonly<Record<Condition, ConditionRule>> = {
  pristine: rule({}),
  worn: rule({ swapShare: 0.1, adds: ['debris'], addsPerThousandTiles: 1, decals: ['wear'], decalsPerThousandTiles: 4 }),
  breached: rule({
    swapShare: 0.3,
    swaps: { 'briefing-bench': 'bench-toppled', planter: 'planter-toppled', 'shuttered-kiosk': 'kiosk-burnt' },
    adds: ['barricade-line', 'rubble', 'debris'],
    addsPerThousandTiles: 4,
    decals: ['scorch', 'cracks'],
    decalsPerThousandTiles: 8,
  }),
  overgrown: rule({ decals: ['moss'], decalsPerThousandTiles: 10 }),
  flooded: rule({ adds: ['sandbag-row'], addsPerThousandTiles: 2, decals: ['water-stain'], decalsPerThousandTiles: 10 }),
  alien: rule({ decals: ['alien-vein'], decalsPerThousandTiles: 8 }),
  uncanny: rule({}),
};
