import canalBasin from './canal-basin.json' with { type: 'json' };
import marketRow from './market-row.json' with { type: 'json' };
import tenements from './tenements.json' with { type: 'json' };
import terminusSquare from './terminus-square.json' with { type: 'json' };
import type { DistrictId } from '../../../ids.ts';

export const LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>> = {
  'terminus-square': terminusSquare,
  tenements,
  'market-row': marketRow,
  'canal-basin': canalBasin,
};
