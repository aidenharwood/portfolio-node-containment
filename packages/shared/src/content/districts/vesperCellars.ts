import layout from './layouts/vesper-cellars.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const VESPER_CELLARS = buildDistrict(layout);
export const VESPER_CELLARS_ANCHORS = anchorsOf(VESPER_CELLARS, ['liftArrival']);
