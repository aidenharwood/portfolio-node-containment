import canalBasin from './canal-basin.json' with { type: 'json' };
import marketRow from './market-row.json' with { type: 'json' };
import tenements from './tenements.json' with { type: 'json' };
import terminusSquare from './terminus-square.json' with { type: 'json' };
import laundryGardens from './laundry-gardens.json' with { type: 'json' };
import theCut from './the-cut.json' with { type: 'json' };
import scrapyards from './scrapyards.json' with { type: 'json' };
import shipyardFringe from './shipyard-fringe.json' with { type: 'json' };
import cordonGate from './cordon-gate.json' with { type: 'json' };
import type { DistrictId } from '../../../ids.ts';

export const LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>> = {
  'terminus-square': terminusSquare,
  tenements,
  'market-row': marketRow,
  'canal-basin': canalBasin,
  'laundry-gardens': laundryGardens,
  'the-cut': theCut,
  'scrapyards': scrapyards,
  'shipyard-fringe': shipyardFringe,
  'cordon-gate': cordonGate,
};
