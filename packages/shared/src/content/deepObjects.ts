import type { GatheringSource } from '../crafting/gathering.ts';
import { ATRIUM_ANCHORS } from './districts/meridianAtrium.ts';
import type { DistrictId } from '../ids.ts';
import type { Condition } from '../rules/conditions.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { ObjectLight, WorldObjectDefinition, WorldObjectModel } from '../world/entities.ts';

const passage = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectModel,
  verb: string,
  destination: { readonly districtId: DistrictId; readonly position: TilePoint },
  light: ObjectLight,
  gate?: { readonly conditions: readonly Condition[]; readonly failureText: string; readonly arrival?: string },
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  light,
  interactions: [
    {
      verb,
      ...(gate ? { conditions: gate.conditions, failureText: gate.failureText } : {}),
      effects: [
        ...(gate?.arrival ? [{ type: 'notify' as const, text: gate.arrival }] : []),
        { type: 'teleport', districtId: destination.districtId, position: destination.position },
      ],
    },
  ],
});

const door = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectModel,
  verb: string,
  light: ObjectLight,
  gate: { readonly conditions: readonly Condition[]; readonly failureText: string; readonly arrival?: string },
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  light,
  door: { conditions: gate.conditions },
  interactions: [{ verb, failureText: gate.failureText, effects: gate.arrival ? [{ type: 'notify', text: gate.arrival }] : [] }],
});

const decor = (id: string, name: string, examine: string, model: WorldObjectModel, light?: ObjectLight, scale?: number): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  ...(light ? { light } : {}),
  ...(scale ? { modelScale: scale } : {}),
  interactions: [],
});

const node = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectModel,
  verb: string,
  gather: Omit<GatheringSource, 'skill'>,
  light?: ObjectLight,
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  ...(light ? { light } : {}),
  interactions: [{ verb, effects: [], gather: { skill: 'salvage', ...gather } }],
});

const TRAM_LIGHT: ObjectLight = { radius: 3, color: '#4fd8ff', intensity: 0.7 };
const LIFT_LIGHT: ObjectLight = { radius: 3, color: '#ffcf4d', intensity: 0.6 };
const SEAL_LIGHT: ObjectLight = { radius: 3, color: '#b57cff', intensity: 0.7, flicker: true };

