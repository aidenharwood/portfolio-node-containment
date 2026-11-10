import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

const OVERGROWTH = 'overgrowth';

export const ANAND_DIALOGUE: DialogueDefinition = {
  id: 'anand',
  entries: [{ node: 'greeting' }],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Medbay. If you're bleeding, sit. If you're not, don't start. Anyone who goes down out there wakes up on one of my beds, so we'll be seeing a lot of each other.",
      options: [
        { text: 'Patch me up, please.', effects: [{ type: 'restoreIntegrity' }], next: 'patched' },
        { text: 'I need supplies.', effects: [{ type: 'openShop', shopId: 'medbay' }], next: null },
        { text: 'Can I make my own medicine?', next: 'craft' },
        {
          text: 'You look worried, Doc.',
          conditions: [{ type: 'questCompleted', questId: 'cathedral-of-salt' }, { type: 'questNotStarted', questId: 'referral' }],
          next: 'referralOffer',
        },
        { text: 'About that referral.', conditions: [{ type: 'questActive', questId: 'referral' }], next: 'referralProgress' },
        { text: 'Thanks, Doc.', next: null },
      ],
    },
    referralOffer: {
      speaker: 'npc',
      text: "This came up the pneumatic tube this morning. Vesper Sanatorium letterhead. PATIENT: MERIDIAN. CONDITION: UNKNOWN. PLEASE ATTEND. The tube runs to Hydroponics and then somewhere it shouldn't. After Calder, I'm not laughing. Would you go?",
      options: [
        { text: "I'll attend.", effects: [{ type: 'startQuest', questId: 'referral' }, { type: 'giveItem', itemId: 'vesper-referral' }], next: null },
        { text: 'Not yet.', next: 'greeting' },
      ],
    },
    referralProgress: {
      speaker: 'npc',
      text: "The tube comes up through the Hydroponics seed vault. Ask Oyelaran. And take the slip; a sanatorium will want to see paperwork.",
      next: 'greeting',
    },
    patched: {
      speaker: 'npc',
      text: 'There. Good as issued. Try to keep it that way for at least an hour.',
      next: null,
    },
    craft: {
      speaker: 'npc',
      text: "Course you can. Moss into gel base at a refinery, gel base into Medgel at a bio-synthesiser. There's one in the Fabrication Hall and one behind me. Better compounds need lumen spores from the hydroponics deck.",
      next: 'greeting',
    },
  },
};

