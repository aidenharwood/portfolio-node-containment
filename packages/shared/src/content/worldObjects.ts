import type { WorldObjectDefinition } from '../world/entities.ts';
import { RUIN_OBJECTS } from './ruinObjects.ts';
import { SET_PIECE_OBJECTS } from './setPieceObjects.ts';
import { ATRIUM_ANCHORS } from './districts/meridianAtrium.ts';
import { MERIDIAN_BELOW_ANCHORS } from './districts/meridianBelow.ts';
import { SECTOR_THREE_ANCHORS } from './districts/sectorThree.ts';
import { UNDERCROFT_ANCHORS } from './districts/undercroft.ts';

export const WORLD_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'med-bed',
    name: 'Medbay Bed',
    examine: 'A recovery bed with a humming diagnostic canopy. The sheets are crisp. The previous occupant was not.',
    model: 'medBed',
    blocksMovement: true,
    light: { radius: 1.5, color: '#7cf29a', intensity: 0.35 },
    interactions: [
      {
        verb: 'Rest',
        effects: [
          { type: 'restoreIntegrity' },
          { type: 'notify', text: 'You lie down for a moment. The canopy hums and the aches fade.' },
        ],
      },
    ],
  },
  {
    id: 'seed-vault-console',
    name: 'Seed Vault Console',
    examine: 'The control console for the Verdance seed vault. Frost has crept over everything except the screen.',
    model: 'seedVault',
    blocksMovement: true,
    light: { radius: 2.5, color: '#9fd8ff', intensity: 0.7 },
    interactions: [
      {
        verb: 'Read',
        conditions: [{ type: 'questActive', questId: 'overgrowth', stepId: 'vault' }],
        failureText: 'The vault inventory scrolls past. Nothing you need right now.',
        effects: [
          { type: 'grantExperience', skill: 'research', amount: 120 },
          { type: 'notify', text: 'Forty-one seed lines read as viable. The vault seals are holding, for now.' },
        ],
      },
    ],
  },
  {
    id: 'issue-locker',
    name: 'Issue Locker',
    examine: 'A personal locker with your intake number stencilled on the door. It is already unlocked, which is unsettling.',
    model: 'issueLocker',
    blocksMovement: true,
    interactions: [
      {
        verb: 'Open',
        conditions: [{ type: 'hasItem', itemId: 'clearance-card-l1' }],
        failureText: 'The locker reader blinks red. You need a clearance card.',
        oncePerCharacter: true,
        alreadyUsedText: 'Your issue locker is empty.',
        effects: [
          { type: 'giveItem', itemId: 'field-vest-mk1' },
          { type: 'giveItem', itemId: 'hazard-visor' },
          { type: 'notify', text: 'You collect a Field Vest Mk.I and a Hazard Visor.' },
        ],
      },
    ],
  },
  {
    id: 'wall-locker',
    name: 'Staff Locker',
    examine: 'Somebody else’s locker. A sticky note reads: "DO NOT FEED".',
    model: 'locker',
    blocksMovement: true,
    interactions: [],
  },
  {
    id: 'diagnostic-terminal',
    name: 'Diagnostic Terminal',
    examine: 'A biometric calibration station. The screen reads: PLACE HAND. HOLD STILL. DO NOT BLINK.',
    model: 'diagnosticTerminal',
    blocksMovement: true,
    light: { radius: 2.5, color: '#4fd8ff', intensity: 0.7 },
    interactions: [
      {
        verb: 'Calibrate',
        conditions: [{ type: 'questActive', questId: 'orientation-protocol', stepId: 'calibrate' }],
        failureText: 'The terminal displays your last calibration. Nothing needs adjusting.',
        effects: [
          { type: 'grantExperience', skill: 'research', amount: 80 },
          { type: 'grantExperience', skill: 'fortitude', amount: 40 },
          { type: 'notify', text: 'Calibration complete. Baseline cognitive profile recorded.' },
        ],
      },
    ],
  },
  {
    id: 'server-rack',
    name: 'Server Rack',
    examine: 'Cooling fans whir. One drive light blinks in a pattern that looks deliberate.',
    model: 'serverRack',
    blocksMovement: true,
    light: { radius: 1.5, color: '#3fbf7f', intensity: 0.4 },
    interactions: [],
  },
  {
    id: 'anm-0447-lantern',
    name: 'ANM-0447 "Patient Lantern"',
    examine:
      'A brass maritime lantern suspended in coolant. Its light shows the room as it will be one hour from now. Class: Restless.',
    model: 'patientLantern',
    blocksMovement: true,
    light: { radius: 6, color: '#ffb347', intensity: 1, flicker: true },
    interactions: [],
  },
  {
    id: 'sample-cabinet',
    name: 'Sample Cabinet',
    examine: 'A refrigerated cabinet of labelled vials. Several labels have been crossed out and rewritten in a different hand.',
    model: 'sampleCabinet',
    blocksMovement: true,
    light: { radius: 1.6, color: '#ffb347', intensity: 0.5 },
    interactions: [
      {
        verb: 'Search',
        conditions: [{ type: 'questActive', questId: 'orientation-protocol', stepId: 'retrieve-sample' }],
        failureText: 'The cabinet is sealed. Its display reads: AUTHORISED RETRIEVAL ONLY.',
        effects: [
          { type: 'giveItem', itemId: 'resonance-sample' },
          { type: 'notify', text: 'You retrieve a sealed resonance sample. It is warm to the touch.' },
        ],
      },
    ],
  },
  {
    id: 'supply-crate',
    name: 'Supply Crate',
    examine: 'Stencilled: FRAGILE — THIS SIDE TOWARDS REALITY.',
    model: 'crate',
    blocksMovement: true,
    interactions: [
      {
        verb: 'Salvage',
        oncePerCharacter: true,
        alreadyUsedText: 'You have already picked this crate clean.',
        effects: [
          { type: 'giveItem', itemId: 'scrap-alloy', count: 2 },
          { type: 'grantExperience', skill: 'salvage', amount: 25 },
          { type: 'notify', text: 'You pry loose some scrap alloy.' },
        ],
      },
    ],
  },
  {
    id: 'light-pillar',
    name: 'Light Pillar',
    examine: 'A floor-mounted lumen column. It hums at a frequency that makes your teeth itch.',
    model: 'lightPillar',
    blocksMovement: true,
    light: { radius: 4.5, color: '#9fd8ff', intensity: 0.85 },
    interactions: [],
  },
  {
    id: 'warning-sign',
    name: 'Warning Placard',
    examine: '"VIEWING WINDOW. DO NOT MAKE EYE CONTACT WITH THE LIGHT. THE LIGHT IS NOT LOOKING AT YOU."',
    model: 'warningSign',
    blocksMovement: true,
    interactions: [],
  },
  {
    id: 'briefing-bench',
    name: 'Briefing Bench',
    examine: 'A steel bench. Bolted down, which tells you something about previous briefings.',
    model: 'bench',
    blocksMovement: true,
    interactions: [],
  },
  {
    id: 'intake-kiosk',
    name: 'Intake Kiosk',
    examine: 'A public information terminal cycling through Directorate safety slogans.',
    model: 'kiosk',
    blocksMovement: true,
    light: { radius: 2, color: '#59e0c5', intensity: 0.6 },
    interactions: [
      {
        verb: 'Read',
        effects: [
          {
            type: 'notify',
            text: 'KIOSK: "Report unusual phenomena immediately. Unusual phenomena include: this kiosk, if it is talking to you."',
          },
        ],
      },
    ],
  },
  {
    id: 'atrium-core',
    name: 'Meridian Core Column',
    examine: 'The Site’s primary containment field generator, rising through every floor. It is very bright and very quiet.',
    model: 'lightPillar',
    blocksMovement: true,
    modelScale: 2.2,
    light: { radius: 9, color: '#7fe7ff', intensity: 1 },
    interactions: [],
  },
  {
    id: 'vent-panel',
    name: 'Ventilation Panel',
    examine: 'An environmental control panel. Something inside is crackling.',
    model: 'ventPanel',
    blocksMovement: true,
    light: { radius: 1.4, color: '#3fbf7f', intensity: 0.5, flicker: true },
    interactions: [
      {
        verb: 'Inspect',
        conditions: [{ type: 'questActive', questId: 'static-in-the-vents', stepId: 'inspect-vents' }],
        failureText: 'The panel is humming along. Nothing for you to do here right now.',
        oncePerCharacter: true,
        alreadyUsedText: 'You have already pulled the faulty chip from this panel.',
        effects: [
          { type: 'giveItem', itemId: 'vent-filter-chip' },
          { type: 'grantExperience', skill: 'engineering', amount: 45 },
          { type: 'notify', text: 'You pull a scorched control chip out of the panel. The crackling stops.' },
        ],
      },
    ],
  },
  {
    id: 'sealed-bulkhead',
    name: 'Sealed Bulkhead',
    examine: 'A blast door marked SECTOR 2 — QUARANTINE. Fresh scorch marks run along the seam.',
    model: 'bulkhead',
    blocksMovement: true,
    light: { radius: 2.5, color: '#ff4d4d', intensity: 0.7, flicker: true },
    door: { conditions: [{ type: 'hasItem', itemId: 'quarantine-override-key' }] },
    interactions: [
      {
        verb: 'Open',
        failureText: 'The bulkhead does not respond. Somewhere behind it, something knocks twice.',
        effects: [{ type: 'notify', text: 'The override key turns. Seals hiss. The air beyond is very cold.' }],
      },
    ],
  },
  {
    id: 'planter',
    name: 'Hydroponic Planter',
    examine: 'Real plants, grown under false sunlight. Morale initiative #44.',
    model: 'planter',
    blocksMovement: true,
    interactions: [],
  },
  {
    id: 'halvorsen-terminal',
    name: "Halvorsen's Lab Terminal",
    examine: 'A research terminal still logged in to Dr. Mira Halvorsen. The cursor blinks very patiently.',
    model: 'halvorsenTerminal',
    blocksMovement: true,
    light: { radius: 2.5, color: '#9fd8ff', intensity: 0.7, flicker: true },
    interactions: [
      {
        verb: 'Access',
        conditions: [{ type: 'questActive', questId: 'the-knocking', stepId: 'recover-log' }],
        failureText: 'The screen loops a single line: LET IT IN. LET IT IN. LET IT IN.',
        effects: [
          { type: 'giveItem', itemId: 'expedition-log' },
          { type: 'grantExperience', skill: 'research', amount: 90 },
          { type: 'notify', text: "You pull Halvorsen's expedition log onto a datachip." },
        ],
      },
    ],
  },
  {
    id: 'sector-three-door',
    name: 'Unmarked Door',
    examine: 'There is no Sector 3 behind this wall. There is a door in it anyway.',
    model: 'bulkhead',
    blocksMovement: true,
    light: { radius: 3, color: '#c79bff', intensity: 0.6, flicker: true },
    interactions: [
      {
        verb: 'Listen',
        effects: [{ type: 'notify', text: 'Three knocks. A pause. Three more. Whatever is on the other side is very patient.' }],
      },
    ],
  },
  {
    id: 'gloam-nest',
    name: 'Gloam Nest',
    examine: 'A heap of shed carapace and something like wet glass. It pulses, slowly, in time with nothing.',
    model: 'nest',
    blocksMovement: true,
    light: { radius: 2, color: '#7a3cff', intensity: 0.6, flicker: true },
    interactions: [
      {
        verb: 'Harvest',
        oncePerCharacter: true,
        alreadyUsedText: 'Nothing left in this nest you want to touch.',
        effects: [
          { type: 'giveItem', itemId: 'gloam-chitin', count: 2 },
          { type: 'grantExperience', skill: 'salvage', amount: 60 },
          { type: 'notify', text: 'You pry loose two plates of glowing chitin.' },
        ],
      },
    ],
  },
  {
    id: 'atrium-service-lift',
    name: 'Service Lift',
    examine: 'A battered freight cage leading down to the Undercroft. Stencilled: MAINTENANCE ONLY. Someone has added: GOOD LUCK.',
    model: 'transitLift',
    blocksMovement: true,
    light: { radius: 3, color: '#ff9a4d', intensity: 0.6, flicker: true },
    interactions: [
      {
        verb: 'Descend',
        conditions: [{ type: 'hasFlag', flag: 'clearance.undercroft' }],
        failureText: 'The panel reads: AUTHORISATION REQUIRED — RESEARCH DIVISION.',
        effects: [{ type: 'teleport', districtId: 'undercroft', position: UNDERCROFT_ANCHORS.liftArrival }],
      },
    ],
  },
  {
    id: 'undercroft-service-lift',
    name: 'Service Lift',
    examine: 'The way back up to the Atrium. The cage groans like it has opinions about your weight.',
    model: 'transitLift',
    blocksMovement: true,
    light: { radius: 3, color: '#ff9a4d', intensity: 0.6, flicker: true },
    interactions: [{ verb: 'Ascend', effects: [{ type: 'teleport', districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.serviceLiftArrival }] }],
  },
  {
    id: 'junction-box',
    name: 'Junction Box',
    examine: 'A dead power junction. Through the Lantern Lens, faint amber threads show where current used to run.',
    model: 'junctionBox',
    blocksMovement: true,
    light: { radius: 1.6, color: '#ffb347', intensity: 0.4, flicker: true },
    interactions: [
      {
        verb: 'Restore',
        conditions: [
          { type: 'questActive', questId: 'the-far-side', stepId: 'restore-power' },
          { type: 'hasItem', itemId: 'lantern-lens' },
        ],
        failureText: 'The junction is dead and the wiring is a maze. You would need to know where the current wants to go.',
        oncePerCharacter: true,
        alreadyUsedText: 'This junction is humming steadily now.',
        effects: [
          { type: 'grantExperience', skill: 'engineering', amount: 140 },
          { type: 'notify', text: 'You follow the amber threads in the lens and bridge the circuit. The junction hums awake.' },
        ],
      },
    ],
  },
  {
    id: 'pipe-cluster',
    name: 'Pipe Cluster',
    examine: 'A tangle of coolant pipes, some still warm. Something inside occasionally knocks back.',
    model: 'pipeCluster',
    blocksMovement: true,
    interactions: [],
  },
  {
    id: 'pump-housing',
    name: 'Pump Housing',
    examine: 'A primary coolant pump the size of a car, silent since the lockdown.',
    model: 'pumpHousing',
    blocksMovement: true,
    light: { radius: 2.5, color: '#46c8a8', intensity: 0.45 },
    interactions: [],
  },
  {
    id: 'camp-heater',
    name: 'Salvaged Heater',
    examine: 'Three space heaters wired into one. Mags calls it "the hearth". It is the warmest thing in the Undercroft.',
    model: 'heater',
    blocksMovement: true,
    light: { radius: 5, color: '#ff9a4d', intensity: 0.9, flicker: true },
    interactions: [
      {
        verb: 'Warm up',
        effects: [{ type: 'notify', text: 'You hold your hands to the coils. For a moment, the Undercroft feels almost habitable.' }],
      },
    ],
  },
  {
    id: 'sector-three-seal',
    name: 'Sector 3 Seal',
    examine: 'A pressure seal that should open onto bedrock. It does not.',
    model: 'sealHatch',
    blocksMovement: true,
    light: { radius: 3, color: '#b57cff', intensity: 0.7, flicker: true },
    interactions: [
      {
        verb: 'Open',
        conditions: [{ type: 'hasFlag', flag: 'undercroft.foreman-down' }],
        failureText: 'The seal will not budge. Something in the workshop is still drawing power from this circuit.',
        effects: [
          { type: 'notify', text: 'The seal sighs open. The air on the other side smells like rain, which is not possible.' },
          { type: 'teleport', districtId: 'sector-three', position: SECTOR_THREE_ANCHORS.arrival },
        ],
      },
    ],
  },
  {
    id: 'sector-three-return',
    name: 'Seal Back to the Undercroft',
    examine: 'The way you came in. From this side it looks much older.',
    model: 'bulkhead',
    blocksMovement: true,
    light: { radius: 3, color: '#ffb347', intensity: 0.6 },
    interactions: [{ verb: 'Open', effects: [{ type: 'teleport', districtId: 'undercroft', position: UNDERCROFT_ANCHORS.sealLanding }] }],
  },
  {
    id: 'the-knock',
    name: 'ANM-1180 "The Knock"',
    examine: 'A freestanding door with no frame, no wall and no hinges. It is closed. It is very slightly warm. Class: Sovereign.',
    model: 'knockDoor',
    blocksMovement: true,
    light: { radius: 5, color: '#b57cff', intensity: 0.9, flicker: true },
    interactions: [
      {
        verb: 'Listen',
        effects: [{ type: 'notify', text: 'Nothing. Then, very softly, from the other side: three knocks, and a pause, and what might be a voice saying your name.' }],
      },
      {
        verb: 'Step through',
        conditions: [{ type: 'hasFlag', flag: 'farside.door-open' }],
        failureText: 'The door is shut, and Halvorsen is standing very firmly in front of it.',
        effects: [
          { type: 'notify', text: 'You put your hand on the door. It opens before you push, as if it has been expecting you for a long time.' },
          { type: 'teleport', districtId: 'meridian-below', position: MERIDIAN_BELOW_ANCHORS.arrival },
        ],
      },
    ],
  },
  {
    id: 'lantern-echo',
    name: 'Lantern Echo',
    examine: 'A brass lantern identical to ANM-0447. Its light shows this room as it was an hour ago. You are in it.',
    model: 'patientLantern',
    blocksMovement: true,
    light: { radius: 4, color: '#ffb347', intensity: 0.8, flicker: true },
    interactions: [],
  },
  ...RUIN_OBJECTS,
  ...SET_PIECE_OBJECTS,
];
