import terminusSquare from './layouts/terminus-square.json' with { type: 'json' };
import tenements from './layouts/tenements.json' with { type: 'json' };
import marketRow from './layouts/market-row.json' with { type: 'json' };
import canalBasin from './layouts/canal-basin.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';
import { registerFurnishingKit } from '../furnishingKit.ts';
import { CITY_KIT } from '../seed/cityKit.ts';

registerFurnishingKit(CITY_KIT);

export const TERMINUS_SQUARE = buildDistrict(terminusSquare);
export const TERMINUS_SQUARE_ANCHORS = anchorsOf(TERMINUS_SQUARE, ['start', 'recovery']);
export const TENEMENTS = buildDistrict(tenements);
export const MARKET_ROW = buildDistrict(marketRow);
export const CANAL_BASIN = buildDistrict(canalBasin);
export const LOW_WARD_DISTRICTS = [TERMINUS_SQUARE, TENEMENTS, MARKET_ROW, CANAL_BASIN] as const;
