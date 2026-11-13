import { anchorOf, type LevelDefinition, type LevelRecipe } from '../../world/level.ts';
import { joinDistricts } from '../../world/levelPlan.ts';
import { drawTrackway, trackCorner, trackPoint } from '../../world/trackway.ts';
import { SHIPPED_CONTEXT } from './shippedContext.ts';

const DISTRICT_IDS = ['deepwatch', 'deep-concourse', 'furnace-causeway', 'cryovault', 'signal-array', 'drowned-archive', 'furnace'];

const widthOf = (district: { readonly map: readonly string[] }): number => district.map[0]?.length ?? 0;

export const THE_DEEP_RECIPE: LevelRecipe = (context) => {
  const districts = DISTRICT_IDS.map((id) => context.districtOf(id));
  const hollow = context.hollowOf('deep-concourse');
  const placements = joinDistricts(districts, 'deepwatch', [
    { districtId: 'deep-concourse', from: 'deepwatch', offset: { x: -hollow.x, y: -hollow.y } },
    { districtId: 'cryovault', exit: 'east', to: 'deep-concourse', toExit: 'cryovault' },
    { districtId: 'drowned-archive', exit: 'west', to: 'deep-concourse', toExit: 'archive' },
    { districtId: 'signal-array', exit: 'north', to: 'deep-concourse', toExit: 'array' },
    { districtId: 'furnace-causeway', exit: 'south', to: 'deep-concourse', toExit: 'causeway' },
    { districtId: 'furnace', exit: 'south', to: 'furnace-causeway', toExit: 'north' },
  ]);

  const cryovault = context.districtOf('cryovault');
  const archive = context.districtOf('drowned-archive');
  const furnace = context.districtOf('furnace');
  const array = context.districtOf('signal-array');
  const cryovaultNorth = trackPoint('cryovault', 96, -2);
  const cryovaultStub = trackPoint('cryovault', 96, -14);
  const cryovaultSouth = trackPoint('cryovault', 96, cryovault.map.length);
  const archiveNorth = trackPoint('drowned-archive', 1, -2);
  const archiveSouth = trackPoint('drowned-archive', 1, archive.map.length);
  const furnaceEast = trackPoint('furnace', widthOf(furnace), 62);
  const furnaceWest = trackPoint('furnace', -2, 62);
  const furnaceStub = trackPoint('furnace', -14, 62);
  const arrayWest = trackPoint('signal-array', -2, 1);
  const arrayEast = trackPoint('signal-array', widthOf(array), 1);

  const trackway = drawTrackway(placements, districts, {
    id: 'abyssal-trackway',
    name: 'Abyssal Circuit Trackway',
    ambience: { darkness: 0.8, tint: '#07090d', fog: '#0a0d14' },
    routes: [
      [furnaceEast, trackCorner(archiveNorth, furnaceEast), archiveNorth],
      [archiveSouth, trackCorner(archiveSouth, arrayEast), arrayEast],
      [arrayWest, trackCorner(cryovaultSouth, arrayWest), cryovaultSouth],
      [cryovaultNorth, cryovaultStub],
      [furnaceWest, furnaceStub],
    ],
  });

  return {
    id: 'the-deep',
    name: 'The Deep',
    kind: 'floor',
    depth: -2,
    capacity: 200,
    spawn: { districtId: 'deepwatch', position: anchorOf(context, 'deepwatch', 'liftArrival') },
    districts: placements,
    connectors: [trackway],
  };
};

export const THE_DEEP: LevelDefinition = THE_DEEP_RECIPE(SHIPPED_CONTEXT);
