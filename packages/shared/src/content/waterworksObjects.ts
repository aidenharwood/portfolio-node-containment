import type { WorldObjectDefinition } from '../world/entities.ts';

const headerValve = (suffix: string, name: string, examine: string): WorldObjectDefinition => ({
  id: `waterworks-valve-${suffix}`,
  name,
  examine,
  model: 'valveWheel',
  blocksMovement: true,
  light: { radius: 1.4, color: '#4fd8ff', intensity: 0.35 },
  interactions: [
    {
      verb: 'Open',
      conditions: [{ type: 'questActive', questId: 'pressure-drop', stepId: 'valves' }],
      failureText: 'The wheel is chained to its neighbour with a tag that reads ASK NGATA.',
      oncePerCharacter: true,
      alreadyUsedText: 'This valve is open. The pipe behind it thrums.',
      effects: [
        { type: 'grantExperience', skill: 'engineering', amount: 90 },
        { type: 'notify', text: 'The wheel fights you for half a turn, then spins free. Somewhere deeper in the gallery, a pipe clears its throat.' },
      ],
    },
  ],
});

const sampleTap = (suffix: string, name: string, examine: string, finding: string): WorldObjectDefinition => ({
  id: `waterworks-tap-${suffix}`,
  name,
  examine,
  model: 'junctionBox',
  blocksMovement: true,
  light: { radius: 1.2, color: '#6ae0c8', intensity: 0.35 },
  interactions: [
    {
      verb: 'Draw a sample',
      conditions: [{ type: 'questActive', questId: 'bad-water', stepId: 'samples' }],
      failureText: 'A sample tap. Nobody has asked you to drink from it, which is a mercy.',
      oncePerCharacter: true,
      alreadyUsedText: 'You have already sampled this bed.',
      effects: [
        { type: 'grantExperience', skill: 'biochemistry', amount: 80 },
        { type: 'notify', text: finding },
      ],
    },
  ],
});

export const WATERWORKS_OBJECTS: readonly WorldObjectDefinition[] = [
  headerValve('a', 'Header Valve A', 'The first of three header valves feeding the Atrium mains. Someone has painted 1 on it, then 3, then 1 again.'),
  headerValve('b', 'Header Valve B', 'A brass header valve, green with age. The gauge beside it reads LOW in a confident hand.'),
  headerValve('c', 'Header Valve C', 'The last header valve. A skimmer has been grazing on the lagging around it.'),
  sampleTap('a', 'North Bed Sample Tap', 'A sample tap on the first filtration bed.', 'The sample runs cloudy, then pink. It smells of pennies.'),
  sampleTap('b', 'Middle Bed Sample Tap', 'A sample tap on the middle filtration bed.', 'The vial warms in your hand. Something small taps against the glass from inside, then stops.'),
  sampleTap('c', 'East Bed Sample Tap', 'A sample tap on the last filtration bed, nearest the outfall.', 'This one comes out nearly black, and it is warm. The bed it came from is downstream of the tanks.'),
  {
    id: 'waterworks-assay',
    name: 'Assay Bench',
    examine: 'A water quality bench with a centrifuge, three reagent racks and a laminated sheet titled WHAT THE COLOURS MEAN.',
    model: 'waterworksAssay',
    blocksMovement: true,
    light: { radius: 2, color: '#7cf29a', intensity: 0.55 },
    interactions: [
      {
        verb: 'Run the assay',
        conditions: [{ type: 'questActive', questId: 'bad-water', stepId: 'assay' }],
        failureText: 'The bench is idle. The centrifuge has a sticker on it that says DO NOT, and nothing else.',
        oncePerCharacter: true,
        alreadyUsedText: 'The results are still pinned above the bench. Nobody has wanted to take them down.',
        effects: [
          { type: 'grantExperience', skill: 'research', amount: 260 },
          { type: 'grantExperience', skill: 'biochemistry', amount: 200 },
          { type: 'notify', text: 'Iron, copper, and a protein the bench has no name for. The concentration climbs bed by bed, towards the outfall.' },
        ],
      },
    ],
  },
  {
    id: 'waterworks-outfall-pump',
    name: 'Outfall Pump',
    examine: 'The pump that pushes clean water back up to the Site. Its intake grille is packed with something soft.',
    model: 'pumpHousing',
    blocksMovement: true,
    light: { radius: 2.2, color: '#4fd8ff', intensity: 0.5 },
    interactions: [
      {
        verb: 'Restart',
        conditions: [{ type: 'questActive', questId: 'the-outfall', stepId: 'restart' }],
        failureText: 'The pump is choked. Nothing will move through it while whatever lives in the outfall is still feeding.',
        oncePerCharacter: true,
        alreadyUsedText: 'The outfall pump is running. Clean water goes up; the rest goes down.',
        effects: [
          { type: 'grantExperience', skill: 'engineering', amount: 420 },
          { type: 'notify', text: 'You rip the last of the membrane out of the grille and pull the lever. The pump coughs, catches, and the water in the outfall begins, for the first time in years, to move.' },
        ],
      },
    ],
  },
];
