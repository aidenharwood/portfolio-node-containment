import layout from './layouts/salt-cathedral.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const SALT_CATHEDRAL = buildDistrict(layout);
export const SALT_CATHEDRAL_ANCHORS = anchorsOf(SALT_CATHEDRAL, []);
