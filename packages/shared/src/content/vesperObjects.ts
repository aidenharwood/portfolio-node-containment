import type { GatheringSource } from '../crafting/gathering.ts';
import type { Condition } from '../rules/conditions.ts';
import type { WorldObjectDefinition, WorldObjectModel } from '../world/entities.ts';

export const VESPER_GATE_FLAG = 'vesper.gate-open';
export const VESPER_SURGERY_FLAG = 'vesper.surgery-open';

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
  light: { radius: 2.4, color: '#6ad8b8', intensity: 0.6 },
  door: { conditions },
  interactions: [{ verb: 'Open', failureText, effects: [{ type: 'notify', text: arrival }] }],
});

const chart = (id: string, bed: string): WorldObjectDefinition => ({
  id,
  name: `Patient Chart, Bed ${bed}`,
  examine: `The chart clipped to the foot of Bed ${bed}. The latest entry is in fresh ink, and it is dated forty years ago.`,
  model: 'warningSign',
  blocksMovement: true,
  light: { radius: 1.3, color: '#6ad8b8', intensity: 0.35 },
  interactions: [
    {
      verb: 'Read the chart',
      conditions: [{ type: 'questActive', questId: 'night-rounds', stepId: 'charts' }],
      oncePerCharacter: true,
      failureText: 'Reading other people\'s charts is not done. Matron would have something to say.',
      effects: [{ type: 'notify', text: `Bed ${bed}: "Restless. Asked for Meridian again. Sedated." The same note, every night, for forty years.` }],
    },
  ],
});

export const VESPER_RESOURCE_NODES: readonly WorldObjectDefinition[] = [
  node('herb-cabinet', 'Physic Cabinet', 'A tall apothecary cabinet of dried physic herbs. Every drawer is labelled, and every label says the same patient name.', 'herbCabinet', 'Gather', {
    level: 50,
    itemId: 'physic-herb',
    experience: 320,
    attemptTicks: 5,
    charges: 4,
    respawnTicks: 85,
    progressVerb: 'Gathering',
  }, { radius: 1.6, color: '#9ab87a', intensity: 0.4 }),
  node('tincture-still', 'Tincture Still', 'A copper still dripping dark tincture into a jar. Nobody has fed it in forty years. It refills anyway.', 'tinctureStill', 'Draw', {
    level: 55,
    itemId: 'vesper-tincture',
    experience: 360,
    attemptTicks: 5,
    charges: 4,
    respawnTicks: 90,
    progressVerb: 'Drawing',
  }, { radius: 1.8, color: '#c88ad8', intensity: 0.5 }),
];

export const VESPER_OBJECTS: readonly WorldObjectDefinition[] = [
  ...VESPER_RESOURCE_NODES,
  gate(
    'vesper-gate',
    "Porter's Lodge Door",
    "A cream-painted blast door marked VESPER — PORTER'S LODGE — VISITING HOURS ONLY. The visiting hours have been scratched out.",
    [{ type: 'hasFlag', flag: VESPER_GATE_FLAG }],
    'The lodge door is locked. Visitors are to ring the bell and wait to be admitted.',
    'The lodge door unlocks with a polite click. It smells of carbolic inside.',
  ),
  gate(
    'surgery-door',
    'Surgery Door',
    'Double doors to the operating theatre, marked SURGERY IN PROGRESS. The light above them has been lit for forty years.',
    [{ type: 'hasFlag', flag: VESPER_SURGERY_FLAG }],
    'The surgery is locked from the inside. Matron Ashby keeps the only other key.',
    'The surgery doors swing open. The Chief Physician does not look up.',
  ),
  {
    id: 'vesper-lodge-bell',
    name: 'Visitors\' Bell',
    examine: 'A brass bell-push beside the lodge door, polished bright by forty years of patients ringing to be let out.',
    model: 'junctionBox',
    blocksMovement: true,
    light: { radius: 1.6, color: '#6ad8b8', intensity: 0.5 },
    interactions: [
      {
        verb: 'Ring for admission',
        conditions: [{ type: 'questActive', questId: 'referral', stepId: 'bell' }],
        failureText: 'The bell rings somewhere deep in the lodge. Nobody comes. Visitors are expected to have an appointment.',
        effects: [{ type: 'notify', text: 'A brisk voice answers: "Meridian? At last. Wipe your feet."' }],
      },
    ],
  },
  chart('vesper-chart-a', '4'),
  chart('vesper-chart-b', '11'),
  chart('vesper-chart-c', '19'),
  {
    id: 'vesper-lift-down',
    name: 'Cold Ward Lift',
    examine: 'A bed lift down to the cold ward. A card on the gate reads PATIENTS MUST BE ACCOMPANIED.',
    model: 'transitLift',
    blocksMovement: true,
    light: { radius: 3, color: '#6ad8b8', intensity: 0.6, flicker: true },
    interactions: [
      {
        verb: 'Descend',
        conditions: [{ type: 'questCompleted', questId: 'night-rounds' }],
        failureText: 'Matron Ashby has locked the cold ward lift. Nobody goes down until the night rounds are done.',
        effects: [{ type: 'teleport', districtId: 'vesper-cellars', position: { x: 35, y: 4 } }],
      },
    ],
  },
  {
    id: 'vesper-lift-up',
    name: 'Cold Ward Lift',
    examine: 'The bed lift back up to the lodge. The call button is warm, as though someone pressed it recently.',
    model: 'transitLift',
    blocksMovement: true,
    light: { radius: 3, color: '#6ad8b8', intensity: 0.6, flicker: true },
    interactions: [{ verb: 'Ascend', effects: [{ type: 'teleport', districtId: 'vesper-lodge', position: { x: 3, y: 5 } }] }],
  },
  {
    id: 'cellar-ledger',
    name: 'Cold Ward Ledger',
    examine: 'The admissions ledger for the cold ward. Every patient is listed as ADMITTED. Not one has been discharged.',
    model: 'kiosk',
    blocksMovement: true,
    light: { radius: 1.6, color: '#6ad8b8', intensity: 0.45 },
    interactions: [
      {
        verb: 'File the discharge papers',
        conditions: [{ type: 'questActive', questId: 'discharged', stepId: 'ledger' }],
        oncePerCharacter: true,
        failureText: "Nobody leaves the cold ward without Matron's discharge papers.",
        effects: [{ type: 'takeItem', itemId: 'discharge-papers' }, { type: 'notify', text: 'You file the papers. Down every row of the ledger, ADMITTED becomes DISCHARGED, one name at a time.' }],
      },
    ],
  },
];
