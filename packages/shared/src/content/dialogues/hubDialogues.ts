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
        { text: 'Thanks, Doc.', next: null },
      ],
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