export const DEEP_PASSAGES: readonly WorldObjectDefinition[] = [
  passage(
    'atrium-deep-line',
    'Deep Line Lift',
    'A freight lift set deep into the wall, with no floor indicator, only a down arrow. Somebody has written DEEPWATCH on the doors in grease pencil.',
    'wallLift',
    'Ride',
    { districtId: 'deepwatch', position: { x: 3, y: 10 } },
    TRAM_LIGHT,
    { conditions: [{ type: 'hasFlag', flag: 'clearance.deepwatch' }], failureText: 'The lift doors stay shut. A placard reads: COUNCIL AUTHORISATION ONLY.' },
  ),
  passage('deepwatch-deep-line', 'Deep Line Lift', 'The express lift back up to the Meridian Atrium. It smells of coffee, which is the most normal thing at Deepwatch.', 'wallLift', 'Ride', { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.deepLineArrival }, TRAM_LIGHT),
  passage('deepwatch-threshold-door', 'Threshold Passage', 'A short pressure corridor bored through to the Sector 3 threshold. The far end is always colder.', 'bulkhead', 'Enter', { districtId: 'sector-three', position: { x: 16, y: 6 } }, SEAL_LIGHT),
  passage('sector-three-deepwatch-door', 'Deepwatch Passage', 'A freshly bored pressure corridor, still smelling of cut stone. Deepwatch Station is on the other side.', 'bulkhead', 'Enter', { districtId: 'deepwatch', position: { x: 17, y: 3 } }, LIFT_LIGHT),
  door(
    'cryovault-door',
    'Cryovault Pressure Door',
    'A frost-rimed pressure door into Cold Storage. The frost grows out of the seams, not onto them.',
    'bulkhead',
    'Enter',
    { radius: 3, color: '#7ae0ff', intensity: 0.6 },
    { conditions: [{ type: 'hasFlag', flag: 'clearance.cryovault' }], failureText: 'The lift panel reads: COLD STORAGE SEALED BY ORDER OF THE COUNCIL.' },
  ),
  door(
    'signal-array-door',
    'Array Pressure Door',
    'A cable-wrapped pressure door into the Signal Array, the deck that writes letters to the other eight Sites.',
    'bulkhead',
    'Enter',
    { radius: 3, color: '#ffb87a', intensity: 0.6 },
    { conditions: [{ type: 'hasFlag', flag: 'clearance.signal-array' }], failureText: 'The lift panel reads: ARRAY OFFLINE. CONTACT RECORDS DIVISION.' },
  ),
  door(
    'archive-door',
    'Flood Stair Door',
    'A pressure door down to the drowned Records stacks. Water beads on the inside of the glass.',
    'bulkhead',
    'Enter',
    { radius: 3, color: '#b57cff', intensity: 0.6 },
    { conditions: [{ type: 'hasFlag', flag: 'clearance.drowned-archive' }], failureText: 'The lift panel reads: RECORDS ACCESS BY ARCHIVIST APPROVAL ONLY.' },
  ),
  door(
    'furnace-door',
    'Reactor Blast Door',
    'A heavy blast door to the Meridian reactor. The metal glows a dull red near the floor.',
    'bulkhead',
    'Enter',
    { radius: 3, color: '#ff7a2a', intensity: 0.7, flicker: true },
    { conditions: [{ type: 'hasFlag', flag: 'clearance.furnace' }], failureText: 'The lift panel reads: REACTOR ACCESS REQUIRES DIRECTOR AUTHORISATION.' },
  ),
  passage('far-side-return', 'The Way Back', 'The back of the Knock. From this side it is a perfectly ordinary door, which is the most frightening thing about it.', 'knockDoor', 'Go back', { districtId: 'sector-three', position: { x: 10, y: 9 } }, SEAL_LIGHT),
  door(
    'sealed-reading-door',
    'Sealed Reading Room',
    'A pressure door to the room where the original Knock file was kept. Black water has pooled against the seal.',
    'bulkhead',
    'Open',
    SEAL_LIGHT,
    {
      conditions: [{ type: 'hasFlag', flag: 'archive.drained' }],
      failureText: 'The seal will not open against the weight of the flood behind it. The sluices need draining first.',
      arrival: 'The door swings inward on a room that has been holding its breath for forty years.',
    },
  ),
  door(
    'reactor-door',
    'Reactor Heart Door',
    'A blast door into the reactor heart. The pressure gauge beside it is buried in the red.',
    'bulkhead',
    'Open',
    { radius: 3, color: '#ff4d2a', intensity: 0.8, flicker: true },
    {
      conditions: [{ type: 'hasFlag', flag: 'furnace.vented' }],
      failureText: 'The door is locked against overpressure. The foundry valves need venting first.',
      arrival: 'The door grinds aside. The heat comes through first, then the sound of a shovel.',
    },
  ),
];

