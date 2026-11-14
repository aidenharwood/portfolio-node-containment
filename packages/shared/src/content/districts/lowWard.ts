import terminusSquare from './layouts/terminus-square.json' with { type: 'json' };
import tenements from './layouts/tenements.json' with { type: 'json' };
import marketRow from './layouts/market-row.json' with { type: 'json' };
import canalBasin from './layouts/canal-basin.json' with { type: 'json' };
import laundryGardens from './layouts/laundry-gardens.json' with { type: 'json' };
import theCut from './layouts/the-cut.json' with { type: 'json' };
import scrapyards from './layouts/scrapyards.json' with { type: 'json' };
import shipyardFringe from './layouts/shipyard-fringe.json' with { type: 'json' };
import cordonGate from './layouts/cordon-gate.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';
import { registerFurnishingKit } from '../furnishingKit.ts';
import { CITY_KIT } from '../seed/cityKit.ts';

registerFurnishingKit(CITY_KIT);

export const TERMINUS_SQUARE = buildDistrict(terminusSquare);
export const TERMINUS_SQUARE_ANCHORS = anchorsOf(TERMINUS_SQUARE, ['start', 'recovery']);
export const TENEMENTS = buildDistrict(tenements);
export const MARKET_ROW = buildDistrict(marketRow);
export const CANAL_BASIN = buildDistrict(canalBasin);
export const LAUNDRY_GARDENS = buildDistrict(laundryGardens);
export const THE_CUT = buildDistrict(theCut);
export const SCRAPYARDS = buildDistrict(scrapyards);
export const SHIPYARD_FRINGE = buildDistrict(shipyardFringe);
export const CORDON_GATE = buildDistrict(cordonGate);
export const LOW_WARD_DISTRICTS = [TERMINUS_SQUARE, TENEMENTS, MARKET_ROW, CANAL_BASIN, LAUNDRY_GARDENS, THE_CUT, SCRAPYARDS, SHIPYARD_FRINGE, CORDON_GATE] as const;
