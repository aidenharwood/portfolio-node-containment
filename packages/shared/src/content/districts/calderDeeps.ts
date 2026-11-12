import layout from './layouts/calder-deeps.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const CALDER_DEEPS = buildDistrict(layout);
export const CALDER_DEEPS_ANCHORS = anchorsOf(CALDER_DEEPS, ['liftArrival']);
