import layout from './layouts/waterworks.json' with { type: 'json' };
import { buildDistrict } from '../../world/layout.ts';

export const WATERWORKS = buildDistrict(layout);
