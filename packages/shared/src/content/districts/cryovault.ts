import layout from './layouts/cryovault.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const CRYOVAULT = buildDistrict(layout);
export const CRYOVAULT_ANCHORS = anchorsOf(CRYOVAULT, ['tramPlatform', 'entrance']);
