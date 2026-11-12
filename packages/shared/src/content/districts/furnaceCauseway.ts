import layout from './layouts/furnace-causeway.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const FURNACE_CAUSEWAY = buildDistrict(layout);
export const FURNACE_CAUSEWAY_ANCHORS = anchorsOf(FURNACE_CAUSEWAY, ['furnaceGate', 'landing']);
