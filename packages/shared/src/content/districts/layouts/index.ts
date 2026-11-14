import canalBasin from './canal-basin.json' with { type: 'json' };
import cordonGate from './cordon-gate.json' with { type: 'json' };
import laundryGardens from './laundry-gardens.json' with { type: 'json' };
import marketRow from './market-row.json' with { type: 'json' };
import meridianIntake from './meridian-intake.json' with { type: 'json' };
import meridianSecure from './meridian-secure.json' with { type: 'json' };
import meridianVault from './meridian-vault.json' with { type: 'json' };
import scrapyards from './scrapyards.json' with { type: 'json' };
import shipyardFringe from './shipyard-fringe.json' with { type: 'json' };
import tenements from './tenements.json' with { type: 'json' };
import terminusSquare from './terminus-square.json' with { type: 'json' };
import theCut from './the-cut.json' with { type: 'json' };
import type { DistrictId } from '../../../ids.ts';

export const LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>> = {
  'canal-basin': canalBasin,
  'cordon-gate': cordonGate,
  'laundry-gardens': laundryGardens,
  'market-row': marketRow,
  'meridian-intake': meridianIntake,
  'meridian-secure': meridianSecure,
  'meridian-vault': meridianVault,
  scrapyards,
  'shipyard-fringe': shipyardFringe,
  tenements,
  'terminus-square': terminusSquare,
  'the-cut': theCut,
};
