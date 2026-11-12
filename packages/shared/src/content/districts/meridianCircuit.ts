import layout from './layouts/meridian-circuit.json' with { type: 'json' };
import { buildDistrict, firstHollowOf } from '../../world/layout.ts';
import type { TilePoint } from '../../world/geometry.ts';

export const CIRCUIT_HOLLOW_FOR_ATRIUM: TilePoint = firstHollowOf(layout);
export const MERIDIAN_CIRCUIT = buildDistrict(layout);
