import gatehouseYard from './layouts/gatehouse-yard.json' with { type: 'json' };
import shipwrightsRow from './layouts/shipwrights-row.json' with { type: 'json' };
import dryDockFour from './layouts/dry-dock-four.json' with { type: 'json' };
import ropeWalk from './layouts/rope-walk.json' with { type: 'json' };
import engineWorks from './layouts/engine-works.json' with { type: 'json' };
import hullGraveyard from './layouts/hull-graveyard.json' with { type: 'json' };
import inclineTop from './layouts/incline-top.json' with { type: 'json' };
import crescentGardens from './layouts/crescent-gardens.json' with { type: 'json' };
import observatoryHill from './layouts/observatory-hill.json' with { type: 'json' };
import exchangeSquare from './layouts/exchange-square.json' with { type: 'json' };
import theSpire from './layouts/the-spire.json' with { type: 'json' };
import magistratesRow from './layouts/magistrates-row.json' with { type: 'json' };
import viaductEnd from './layouts/viaduct-end.json' with { type: 'json' };
import gasworks from './layouts/gasworks.json' with { type: 'json' };
import slagHills from './layouts/slag-hills.json' with { type: 'json' };
import rollingMill from './layouts/rolling-mill.json' with { type: 'json' };
import bellows from './layouts/bellows.json' with { type: 'json' };
import coalStaithes from './layouts/coal-staithes.json' with { type: 'json' };
import keepersRow from './layouts/keepers-row.json' with { type: 'json' };
import headlandRoad from './layouts/headland-road.json' with { type: 'json' };
import theLantern from './layouts/the-lantern.json' with { type: 'json' };
import gullCliffs from './layouts/gull-cliffs.json' with { type: 'json' };
import fogSignal from './layouts/fog-signal.json' with { type: 'json' };
import seawall from './layouts/seawall.json' with { type: 'json' };
import sluiceEnd from './layouts/sluice-end.json' with { type: 'json' };
import saltPans from './layouts/salt-pans.json' with { type: 'json' };
import stiltTown from './layouts/stilt-town.json' with { type: 'json' };
import brinehouse from './layouts/brinehouse.json' with { type: 'json' };
import reedbeds from './layouts/reedbeds.json' with { type: 'json' };
import wreckersSpit from './layouts/wreckers-spit.json' with { type: 'json' };
import causewayGate from './layouts/causeway-gate.json' with { type: 'json' };
import theShambles from './layouts/the-shambles.json' with { type: 'json' };
import almshouses from './layouts/almshouses.json' with { type: 'json' };
import bishopsWharf from './layouts/bishops-wharf.json' with { type: 'json' };
import cathedralClose from './layouts/cathedral-close.json' with { type: 'json' };
import gallowsHill from './layouts/gallows-hill.json' with { type: 'json' };
import floodgate from './layouts/floodgate.json' with { type: 'json' };
import sunkenArcade from './layouts/sunken-arcade.json' with { type: 'json' };
import drownedTerraces from './layouts/drowned-terraces.json' with { type: 'json' };
import tideSteps from './layouts/tide-steps.json' with { type: 'json' };
import siteFathom from './layouts/site-fathom.json' with { type: 'json' };
import breakwater from './layouts/breakwater.json' with { type: 'json' };
import { buildDistrict } from '../../world/layout.ts';
import { registerFurnishingKit } from '../furnishingKit.ts';
import { CITY_KIT } from '../seed/cityKit.ts';
import { HOLLOW_BAY_KIT } from '../seed/hollowBay.ts';

registerFurnishingKit(CITY_KIT);
registerFurnishingKit(HOLLOW_BAY_KIT);

export const HOLLOW_BAY_DISTRICTS = [
  buildDistrict(gatehouseYard),
  buildDistrict(shipwrightsRow),
  buildDistrict(dryDockFour),
  buildDistrict(ropeWalk),
  buildDistrict(engineWorks),
  buildDistrict(hullGraveyard),
  buildDistrict(inclineTop),
  buildDistrict(crescentGardens),
  buildDistrict(observatoryHill),
  buildDistrict(exchangeSquare),
  buildDistrict(theSpire),
  buildDistrict(magistratesRow),
  buildDistrict(viaductEnd),
  buildDistrict(gasworks),
  buildDistrict(slagHills),
  buildDistrict(rollingMill),
  buildDistrict(bellows),
  buildDistrict(coalStaithes),
  buildDistrict(keepersRow),
  buildDistrict(headlandRoad),
  buildDistrict(theLantern),
  buildDistrict(gullCliffs),
  buildDistrict(fogSignal),
  buildDistrict(seawall),
  buildDistrict(sluiceEnd),
  buildDistrict(saltPans),
  buildDistrict(stiltTown),
  buildDistrict(brinehouse),
  buildDistrict(reedbeds),
  buildDistrict(wreckersSpit),
  buildDistrict(causewayGate),
  buildDistrict(theShambles),
  buildDistrict(almshouses),
  buildDistrict(bishopsWharf),
  buildDistrict(cathedralClose),
  buildDistrict(gallowsHill),
  buildDistrict(floodgate),
  buildDistrict(sunkenArcade),
  buildDistrict(drownedTerraces),
  buildDistrict(tideSteps),
  buildDistrict(siteFathom),
  buildDistrict(breakwater),
] as const;

export const HOLLOW_BAY_DISTRICT_IDS: readonly string[] = HOLLOW_BAY_DISTRICTS.map((district) => district.id);
