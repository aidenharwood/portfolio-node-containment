import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { joinDistricts } from '../../world/levelPlan.ts';
import { drawTrackway, trackCorner, trackPoint } from '../../world/trackway.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

const CHASM_WIDTH = 24;
const TRACKWAY_MARGIN = { x: 8, y: 8 };

const DISTRICT_IDS = [
  'meridian-atrium',
  'meridian-circuit',
  'sector-two',
  'verdance-concourse',
  'hydroponics',
  'service-concourse',
  'service-yards',
  'waterworks',
  'intake-wing',
  'vesper-causeway',
  'vesper-wards',
  'vesper-lodge',
  'vesper-pharmacy',
  'calder-causeway',
  'brine-galleries',
  'calder-gatehouse',
  'salt-cathedral',
];

const widthOf = (district: { readonly map: readonly string[] }): number => (district.map[0] ?? '').length;

export const MAIN_FLOOR_RECIPE: LevelRecipe = (context) => {
  const districts = DISTRICT_IDS.map((id) => context.districtOf(id));
  const circuitHollow = context.hollowOf('meridian-circuit');
  const circuit = context.districtOf('meridian-circuit');
  const placements = joinDistricts(districts, 'meridian-atrium', [
    { districtId: 'sector-two', exit: 'south', to: 'meridian-atrium', toExit: 'north' },
    { districtId: 'meridian-circuit', from: 'meridian-atrium', offset: { x: -circuitHollow.x, y: -circuitHollow.y } },
    { districtId: 'verdance-concourse', exit: 'east', to: 'meridian-circuit', toExit: 'west' },
    { districtId: 'hydroponics', exit: 'east', to: 'verdance-concourse', toExit: 'west' },
    { districtId: 'service-concourse', exit: 'west', to: 'meridian-circuit', toExit: 'east' },
    { districtId: 'service-yards', exit: 'west', to: 'service-concourse', toExit: 'east' },
    { districtId: 'waterworks', exit: 'south', to: 'service-yards', toExit: 'north' },
    { districtId: 'intake-wing', from: 'meridian-circuit', offset: { x: 40, y: circuit.map.length + CHASM_WIDTH } },
    { districtId: 'vesper-causeway', exit: 'east', to: 'hydroponics', toExit: 'west' },
    { districtId: 'vesper-wards', exit: 'south', to: 'vesper-causeway', toExit: 'north' },
    { districtId: 'vesper-lodge', exit: 'east', to: 'vesper-wards', toExit: 'west' },
    { districtId: 'vesper-pharmacy', exit: 'east', to: 'vesper-lodge', toExit: 'west' },
    { districtId: 'calder-causeway', exit: 'west', to: 'waterworks', toExit: 'east' },
    { districtId: 'brine-galleries', exit: 'north', to: 'calder-causeway', toExit: 'south' },
    { districtId: 'calder-gatehouse', exit: 'west', to: 'brine-galleries', toExit: 'east' },
    { districtId: 'salt-cathedral', exit: 'west', to: 'calder-gatehouse', toExit: 'east' },
  ], TRACKWAY_MARGIN);

  const returnLeg = trackPoint('intake-wing', 0, 65);
  const lodgeNorth = trackPoint('vesper-lodge', 55, -2);
  const lodgeSouth = trackPoint('vesper-lodge', 55, context.districtOf('vesper-lodge').map.length);
  const pharmacyCorner = trackPoint('vesper-pharmacy', -5, -5);
  const verdanceWest = trackPoint('hydroponics', -2, 68);
  const verdanceEast = trackPoint('hydroponics', widthOf(context.districtOf('hydroponics')), 68);
  const concourseJog = trackPoint('verdance-concourse', 50, 0);
  const circuitWest = trackPoint('meridian-circuit', -2, 189);
  const circuitEast = trackPoint('meridian-circuit', widthOf(circuit), 189);
  const yardsMouth = trackPoint('service-concourse', 98, context.districtOf('service-concourse').map.length);
  const yardsEast = trackPoint('service-yards', widthOf(context.districtOf('service-yards')), 85);
  const calderTurn = trackPoint('service-yards', widthOf(context.districtOf('service-yards')) + 36, 0);
  const saltRoadWest = trackPoint('calder-causeway', -2, 52);
  const saltRoadEast = trackPoint('calder-causeway', widthOf(context.districtOf('calder-causeway')), 52);
  const gatehouseNorth = trackPoint('calder-gatehouse', 3, -2);
  const gatehouseSouth = trackPoint('calder-gatehouse', 3, context.districtOf('calder-gatehouse').map.length);
  const intakeWest = trackPoint('intake-wing', -2, 65);
  const intakeEast = trackPoint('intake-wing', widthOf(context.districtOf('intake-wing')), 65);

  const meridianLine = drawTrackway(placements, districts, {
    id: 'meridian-line-trackway',
    name: 'Meridian Line',
    ambience: { darkness: 0.72, tint: '#0a0f12', fog: '#0c1216' },
    routes: [
      [lodgeNorth, trackCorner(lodgeNorth, pharmacyCorner), pharmacyCorner, trackCorner(pharmacyCorner, returnLeg), intakeWest],
      [intakeEast, trackCorner(gatehouseSouth, returnLeg), gatehouseSouth],
      [lodgeSouth, trackCorner(lodgeSouth, verdanceWest), verdanceWest],
      [verdanceEast, trackCorner(concourseJog, verdanceEast), trackCorner(concourseJog, circuitWest), circuitWest],
      [circuitEast, trackCorner(yardsMouth, circuitEast), yardsMouth],
      [yardsEast, trackCorner(calderTurn, yardsEast), trackCorner(calderTurn, saltRoadWest), saltRoadWest],
      [saltRoadEast, trackCorner(gatehouseNorth, saltRoadEast), gatehouseNorth],
    ],
  });

  return {
    id: 'main-floor',
    name: 'Site Meridian',
    kind: 'floor',
    depth: 0,
    capacity: 300,
    spawn: { districtId: 'meridian-atrium', position: anchorOf(context, 'meridian-atrium', 'transit') },
    districts: placements,
    connectors: [meridianLine],
  };
};

export const MAIN_FLOOR: LevelDefinition = MAIN_FLOOR_RECIPE(SHIPPED_CONTEXT);
