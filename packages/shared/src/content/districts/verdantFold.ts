import type { DistrictDefinition } from '../../world/district.ts';

export const VERDANT_FOLD: DistrictDefinition = {
  id: 'verdant-fold',
  name: 'The Verdant Fold',
  subtitle: 'A Garden Folded Out of Hydroponics',
  tier: 2,
  ambience: { darkness: 0.55, tint: '#140a1e', fog: '#0c1a12' },
  map: [
    '     ##########     ',
    '   ###::::::::###   ',
    '  ##::::::::::::##  ',
    ' ##:::~~~::::::::## ',
    ' #:::~~~~~:::,,:::# ',
    '##::::~~~:::,,,,::##',
    '#:::::::::::,,,,:::#',
    '#::::::::::::,,::::#',
    '#::::::::::::::::::#',
    '##::::::::::::::::##',
    ' #::::::::::~~~:::# ',
    ' ##:::::::::~~~::## ',
    '  ##::::::::::::##  ',
    '   ###::::::::###   ',
    '     ##########     ',
  ],
  areas: [{ id: 'grove', name: 'The Folded Grove', rect: { x: 1, y: 1, width: 18, height: 13 } }],
  npcs: [],
  objects: [
    { instanceId: 'fold-exit', objectId: 'verdant-fold-exit', position: { x: 9, y: 13 }, facing: 'north' },
    { instanceId: 'fold-heartwood', objectId: 'fold-heartwood', position: { x: 13, y: 6 } },
    { instanceId: 'fold-planter-a', objectId: 'planter', position: { x: 4, y: 8 } },
    { instanceId: 'fold-planter-b', objectId: 'planter', position: { x: 15, y: 9 } },
  ],
  lights: [
    { position: { x: 13, y: 6 }, radius: 6, color: '#7cf29a', intensity: 0.8 },
    { position: { x: 6, y: 4 }, radius: 5, color: '#b57cff', intensity: 0.6 },
    { position: { x: 12, y: 11 }, radius: 5, color: '#9fd8ff', intensity: 0.5 },
  ],
};
