import layout from './layouts/hydroponics.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const HYDROPONICS = buildDistrict(layout);
export const HYDROPONICS_ANCHORS = anchorsOf(HYDROPONICS, ['tramPlatform', 'foldReturn', 'bulkheadOutside']);
