import type { ObjectLight, WorldObjectDefinition } from '../world/entities.ts';

const CHUTE_LIGHT: ObjectLight = { radius: 3.5, color: '#c9a227', intensity: 0.8, flicker: true };
const SORT = { type: 'questActive', questId: 'dead-letter-office', stepId: 'sort' } as const;

const pigeonhole = (id: string, name: string, letter: string): WorldObjectDefinition => ({
  id,
  name,
  examine: 'A pigeonhole stuffed with letters that never arrived. The label on the front has been stamped P.M. so many times it has worn through.',
  model: 'filingCabinet',
  blocksMovement: true,
  countsAs: 'pigeonhole',
  light: { radius: 1.8, color: '#ffcf8a', intensity: 0.35 },
  interactions: [
    {
      verb: 'Sort',
      conditions: [SORT],
      failureText: 'The letters slide back into the order they were in. Someone is still in charge of this pigeonhole.',
      oncePerCharacter: true,
      alreadyUsedText: 'This pigeonhole is sorted. The letters lie flat and quiet.',
      effects: [
        { type: 'grantExperience', skill: 'research', amount: 700 },
        { type: 'notify', text: letter },
      ],
    },
  ],
});

export const OFFICE_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'return-chute',
    name: 'Return Chute',
    examine: 'A crease in the air behind the Array outbox, exactly the width of an envelope and, somehow, exactly the width of you.',
    model: 'anomaly',
    blocksMovement: true,
    light: CHUTE_LIGHT,
    interactions: [
      {
        verb: 'Climb through',
        conditions: [{ type: 'hasFlag', flag: 'returns.chute-open' }],
        failureText: 'The wall behind the outbox is cold, and there is a draught coming out of it that smells of old paper.',
        effects: [
          { type: 'notify', text: 'You fold yourself into the chute. It is a long way down, and every inch of it is lined with stamps.' },
          { type: 'teleport', districtId: 'dead-letter-office', position: { x: 3, y: 2 } },
        ],
      },
    ],
  },
  {
    id: 'office-return-chute',
    name: 'Chute to the Array',
    examine: 'The way back up. Every few seconds a letter falls out of it, addressed to someone who stopped waiting a long time ago.',
    model: 'anomaly',
    blocksMovement: true,
    light: CHUTE_LIGHT,
    interactions: [{ verb: 'Climb up', effects: [{ type: 'teleport', districtId: 'signal-array', position: { x: 41, y: 3 } }] }],
  },
  {
    id: 'franking-counter',
    name: 'Franking Counter',
    examine: 'A brass counter with a bell, a ledger and a rubber stamp for every Site. The Meridian stamp is worn smooth.',
    model: 'officeDesk',
    blocksMovement: true,
    interactions: [],
  },
  {
    id: 'letter-rack',
    name: 'Letter Rack',
    examine: 'Racks of envelopes sorted by Site, then by year, then by how much they would have mattered.',
    model: 'storageRack',
    blocksMovement: true,
    interactions: [],
  },
  {
    id: 'pigeonhole',
    name: 'Pigeonhole',
    examine: 'A pigeonhole of dead letters.',
    model: 'filingCabinet',
    blocksMovement: true,
    interactions: [],
  },
  pigeonhole(
    'pigeonhole-thale',
    'Pigeonhole: Council',
    "A letter from the Directorate Council to Meridian, thirty years old: WE ARE SENDING HELP. The reply, in the Office's hand: NO NEED. ALL QUIET HERE.",
  ),
  pigeonhole(
    'pigeonhole-achterberg',
    'Pigeonhole: Signals',
    'Twenty years of letters from Achterberg to the other Sites. Every one opens the same way: Is anyone actually reading these?',
  ),
  pigeonhole(
    'pigeonhole-halvorsen',
    'Pigeonhole: Expedition',
    'Six letters from Halvorsen\'s team, written on the far side and addressed home. Five are signed. The sixth is signed six times, in six hands.',
  ),
  pigeonhole(
    'pigeonhole-sel',
    'Pigeonhole: Records',
    "A letter from Archivist Wen to her apprentice, the night the stacks flooded: Sel, keep the archive tidy. I'll be back for tea. It was never delivered.",
  ),
  {
    id: 'franking-engine',
    name: 'Franking Engine',
    examine: 'A press the size of a tram car, stamping envelopes faster than you can read them. Every frank says SIGNAL ARRAY. Every signature is yours.',
    model: 'furnaceCore',
    blocksMovement: true,
    light: { radius: 4, color: '#ff8a4a', intensity: 0.75, flicker: true },
    interactions: [
      {
        verb: 'Stop',
        conditions: [{ type: 'questActive', questId: 'dead-letter-office', stepId: 'engine' }],
        failureText: 'The press slams down a hand-span from your fingers. Something is still feeding it signatures.',
        oncePerCharacter: true,
        alreadyUsedText: 'The franking engine is cold. The last envelope is still under the stamp, unfranked.',
        effects: [
          { type: 'grantExperience', skill: 'engineering', amount: 2500 },
          { type: 'notify', text: 'You jam the platen. The engine shudders, stamps once more on nothing, and stops. For the first time in forty years, the Office is silent.' },
        ],
      },
    ],
  },
];