export const DEEP_QUEST_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'council-terminal',
    name: 'Council Uplink',
    examine: 'A secure terminal wired straight to the Directorate Council chamber. The cursor blinks with what feels like disapproval.',
    model: 'terminal',
    blocksMovement: true,
    light: { radius: 2, color: '#4fd8ff', intensity: 0.5 },
    interactions: [
      {
        verb: 'Read',
        effects: [{ type: 'notify', text: 'COUNCIL DIRECTIVE 1180-A: The Knock is to be closed. Not contained. Closed. All Deepwatch resources are allocated to this end.' }],
      },
    ],
  },
  {
    id: 'cryo-pod',
    name: 'Cryo Pod',
    examine: 'A cold-sleep pod holding a Dormant anomaly. The frost on the glass is spreading from the inside.',
    model: 'cryoPod',
    blocksMovement: true,
    light: { radius: 1.8, color: '#7ae0ff', intensity: 0.5, flicker: true },
    interactions: [
      {
        verb: 'Stabilise',
        conditions: [{ type: 'questActive', questId: 'cold-storage', stepId: 'stabilise' }],
        failureText: 'The pod is holding, barely. Nothing for you to do with it right now.',
        oncePerCharacter: true,
        alreadyUsedText: 'This pod is holding steady at minus one hundred and ninety.',
        effects: [
          { type: 'grantExperience', skill: 'containment', amount: 260 },
          { type: 'grantExperience', skill: 'engineering', amount: 120 },
          { type: 'notify', text: 'You reseat the coolant line and purge the frost. Inside, something settles back into sleep.' },
        ],
      },
    ],
  },
  {
    id: 'curator-ledger',
    name: "The Curator's Ledger",
    examine: 'A frost-locked desk terminal with the Cold Storage manifest still open. Beside it sits a stasis core in a cradle of ice.',
    model: 'terminal',
    blocksMovement: true,
    light: { radius: 2, color: '#c8f0ff', intensity: 0.6 },
    interactions: [
      {
        verb: 'Take the core',
        conditions: [
          { type: 'questActive', questId: 'cold-storage', stepId: 'recover-core' },
          { type: 'lacksItem', itemId: 'stasis-core' },
        ],
        failureText: 'The manifest lists four hundred and twelve Dormant anomalies. The last line, in fresh ink, lists you.',
        effects: [
          { type: 'giveItem', itemId: 'stasis-core' },
          { type: 'notify', text: 'You lift the stasis core out of its cradle. It burns with cold through both gloves.' },
        ],
      },
    ],
  },
  {
    id: 'relay-console',
    name: 'Relay Console',
    examine: 'A transmission console for one of the eight outbound relays. The tuning drifts towards a frequency that should not exist.',
    model: 'terminal',
    blocksMovement: true,
    light: { radius: 2, color: '#ffb87a', intensity: 0.5, flicker: true },
    interactions: [
      {
        verb: 'Recalibrate',
        conditions: [{ type: 'questActive', questId: 'dead-air', stepId: 'recalibrate' }],
        failureText: 'The console is broadcasting a polite carrier tone into nowhere.',
        oncePerCharacter: true,
        alreadyUsedText: 'This relay is locked on to its proper Site again.',
        effects: [
          { type: 'grantExperience', skill: 'engineering', amount: 320 },
          { type: 'grantExperience', skill: 'research', amount: 160 },
          { type: 'notify', text: 'You drag the relay back to its proper frequency. For a second, before it locks, you hear forty voices say "received".' },
        ],
      },
    ],
  },
  {
    id: 'outbox-terminal',
    name: 'Array Outbox',
    examine: 'The terminal that sorts the Array\'s post. Forty years of letters to the other eight Sites, and every one marked DELIVERED. A return chute in the wall is stamped DEAD LETTERS, but nothing has ever come back up it.',
    model: 'terminal',
    blocksMovement: true,
    light: { radius: 2, color: '#8afff0', intensity: 0.6 },
    interactions: [
      {
        verb: 'Read the replies',
        conditions: [
          { type: 'questActive', questId: 'dead-air', stepId: 'outbox' },
          { type: 'lacksItem', itemId: 'signed-letter' },
        ],
        failureText: 'Every outbound letter is marked DELIVERED. Every reply is marked LOCAL.',
        effects: [
          { type: 'giveItem', itemId: 'signed-letter' },
          { type: 'grantExperience', skill: 'research', amount: 400 },
          { type: 'notify', text: 'The replies were never routed out of the Site. They came up from below. The newest one is addressed to you.' },
        ],
      },
    ],
  },
  {
    id: 'array-core',
    name: 'Array Core',
    examine: 'The heart of the Signal Array: a column of recorders that keeps a copy of everything the Array has ever heard.',
    model: 'serverRack',
    blocksMovement: true,
    modelScale: 1.4,
    light: { radius: 3, color: '#8afff0', intensity: 0.8, flicker: true },
    interactions: [
      {
        verb: 'Pull the recording',
        conditions: [
          { type: 'questActive', questId: 'dead-air', stepId: 'recording' },
          { type: 'lacksItem', itemId: 'choir-recording' },
        ],
        failureText: 'The recorders hiss. Somewhere in the hiss, many people are waiting for a callback.',
        effects: [
          { type: 'giveItem', itemId: 'choir-recording' },
          { type: 'notify', text: 'You pull the Choir\'s last recording. The Array falls silent for the first time in forty years.' },
        ],
      },
    ],
  },
  {
    id: 'patch-point',
    name: 'Comms Patch Point',
    examine: 'A patch bay that once linked the Array to the Atrium intercom. Every jack has been pulled and plugged back into the wrong hole.',
    model: 'junctionBox',
    blocksMovement: true,
    light: { radius: 1.6, color: '#ffb87a', intensity: 0.4, flicker: true },
    interactions: [
      {
        verb: 'Repatch',
        conditions: [{ type: 'questActive', questId: 'crossed-wires', stepId: 'repatch' }],
        failureText: 'The patch bay is a tangle. Someone will want it sorted one day.',
        oncePerCharacter: true,
        alreadyUsedText: 'This patch bay is wired correctly now. It still hums.',
        effects: [
          { type: 'grantExperience', skill: 'engineering', amount: 220 },
          { type: 'notify', text: 'You repatch the bay by colour and by guesswork. A distant intercom crackles: "...Atrium here, who is this?"' },
        ],
      },
    ],
  },
  {
    id: 'sluice-valve',
    name: 'Sluice Valve',
    examine: 'A brass flood-control wheel, swollen shut. A keyhole in the hub reads RECORDS — FLOOD CONTROL.',
    model: 'valveWheel',
    blocksMovement: true,
    light: { radius: 1.6, color: '#c9a227', intensity: 0.4 },
    interactions: [
      {
        verb: 'Open the sluice',
        conditions: [
          { type: 'questActive', questId: 'original-contract', stepId: 'drain' },
          { type: 'hasItem', itemId: 'sluice-key' },
        ],
        failureText: 'The wheel will not turn. It needs the flood control key in the hub, and a reason.',
        oncePerCharacter: true,
        alreadyUsedText: 'This sluice is open. Black water gurgles away into the dark.',
        effects: [
          { type: 'grantExperience', skill: 'engineering', amount: 380 },
          { type: 'notify', text: 'You turn the key and haul on the wheel. Somewhere below, a drain opens and the stacks begin, very slowly, to empty.' },
        ],
      },
    ],
  },
  {
    id: 'charter-lectern',
    name: 'Charter Lectern',
    examine: 'A reading lectern bolted to the floor. A document lies on it under glass, perfectly dry in a drowned room.',
    model: 'kiosk',
    blocksMovement: true,
    light: { radius: 2.5, color: '#b57cff', intensity: 0.7 },
    interactions: [
      {
        verb: 'Take the charter',
        conditions: [
          { type: 'questActive', questId: 'original-contract', stepId: 'charter' },
          { type: 'lacksItem', itemId: 'founding-charter' },
        ],
        failureText: 'The glass is locked. The document beneath it is signed in a shaking hand.',
        effects: [
          { type: 'giveItem', itemId: 'founding-charter' },
          { type: 'grantExperience', skill: 'research', amount: 600 },
          { type: 'notify', text: 'You lift the Founding Charter from the lectern. Clause one: "It knocked. We answered: not yet. It agreed to wait for whoever stands before it twice."' },
        ],
      },
    ],
  },
  {
    id: 'pressure-valve',
    name: 'Pressure Valve',
    examine: 'A red-painted relief valve on a foundry header. The gauge needle has been bent against the pin for years.',
    model: 'valveWheel',
    blocksMovement: true,
    light: { radius: 1.6, color: '#ff4d2a', intensity: 0.5, flicker: true },
    interactions: [
      {
        verb: 'Vent',
        conditions: [{ type: 'questActive', questId: 'stoking-the-fire', stepId: 'vent' }],
        failureText: 'The valve is scalding. Nobody has asked you to touch it, and nobody should.',
        oncePerCharacter: true,
        alreadyUsedText: 'This header is venting cleanly now.',
        effects: [
          { type: 'grantExperience', skill: 'engineering', amount: 460 },
          { type: 'grantExperience', skill: 'fortitude', amount: 200 },
          { type: 'notify', text: 'You wrench the valve open. A column of steam roars up and the whole foundry exhales.' },
        ],
      },
    ],
  },
  {
    id: 'reactor-console',
    name: 'Reactor Console',
    examine: 'The reactor\'s manual control console. A logbook is chained to it, its pages black with forty years of figures.',
    model: 'terminal',
    blocksMovement: true,
    light: { radius: 2, color: '#ff8a4a', intensity: 0.6 },
    interactions: [
      {
        verb: 'Read the log',
        conditions: [
          { type: 'questActive', questId: 'stoking-the-fire', stepId: 'console' },
          { type: 'lacksItem', itemId: 'reactor-log' },
        ],
        failureText: 'Every page ends with the same line: FED THE DOOR.',
        effects: [
          { type: 'giveItem', itemId: 'reactor-log' },
          { type: 'grantExperience', skill: 'research', amount: 800 },
          { type: 'notify', text: 'The figures do not lie. Every joule the Directorate fed the "seal" went through the Knock. The reactor has been keeping the door warm.' },
        ],
      },
    ],
  },
  {
    id: 'far-lantern',
    name: 'Unlit Lantern',
    examine: 'A brass lantern exactly like the Patient Lantern in the Intake Wing. This one is cold and dark.',
    model: 'lantern',
    blocksMovement: true,
    light: { radius: 2, color: '#ffb347', intensity: 0.35, flicker: true },
    interactions: [
      {
        verb: 'Light',
        conditions: [{ type: 'questActive', questId: 'the-answer', stepId: 'lanterns' }],
        failureText: 'The wick is dry. It is waiting for someone who knows what an hour is worth.',
        oncePerCharacter: true,
        alreadyUsedText: 'This lantern is burning, and showing this place as it will be in an hour.',
        effects: [
          { type: 'grantExperience', skill: 'containment', amount: 900 },
          { type: 'notify', text: 'The lantern catches. In its light the far side looks, for a moment, like it will be quiet in an hour.' },
        ],
      },
    ],
  },
  decor('cold-pod', 'Sealed Cryo Pod', 'A cold-sleep pod, sealed and holding. The label reads DORMANT — DO NOT WAKE.', 'cryoPod', { radius: 1.4, color: '#7ae0ff', intensity: 0.35 }),
  decor('relay-dish', 'Relay Dish', 'A tracking dish pointed at the floor. The Array stopped pointing its dishes at the sky a long time ago.', 'relayDish', { radius: 2, color: '#ffb87a', intensity: 0.4, flicker: true }),
  decor('archive-shelf', 'Drowned Shelf', 'A shelf of waterlogged files. The labels have run, but every one still ends in 1180.', 'archiveShelf'),
  decor('furnace-core', 'Meridian Reactor', 'The reactor heart: a column of white-hot metal that has never once been allowed to cool.', 'furnaceCore', { radius: 6, color: '#ff7a2a', intensity: 1.1, flicker: true }, 1.4),
  decor('mirror-pane', 'Mirror Pane', 'A freestanding mirror. Your reflection is facing the wrong way, and it is not sorry about it.', 'mirrorPane', { radius: 1.8, color: '#b57cff', intensity: 0.45 }),
  decor('front-door', 'The Front Door', 'The Knock, seen from the side it was built to face. There is a doormat. It says WELCOME.', 'knockDoor', { radius: 5, color: '#b57cff', intensity: 1, flicker: true }),
];

