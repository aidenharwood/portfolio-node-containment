import hinterland from './hinterland.json' with { type: 'json' };
import { drawLand, type LandMap } from '../../world/landPlan.ts';
import { parseLandPlan } from '../../world/landSchema.ts';

export const LAND_SOURCES: Readonly<Record<string, unknown>> = {
  hinterland,
};

export const SHIPPED_LANDS: ReadonlyMap<string, LandMap> = new Map(Object.entries(LAND_SOURCES).map(([id, source]) => [id, drawLand(parseLandPlan(source))]));

export function landFrom(lands: ReadonlyMap<string, LandMap>, id: string): LandMap {
  const land = lands.get(id);
  if (!land) throw new Error(`There is no land plan "${id}".`);
  return land;
}
