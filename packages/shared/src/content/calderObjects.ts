import type { GatheringSource } from '../crafting/gathering.ts';
import { CALDER_DEEPS_ANCHORS } from './districts/calderDeeps.ts';
import { CALDER_GATEHOUSE_ANCHORS } from './districts/calderGatehouse.ts';
import type { Condition } from '../rules/conditions.ts';
import type { WorldObjectDefinition, WorldObjectModel } from '../world/entities.ts';

export const CALDER_GATE_FLAG = 'calder.gate-open';
export const CALDER_NAVE_FLAG = 'calder.nave-open';

const node = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectModel,
  verb: string,
  gather: Omit<GatheringSource, 'skill'>,
  light: { readonly radius: number; readonly color: string; readonly intensity: number },
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  light,
  interactions: [{ verb, effects: [], gather: { skill: 'salvage', ...gather } }],
});

const gate = (id: string, name: string, examine: string, conditions: readonly Condition[], failureText: string, arrival: string): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model: 'bulkhead',
  blocksMovement: true,
  light: { radius: 2.4, color: '#ff9a6a', intensity: 0.6 },
  door: { conditions },
  interactions: [{ verb: 'Open', failureText, effects: [{ type: 'notify', text: arrival }] }],
});

const tally = (id: string, shift: string): WorldObjectDefinition => ({
  id,
  name: `Shift Tally ${shift}`,
  examine: `A tally board for Shift ${shift}, chalked in salt. Every line is a miner who went down. None of the lines are crossed out.`,
  model: 'warningSign',
  blocksMovement: true,
  light: { radius: 1.4, color: '#ffd27f', intensity: 0.35 },
  interactions: [
    {
      verb: 'Copy the tally',
      conditions: [{ type: 'questActive', questId: 'salt-of-the-earth', stepId: 'tallies' }],
      oncePerCharacter: true,
      failureText: 'The names are chalked in salt. You would need a reason to copy them down.',
      effects: [{ type: 'notify', text: `You copy down Shift ${shift}. Forty names, and every one of them still on shift.` }],
    },
  ],
});

export const CALDER_RESOURCE_NODES: readonly WorldObjectDefinition[] = [
  node('salt-seam', 'Salt Seam', 'A seam of pink rock salt running through the gallery wall. It is warm to the touch, and it pulses very slowly.', 'saltSeam', 'Mine', {
    level: 40,
    itemId: 'rock-salt',
    experience: 250,
    attemptTicks: 5,
    charges: 4,
    respawnTicks: 80,
    progressVerb: 'Mining',
  }, { radius: 1.8, color: '#ff9a6a', intensity: 0.45 }),
  node('geode-cluster', 'Halite Geode Cluster', 'A cluster of split geodes grown up through the cathedral floor. The cubes inside catch the light from no particular direction.', 'geodeCluster', 'Chip', {
    level: 45,
    itemId: 'halite-geode',
    experience: 285,
    attemptTicks: 5,
    charges: 4,
    respawnTicks: 85,
    progressVerb: 'Chipping',
  }, { radius: 1.8, color: '#ffd27f', intensity: 0.5 }),
];

export const CALDER_OBJECTS: readonly WorldObjectDefinition[] = [
  ...CALDER_RESOURCE_NODES,
  gate(
    'calder-gate',
    'Calder Gatehouse Door',
    'A salt-scaled blast door stencilled CALDER — GATEHOUSE. Someone on the other side has scratched a tally into the paint: forty years, give or take.',
    [{ type: 'hasFlag', flag: CALDER_GATE_FLAG }],
    'The gatehouse door does not move. A speaker grille beside it crackles, waiting for someone to use the intercom.',
    'The gatehouse door grinds open on forty years of salt.',
  ),
  gate(
    'nave-door',
    'Nave Door',
    'The great door of the salt cathedral, grown shut from the inside. Behind it, something is leading a hymn with no words.',
    [{ type: 'hasFlag', flag: CALDER_NAVE_FLAG }],
    'The nave door is grown shut. Warden Brandt holds the only way to open it.',
    'The salt across the nave door cracks and falls away. The hymn stops.',
  ),
  {
    id: 'calder-gate-intercom',
    name: 'Gatehouse Intercom',
    examine: 'A brass intercom beside the gatehouse door, scaled in salt. The CALL button has been pressed so often from this side that it is worn to the metal.',
    model: 'junctionBox',
    blocksMovement: true,
    light: { radius: 1.6, color: '#ff9a6a', intensity: 0.5 },
    interactions: [
      {
        verb: 'Call the gatehouse',
        conditions: [{ type: 'questActive', questId: 'postmarked', stepId: 'intercom' }],
        failureText: 'The intercom hisses. Whoever is listening on the other side does not answer strangers.',
        effects: [{ type: 'notify', text: 'A voice crackles back: "Meridian? You actually came. Stand clear of the door."' }],
      },
    ],
  },
  {
    id: 'calder-lift-down',
    name: 'Gallery Lift',
    examine: 'A salt-scaled man-cage down to the lowest gallery. The shift board beside it still reads SHIFT IN PROGRESS.',
    model: 'transitLift',
    blocksMovement: true,
    light: { radius: 3, color: '#ff9a6a', intensity: 0.6, flicker: true },
    interactions: [
      {
        verb: 'Descend',
        conditions: [{ type: 'questCompleted', questId: 'salt-of-the-earth' }],
        failureText: 'Warden Brandt has the lift on a key. She will not send anyone down until the lost shifts are accounted for.',
        effects: [{ type: 'teleport', districtId: 'calder-deeps', position: CALDER_DEEPS_ANCHORS.liftArrival }],
      },
    ],
  },
  {
    id: 'calder-lift-up',
    name: 'Gallery Lift',
    examine: 'The man-cage back up to the gatehouse. The bell rope is new. Somebody down here has been ringing it for a long time.',
    model: 'transitLift',
    blocksMovement: true,
    light: { radius: 3, color: '#ff9a6a', intensity: 0.6, flicker: true },
    interactions: [{ verb: 'Ascend', effects: [{ type: 'teleport', districtId: 'calder-gatehouse', position: CALDER_GATEHOUSE_ANCHORS.liftArrival }] }],
  },
  {
    id: 'deeps-time-clock',
    name: 'Shift Time Clock',
    examine: 'The punch clock for the lowest gallery. Its hands stopped forty years ago at the end of a shift that never ended.',
    model: 'timeClock',
    blocksMovement: true,
    light: { radius: 1.6, color: '#ffd27f', intensity: 0.45 },
    interactions: [
      {
        verb: 'Clock off the shift',
        conditions: [{ type: 'questActive', questId: 'clocking-off', stepId: 'clock' }],
        oncePerCharacter: true,
        failureText: "The clock is jammed on forty years ago. You would need the foreman's card to clock anyone off.",
        effects: [{ type: 'takeItem', itemId: 'foremans-card' }, { type: 'notify', text: 'The clock thunks. Somewhere above, a bell rings once, and the whole gallery breathes out.' }],
      },
    ],
  },
  tally('calder-tally-a', 'A'),
  tally('calder-tally-b', 'B'),
  tally('calder-tally-c', 'C'),
];
