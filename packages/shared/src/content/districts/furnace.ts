import layout from './layouts/furnace.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const FURNACE = buildDistrict(layout);
export const FURNACE_ANCHORS = anchorsOf(FURNACE, ['tramPlatform', 'entrance', 'reactorApproach']);
