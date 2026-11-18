import almshouses from './almshouses.json' with { type: 'json' };
import bellows from './bellows.json' with { type: 'json' };
import bishopsWharf from './bishops-wharf.json' with { type: 'json' };
import breakwater from './breakwater.json' with { type: 'json' };
import brinehouse from './brinehouse.json' with { type: 'json' };
import canalBasin from './canal-basin.json' with { type: 'json' };
import cathedralClose from './cathedral-close.json' with { type: 'json' };
import causewayGate from './causeway-gate.json' with { type: 'json' };
import coalStaithes from './coal-staithes.json' with { type: 'json' };
import cordonGate from './cordon-gate.json' with { type: 'json' };
import crescentGardens from './crescent-gardens.json' with { type: 'json' };
import drownedTerraces from './drowned-terraces.json' with { type: 'json' };
import dryDockFour from './dry-dock-four.json' with { type: 'json' };
import engineWorks from './engine-works.json' with { type: 'json' };
import exchangeSquare from './exchange-square.json' with { type: 'json' };
import floodgate from './floodgate.json' with { type: 'json' };
import fogSignal from './fog-signal.json' with { type: 'json' };
import gallowsHill from './gallows-hill.json' with { type: 'json' };
import gasworks from './gasworks.json' with { type: 'json' };
import gatehouseYard from './gatehouse-yard.json' with { type: 'json' };
import gullCliffs from './gull-cliffs.json' with { type: 'json' };
import headlandRoad from './headland-road.json' with { type: 'json' };
import hullGraveyard from './hull-graveyard.json' with { type: 'json' };
import inclineTop from './incline-top.json' with { type: 'json' };
import keepersRow from './keepers-row.json' with { type: 'json' };
import laundryGardens from './laundry-gardens.json' with { type: 'json' };
import magistratesRow from './magistrates-row.json' with { type: 'json' };
import marketRow from './market-row.json' with { type: 'json' };
import meridianIntake from './meridian-intake.json' with { type: 'json' };
import meridianSecure from './meridian-secure.json' with { type: 'json' };
import meridianVault from './meridian-vault.json' with { type: 'json' };
import observatoryHill from './observatory-hill.json' with { type: 'json' };
import reedbeds from './reedbeds.json' with { type: 'json' };
import rollingMill from './rolling-mill.json' with { type: 'json' };
import ropeWalk from './rope-walk.json' with { type: 'json' };
import saltPans from './salt-pans.json' with { type: 'json' };
import scrapyards from './scrapyards.json' with { type: 'json' };
import seawall from './seawall.json' with { type: 'json' };
import shipwrightsRow from './shipwrights-row.json' with { type: 'json' };
import shipyardFringe from './shipyard-fringe.json' with { type: 'json' };
import siteFathom from './site-fathom.json' with { type: 'json' };
import slagHills from './slag-hills.json' with { type: 'json' };
import sluiceEnd from './sluice-end.json' with { type: 'json' };
import stiltTown from './stilt-town.json' with { type: 'json' };
import sunkenArcade from './sunken-arcade.json' with { type: 'json' };
import tenements from './tenements.json' with { type: 'json' };
import terminusSquare from './terminus-square.json' with { type: 'json' };
import theCut from './the-cut.json' with { type: 'json' };
import theLantern from './the-lantern.json' with { type: 'json' };
import theShambles from './the-shambles.json' with { type: 'json' };
import theSpire from './the-spire.json' with { type: 'json' };
import tideSteps from './tide-steps.json' with { type: 'json' };
import viaductEnd from './viaduct-end.json' with { type: 'json' };
import wreckersSpit from './wreckers-spit.json' with { type: 'json' };
import type { DistrictId } from '../../../ids.ts';

export const LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>> = {
  almshouses,
  bellows,
  'bishops-wharf': bishopsWharf,
  breakwater,
  brinehouse,
  'canal-basin': canalBasin,
  'cathedral-close': cathedralClose,
  'causeway-gate': causewayGate,
  'coal-staithes': coalStaithes,
  'cordon-gate': cordonGate,
  'crescent-gardens': crescentGardens,
  'drowned-terraces': drownedTerraces,
  'dry-dock-four': dryDockFour,
  'engine-works': engineWorks,
  'exchange-square': exchangeSquare,
  floodgate,
  'fog-signal': fogSignal,
  'gallows-hill': gallowsHill,
  gasworks,
  'gatehouse-yard': gatehouseYard,
  'gull-cliffs': gullCliffs,
  'headland-road': headlandRoad,
  'hull-graveyard': hullGraveyard,
  'incline-top': inclineTop,
  'keepers-row': keepersRow,
  'laundry-gardens': laundryGardens,
  'magistrates-row': magistratesRow,
  'market-row': marketRow,
  'meridian-intake': meridianIntake,
  'meridian-secure': meridianSecure,
  'meridian-vault': meridianVault,
  'observatory-hill': observatoryHill,
  reedbeds,
  'rolling-mill': rollingMill,
  'rope-walk': ropeWalk,
  'salt-pans': saltPans,
  scrapyards,
  seawall,
  'shipwrights-row': shipwrightsRow,
  'shipyard-fringe': shipyardFringe,
  'site-fathom': siteFathom,
  'slag-hills': slagHills,
  'sluice-end': sluiceEnd,
  'stilt-town': stiltTown,
  'sunken-arcade': sunkenArcade,
  tenements,
  'terminus-square': terminusSquare,
  'the-cut': theCut,
  'the-lantern': theLantern,
  'the-shambles': theShambles,
  'the-spire': theSpire,
  'tide-steps': tideSteps,
  'viaduct-end': viaductEnd,
  'wreckers-spit': wreckersSpit,
};
