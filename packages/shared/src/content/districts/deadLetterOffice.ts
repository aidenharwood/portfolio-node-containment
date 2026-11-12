import layout from './layouts/dead-letter-office.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const DEAD_LETTER_OFFICE = buildDistrict(layout);
export const DEAD_LETTER_OFFICE_ANCHORS = anchorsOf(DEAD_LETTER_OFFICE, ['spawn', 'chuteArrival']);
