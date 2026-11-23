import type { TilePoint } from '../../packages/shared/src/world/geometry.ts';
import { bridgePlans, TRACK_GAUGE, type BridgePlan } from './plan.ts';

export const BRIDGE_WIDTH = 2;

export const BRIDGE_PLANS_FOR_LAND: readonly BridgePlan[] = bridgePlans();

export function bridgeTiles(): TilePoint[] {
  const out: TilePoint[] = [];
  for (const bridge of BRIDGE_PLANS_FOR_LAND) {
    for (let along = 0; along < BRIDGE_WIDTH; along++) for (let across = 0; across < TRACK_GAUGE; across++) {
      out.push(bridge.horizontal ? { x: bridge.x + along, y: bridge.y + across } : { x: bridge.x + across, y: bridge.y + along });
    }
  }
  return out;
}
