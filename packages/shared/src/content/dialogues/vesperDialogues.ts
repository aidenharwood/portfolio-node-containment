import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import { VESPER_SURGERY_FLAG } from '../vesperObjects.ts';

const REFERRAL = 'referral';
const ROUNDS = 'night-rounds';
const OPINION = 'second-opinion';
const STOCK = 'prescription-for-one';
const COLD = 'the-cold-ward';
const DISCHARGED = 'discharged';

export const ASHBY_DIALOGUE: DialogueDefinition = {
  id: 'ashby',
  entries: [
    { node: 'referralDeliver', conditions: [{ type: 'questActive', questId: REFERRAL, stepId: 'ashby' }] },
    { node: 'roundsDeliver', conditions: [{ type: 'questActive', questId: ROUNDS, stepId: 'report' }] },
    { node: 'opinionDeliver', conditions: [{ type: 'questActive', questId: OPINION, stepId: 'report' }] },
    { node: 'coldDeliver', conditions: [{ type: 'questActive', questId: COLD, stepId: 'report' }] },
    { node: 'dischargedDeliver', conditions: [{ type: 'questActive', questId: DISCHARGED, stepId: 'report' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Matron Ashby. Wipe your feet, wash your hands, and do not touch the charts. Vesper has been waiting a very long time for a visitor, and I would like the first one to behave.",
      options: [
        { text: 'What is Vesper?', next: 'vesper' },
        {
          text: 'What do the patients need?',
          conditions: [{ type: 'questCompleted', questId: REFERRAL }, { type: 'questNotStarted', questId: ROUNDS }],
          next: 'roundsOffer',
        },
        { text: 'About the night rounds.', conditions: [{ type: 'questActive', questId: ROUNDS }], next: 'roundsProgress' },
        {
          text: 'Who wrote the charts?',
          conditions: [{ type: 'questCompleted', questId: ROUNDS }, { type: 'questNotStarted', questId: OPINION }],
          next: 'opinionOffer',
        },
        { text: 'About the surgery.', conditions: [{ type: 'questActive', questId: OPINION }], next: 'opinionProgress' },
        {
          text: 'What is down the bed lift?',
          conditions: [{ type: 'questCompleted', questId: ROUNDS }, { type: 'questNotStarted', questId: COLD }],
          next: 'coldOffer',
        },
        { text: 'About the cold ward.', conditions: [{ type: 'questActive', questId: COLD }], next: 'coldProgress' },
        {
          text: 'Is anyone still admitted?',
          conditions: [{ type: 'questCompleted', questId: COLD }, { type: 'questNotStarted', questId: DISCHARGED }],
          next: 'dischargedOffer',
        },
        { text: 'About the discharge papers.', conditions: [{ type: 'questActive', questId: DISCHARGED }], next: 'dischargedProgress' },
        { text: 'How is Vesper now?', conditions: [{ type: 'questCompleted', questId: OPINION }], next: 'after' },
        { text: 'Goodbye.', next: null },
      ],
    },
    vesper: {
      speaker: 'npc',
      text: "A sanatorium for staff who had seen too much of what we contain. Forty years ago the pharmacy began writing its own prescriptions, and the Chief Physician began following them. We sealed the wards with the patients inside, for their own good. Every one of them has asked for Meridian, every night, since.",
      next: 'greeting',
    },
    referralDeliver: {
      speaker: 'npc',
      text: "Our referral. Meridian, in person. I wrote that slip myself, forty years ago, and sent it up the tube every month since. You are very late, and you are very welcome. Let me see you.",
      options: [
        {
          text: 'Meridian, reporting as referred.',
          effects: [{ type: 'takeItem', itemId: 'vesper-referral' }, { type: 'emitSignal', signal: 'vesper.met-ashby' }],
          next: null,
        },
      ],
    },
    roundsOffer: {
      speaker: 'npc',
      text: "To be listened to. Every patient asks for Meridian, and every night the night nurses sedate them for asking. Read me the charts for beds 4, 11 and 19 in the South Ward. Then relieve the night shift. Eight of them should make the rest think twice.",
      options: [
        { text: "I'll do the rounds.", effects: [{ type: 'startQuest', questId: ROUNDS }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    roundsProgress: {
      speaker: 'npc',
      text: 'Beds 4, 11 and 19, South Ward, then the night nurses. They carry lamps. You will see them coming, which is more than the patients ever did.',
      next: 'greeting',
    },
    roundsDeliver: {
      speaker: 'npc',
      text: '"Asked for Meridian. Sedated." Every chart, every night, in the Chief Physician\'s handwriting. He has not been on the wards in forty years. Thank you. I will read them the charts myself, tonight.',
      options: [{ text: 'They will want to hear it.', effects: [{ type: 'emitSignal', signal: 'vesper.charts-reported' }], next: null }],
    },
    opinionOffer: {
      speaker: 'npc',
      text: 'The Chief Physician. He has not left the surgery since the pharmacy started prescribing, and every chart on the ward is still in his hand. I have the second key to the surgery. I am unlocking it for you. Get him a second opinion.',
      options: [
        { text: "I'll give him one.", effects: [{ type: 'startQuest', questId: OPINION }, { type: 'setFlag', flag: VESPER_SURGERY_FLAG }], next: null },
        { text: 'Not yet.', next: 'greeting' },
      ],
    },
    opinionProgress: {
      speaker: 'npc',
      text: 'West through the lodge, into the dispensary, and the surgery doors are on the far wall. Do not read anything the pharmacy hands you.',
      next: 'greeting',
    },
    opinionDeliver: {
      speaker: 'npc',
      text: 'The pharmacy has stopped writing. I can hear the patients talking upstairs, and not one of them is asking for anything. I am going to write to Meridian, and this time I will sign it myself.',
      options: [{ text: 'We will write back.', effects: [{ type: 'emitSignal', signal: 'vesper.physician-reported' }], next: null }],
    },
    coldOffer: {
      speaker: 'npc',
      text: "The cold ward. Patients the Almoner decided could not afford to be well were sent down there to wait. The attendants are still keeping it cold. I have unlocked the bed lift. Thin out the attendants and find the Almoner in her office.",
      options: [
        { text: "I'll go down.", effects: [{ type: 'startQuest', questId: COLD }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    coldProgress: {
      speaker: 'npc',
      text: 'The bed lift is by the west wall of the lodge. The Almoner keeps her office at the far end of the cold ward. She will tell you what you owe.',
      next: 'greeting',
    },
    coldDeliver: {
      speaker: 'npc',
      text: 'The accounts are closed, then. Forty years of patients waiting for someone to say they could afford to get better. Well, they can.',
      options: [{ text: 'They can.', effects: [{ type: 'emitSignal', signal: 'vesper.almoner-reported' }], next: null }],
    },
    dischargedOffer: {
      speaker: 'npc',
      text: "Every one of them. On paper, the whole cold ward is still admitted. These are their discharge papers. File them in the ward ledger, in the Almoner's office, and Vesper can finally let them go.",
      options: [
        { text: "I'll file them.", effects: [{ type: 'startQuest', questId: DISCHARGED }, { type: 'giveItem', itemId: 'discharge-papers' }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    dischargedProgress: {
      speaker: 'npc',
      text: "The ledger is in the Almoner's office, at the bottom of the cold ward. File every page. I have counted them.",
      next: 'greeting',
    },
    dischargedDeliver: {
      speaker: 'npc',
      text: 'Discharged. All of them. I am going to close the cold ward and turn the heating on, and I am going to leave it on.',
      options: [{ text: 'Leave it on.', effects: [{ type: 'emitSignal', signal: 'vesper.ward-discharged' }], next: null }],
    },
    after: {
      speaker: 'npc',
      text: "Visiting hours are any time now. Lowe is selling real medicine to people who walked in through the front door, and the patients have started asking for things that are not Meridian. It is very noisy. I am delighted.",
      next: 'greeting',
    },
  },
};

export const LOWE_DIALOGUE: DialogueDefinition = {
  id: 'lowe',
  entries: [
    { node: 'stockDeliver', conditions: [{ type: 'questActive', questId: STOCK, stepId: 'deliver' }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: 'Dispensary. Everything here was dispensed by hand and checked twice. What can I make up for you?',
      options: [
        { text: "Let's trade.", effects: [{ type: 'openShop', shopId: 'vesper-dispensary' }], next: null },
        {
          text: 'Are you short of anything?',
          conditions: [{ type: 'questCompleted', questId: REFERRAL }, { type: 'questNotStarted', questId: STOCK }],
          next: 'stockOffer',
        },
        { text: 'About your stock.', conditions: [{ type: 'questActive', questId: STOCK }], next: 'stockProgress' },
        { text: 'Why not use the pharmacy?', next: 'pharmacy' },
        { text: 'Goodbye.', next: null },
      ],
    },
    pharmacy: {
      speaker: 'npc',
      text: 'Because the pharmacy writes its own prescriptions, and they are always for more of itself. I dispense by hand, from stock I picked myself, and I sleep very well.',
      next: 'greeting',
    },
    stockOffer: {
      speaker: 'npc',
      text: 'Stock I trust. Six bundles of physic herb from the ward cabinets, and four lengths of starched linen from the night nurses. Not from the pharmacy. Never from the pharmacy.',
      options: [
        { text: "I'll bring it.", effects: [{ type: 'startQuest', questId: STOCK }], next: null },
        { text: 'Not right now.', next: 'greeting' },
      ],
    },
    stockProgress: {
      speaker: 'npc',
      text: 'Six physic herb, four starched linen. The cabinets are in the wards; the nurses will bring the linen to you, whether you like it or not.',
      next: 'greeting',
    },
    stockDeliver: {
      speaker: 'npc',
      text: 'Herbs I can trust and linen I can boil. That is a week of tonics. Here, take some of the first batch.',
      options: [
        {
          text: 'Glad to help.',
          conditions: [{ type: 'hasItem', itemId: 'physic-herb', count: 6 }, { type: 'hasItem', itemId: 'starched-linen', count: 4 }],
          effects: [{ type: 'takeItem', itemId: 'physic-herb', count: 6 }, { type: 'takeItem', itemId: 'starched-linen', count: 4 }, { type: 'emitSignal', signal: 'vesper.stock-delivered' }],
          next: null,
        },
        { text: 'I will come back with the rest.', next: null },
      ],
    },
  },
};
