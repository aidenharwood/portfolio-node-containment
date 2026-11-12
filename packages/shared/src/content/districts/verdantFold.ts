import layout from './layouts/verdant-fold.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const VERDANT_FOLD = buildDistrict(layout);
export const VERDANT_FOLD_ANCHORS = anchorsOf(VERDANT_FOLD, ['arrival']);
