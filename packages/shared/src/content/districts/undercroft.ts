import layout from './layouts/undercroft.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const UNDERCROFT = buildDistrict(layout);
export const UNDERCROFT_ANCHORS = anchorsOf(UNDERCROFT, ['liftArrival', 'sealLanding']);