export const DEEP_RESOURCE_NODES: readonly WorldObjectDefinition[] = [
  node('rime-crystal', 'Rime Crystal Cluster', 'A cluster of rime crystal grown on a split cryo line. Chip from the base.', 'rimeCrystal', 'Chip', {
    level: 12,
    itemId: 'frost-crystal',
    experience: 70,
    attemptTicks: 5,
    charges: 5,
    respawnTicks: 60,
    progressVerb: 'Chipping',
  }, { radius: 1.8, color: '#7ae0ff', intensity: 0.5 }),
  node('signal-cable', 'Trunk Cable', 'A severed Array trunk line, still warm with signal. The copper inside is oxygen-free and very valuable.', 'severedConduit', 'Strip', {
    level: 16,
    itemId: 'signal-copper',
    experience: 95,
    attemptTicks: 5,
    charges: 5,
    respawnTicks: 65,
    progressVerb: 'Stripping',
  }, { radius: 1.6, color: '#ffb87a', intensity: 0.4, flicker: true }),
  node('vellum-stack', 'Vellum Stack', 'A slumped stack of archival vellum. Dry the sheets that are still legible and leave the rest to the eels.', 'archiveShelf', 'Salvage', {
    level: 20,
    itemId: 'archival-vellum',
    experience: 125,
    attemptTicks: 5,
    charges: 4,
    respawnTicks: 70,
    progressVerb: 'Salvaging',
  }),
  node('ink-pool', 'Ink Pool', 'A pool of black archive ink. It ripples towards you when you lean over it.', 'inkPool', 'Draw', {
    level: 21,
    itemId: 'black-ink',
    experience: 135,
    attemptTicks: 5,
    charges: 4,
    respawnTicks: 70,
    progressVerb: 'Drawing',
  }, { radius: 1.6, color: '#7a5aff', intensity: 0.35 }),
  node('ember-seam', 'Ember Seam', 'A seam of ember ore glowing through the gallery wall. Mine it with your sleeves down.', 'emberSeam', 'Mine', {
    level: 25,
    itemId: 'ember-ore',
    experience: 170,
    attemptTicks: 6,
    charges: 4,
    respawnTicks: 80,
    progressVerb: 'Mining',
  }, { radius: 2, color: '#ff7a2a', intensity: 0.6, flicker: true }),
  node('mirror-shard', 'Mirror Outcrop', 'A jag of mirror glass growing up through the floor. In each facet, a slightly different you is mining it.', 'mirrorShard', 'Chip', {
    level: 30,
    itemId: 'mirror-glass',
    experience: 230,
    attemptTicks: 6,
    charges: 4,
    respawnTicks: 90,
    progressVerb: 'Chipping',
  }, { radius: 2, color: '#b57cff', intensity: 0.5 }),
];

export const DEEP_OBJECTS: readonly WorldObjectDefinition[] = [...DEEP_PASSAGES, ...DEEP_QUEST_OBJECTS, ...DEEP_RESOURCE_NODES];
