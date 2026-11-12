import layout from './layouts/meridian-circuit.json' with { type: 'json' };
import { buildDistrict } from '../../world/layout.ts';

export const MERIDIAN_CIRCUIT = buildDistrict(layout);