export const OYELARAN_DIALOGUE: DialogueDefinition = {
  id: 'oyelaran',
  entries: [
    { node: 'vesperAsk', conditions: [{ type: 'questActive', questId: 'referral', stepId: 'oyelaran' }] },
    { node: 'report', conditions: [{ type: 'questActive', questId: OVERGROWTH, stepId: 'report' }] },
    { node: 'progress', conditions: [{ type: 'questActive', questId: OVERGROWTH }] },
    { node: 'thanks', conditions: [{ type: 'questCompleted', questId: OVERGROWTH }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Careful on the platform edge. Welcome to Verdance, or what is left of it. Dr. Oyelaran, hydroponics. We used to grow the whole site's salad. Now the salad grows us.",
      options: [
        { text: 'What happened here?', next: 'history' },
        { text: 'Can I help?', conditions: [{ type: 'questNotStarted', questId: OVERGROWTH }], next: 'offer' },
        { text: 'What can I gather here?', next: 'gather' },
        { text: 'Goodbye.', next: null },
      ],
    },
    vesperAsk: {
      speaker: 'npc',
      text: "The seed vault's back wall? It has been warm for weeks, and it smells of carbolic. I assumed the seeds were sulking. The pneumatic tube runs straight through it. It is not really a wall, it is a door, and it was never locked. There is a walk behind it heading west. I have been very carefully not going through it.",
      options: [{ text: "I'll open it.", effects: [{ type: 'emitSignal', signal: 'vesper.oyelaran-asked' }], next: null }],
    },
    history: {
      speaker: 'npc',
      text: 'A strain in the nursery started answering the irrigation schedule. Then it started setting it. The crawlers are its thorns. The drifters are its pollen. Neither is friendly.',
      next: 'greeting',
    },
    gather: {
      speaker: 'npc',
      text: 'Strangler vines give good fibre if you cut them before they cut you. Lumen blooms in the greenhouse give spores for proper medicine. Refine both before they wilt.',
      next: 'greeting',
    },
    offer: {
      speaker: 'npc',
      text: 'The crawlers keep the vines growing over the seed vault. Cut back five crawlers, bring me four samples of strangler fibre, and read the seed vault console so I know what is still viable.',
      options: [
        { text: "I'll do it.", effects: [{ type: 'startQuest', questId: OVERGROWTH }], next: 'accepted' },
        { text: 'Not yet.', next: null },
      ],
    },
    accepted: {
      speaker: 'npc',
      text: 'Bless you. The crawlers are in the nursery and the grow hall. The vault is south of the platform. Do not stand still near the drifters.',
      next: null,
    },
    progress: {
      speaker: 'npc',
      text: 'Crawlers, fibre, vault console. The nursery and the grow hall are crawling with the first two. The vault is through the south door.',
      next: null,
    },
    report: {
      speaker: 'npc',
      text: 'Forty-one viable lines. Forty-one! And fibre clean enough to weave. Take these; braid that fibre at a refinery and you can make gloves the thorns will not get through.',
      next: null,
    },
    thanks: {
      speaker: 'npc',
      text: 'The vault is breathing again. Come back whenever you need fibre; the vines never stop.',
      next: null,
    },
  },
};

const SCRAP_RUN = 'scrap-run';

export const QUILL_DIALOGUE: DialogueDefinition = {
  id: 'quill',
  entries: [
    { node: 'report', conditions: [{ type: 'questActive', questId: SCRAP_RUN, stepId: 'report' }] },
    { node: 'progress', conditions: [{ type: 'questActive', questId: SCRAP_RUN }] },
    { node: 'thanks', conditions: [{ type: 'questCompleted', questId: SCRAP_RUN }] },
    { node: 'greeting' },
  ],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: "Yard Office. Wipe your boots. Yardmaster Quill. Everything the Atrium fabricators eat comes through here: scrap from the yard, cloth from the laundry, moss and resin from the culverts. Or it did.",
      options: [
        { text: 'What went wrong?', next: 'history' },
        {
          text: 'Need a hand?',
          conditions: [{ type: 'questNotStarted', questId: SCRAP_RUN }, { type: 'questCompleted', questId: 'cleared-for-transit' }],
          next: 'offer',
        },
        { text: 'Is it safe here?', next: 'safety' },
        { text: 'Goodbye.', next: null },
      ],
    },
    history: {
      speaker: 'npc',
      text: "The maintenance drones stopped taking work orders. Now they guard the scrap like it's theirs. Gloam mites got into the laundry and the culverts. Same as always: nobody up top noticed until the fabricators ran dry.",
      next: 'greeting',
    },
    safety: {
      speaker: 'npc',
      text: "This office is. Nothing past those doors will follow you in here, so if it goes badly, run back and breathe. Tram's behind me if you'd rather leave properly.",
      next: 'greeting',
    },
    offer: {
      speaker: 'npc',
      text: 'Knock down four of those drones, then bring stock out of the yard and the laundry. Ten scrap, eight cloth. I pay in scrip and in not being shouted at.',
      options: [
        { text: "I'll do it.", effects: [{ type: 'startQuest', questId: SCRAP_RUN }], next: null },
        { text: 'Not right now.', next: null },
      ],
    },
    progress: {
      speaker: 'npc',
      text: 'Drones first, stock second. The drones hit like a dropped spanner. The mites hit like a lot of dropped spanners.',
      next: null,
    },
    report: {
      speaker: 'npc',
      text: "Look at that. Fabricators fed, drones quiet. Here, scrip, and my thanks, which is rarer. Come back whenever you need stock. The yards always need clearing.",
      next: null,
    },
    thanks: {
      speaker: 'npc',
      text: 'Yards are yours whenever you want them. The drones reset, the scrap piles up. That is the job.',
      next: null,
    },
  },
};
