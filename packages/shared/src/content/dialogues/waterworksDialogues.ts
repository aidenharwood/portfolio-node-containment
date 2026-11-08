import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const PRESSURE = 'pressure-drop';
const BAD_WATER = 'bad-water';
const OUTFALL = 'the-outfall';

export const NGATA_DIALOGUE: DialogueDefinition = {
  id: 'ngata',
  entries: [
    { node: 'pressureDeliver', conditions: [{ type: 'questActive', questId: PRESSURE, stepId: 'report' }] },
    { node: 'assayDeliver', conditions: [{ type: 'questActive', questId: BAD_WATER, stepId: 'report' }] },
    { node: 'outfallDeliver', conditions: [{ type: 'questActive', questId: OUTFALL, stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Mind the floor, it's wet. It's always wet. Ngata, Pumpwright. Every drop you've drunk on this Site came through this room first, and lately it has not been coming through very well.",
      options: [
        { text: 'What is this place?', next: 'place' },
        {
          text: 'Need a hand?',
          conditions: [{ type: 'questCompleted', questId: 'cleared-for-transit' }, { type: 'questNotStarted', questId: PRESSURE }],
          next: 'pressureOffer',
        },
        { text: 'How is the pressure?', conditions: [{ type: 'questActive', questId: PRESSURE }], next: 'pressureProgress' },
        {
          text: 'Anything else wrong with the water?',
          conditions: [{ type: 'questCompleted', questId: PRESSURE }, { type: 'questNotStarted', questId: BAD_WATER }],
          next: 'badWaterOffer',
        },
        { text: 'About those samples.', conditions: [{ type: 'questActive', questId: BAD_WATER }], next: 'badWaterProgress' },
        {
          text: 'What do you want done about the outfall?',
          conditions: [{ type: 'questCompleted', questId: BAD_WATER }, { type: 'questNotStarted', questId: OUTFALL }],
          next: 'outfallOffer',
        },
        { text: 'About the outfall.', conditions: [{ type: 'questActive', questId: OUTFALL }], next: 'outfallProgress' },
        { text: 'What was down the pipe?', conditions: [{ type: 'questCompleted', questId: OUTFALL }], next: 'pipe' },
        { text: 'Goodbye.', next: null },
      ],
    },
    place: {
      speaker: 'npc',
      text: 'Reclamation. Everything that goes down a drain upstairs comes here, gets strained, settled, filtered and sent back up. Galleries north, filter beds east, tanks south of those, and the outfall at the far end, where whatever we cannot use goes down. Down where, nobody wrote down.',
      next: 'greeting',
    },
    pressureOffer: {
      speaker: 'npc',
      text: "Somebody closed the header valves in the gallery and chained them shut. Probably me, the night the skimmers got in. I've unchained them. Open all three, then thin out the skimmers so they stop chewing the intakes. Six should make them think twice.",
      options: [
        { text: "I'll open them.", effects: [{ type: 'startQuest', questId: PRESSURE }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    pressureProgress: {
      speaker: 'npc',
      text: 'Three valves in the gallery, through the north door. Then the skimmers. They look like dinner plates with opinions. You will know them.',
      next: 'greeting',
    },
    pressureDeliver: {
      speaker: 'npc',
      text: "Listen to that. That's the mains filling. The Atrium will have hot showers by the end of shift and not one of them will know your name. That's the job. Here, it pays better than it sounds.",
      options: [
        { text: 'Glad to help.', effects: [{ type: 'emitSignal', signal: 'waterworks.pressure-restored' }], next: null },
      ],
    },
    badWaterOffer: {
      speaker: 'npc',
      text: "Now the pressure's back, they're complaining about the taste. Pennies, they say. Water shouldn't taste of anything. Draw me a sample from each of the three filter beds, then run them through the assay bench here. I'd do it, but my knees are older than the pipes.",
      options: [
        { text: "I'll take the samples.", effects: [{ type: 'startQuest', questId: BAD_WATER }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    badWaterProgress: {
      speaker: 'npc',
      text: 'One sample from each bed, then the assay bench, right behind me. Do not drink them. People have asked.',
      next: 'greeting',
    },
    assayDeliver: {
      speaker: 'npc',
      text: "Iron and copper. That's blood, near enough. And it gets thicker the closer you get to the outfall. So something down there is bleeding, or something down there is eating, and I don't much like either.",
      options: [
        { text: 'Neither do I.', effects: [{ type: 'emitSignal', signal: 'waterworks.assay-reported' }], next: null },
      ],
    },
    outfallOffer: {
      speaker: 'npc',
      text: 'The bloats come from the outfall. Something big is sitting in it, breeding them and choking the pump. Get through the tanks, kill whatever it is, and get the outfall pump turning again. Bring friends. Bring medgel. Bring the friends who bring medgel.',
      options: [
        { text: "I'll clear the outfall.", effects: [{ type: 'startQuest', questId: OUTFALL }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    outfallProgress: {
      speaker: 'npc',
      text: "Through the filter beds, south into the tanks, east to the outfall. If it's warm, you're close. If it's moving, you're closer.",
      next: 'greeting',
    },
    outfallDeliver: {
      speaker: 'npc',
      text: "I felt the pump catch from in here. Whole floor hummed. You've done what three work orders and a safety review couldn't. Take the plate. It's meant for riot work, but I reckon you've had a riot.",
      options: [
        { text: 'It was a busy afternoon.', effects: [{ type: 'emitSignal', signal: 'waterworks.outfall-cleared' }], next: 'pipe' },
      ],
    },
    pipe: {
      speaker: 'npc',
      text: "The outfall drops further than any pipe on the plans. I held a lamp over it once and heard something down there, a long way down. Not water. Tapping. Patient, like it was waiting for someone to answer. I put the lid back on. If you ever find where it goes, I would rather you didn't tell me.",
      next: null,
    },
  },
};
