import type { CharacterAppearance } from '../../character/appearance.ts';
import type { DialogueDefinition } from '../../dialogue/dialogue.ts';
import type { NpcDefinition } from '../../world/entities.ts';

type Look = [physique: CharacterAppearance['physique'], skin: string, hair: CharacterAppearance['hairStyle'], hairColor: string, extra?: Partial<CharacterAppearance>];

interface Folk {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly examine: string;
  readonly look: Look;
  readonly says: string;
}

const look = ([physique, skinTone, hairStyle, hairColor, extra = {}]: Look): CharacterAppearance => ({
  physique,
  bodyType: 'average',
  height: 1,
  skinTone,
  hairStyle,
  hairColor,
  eyeColor: '#3a2a1a',
  faceMark: 'none',
  augment: 'none',
  ...extra,
});

const FOLK: readonly Folk[] = [
  { id: 'range-master-brandt', name: 'Range Master Ilse Brandt', title: 'Kestrel ranges', examine: 'Ear defenders round her neck and a stopwatch on a lanyard. She has never once looked surprised.', look: ['female', '#d8b090', 'crop', '#8a8a8a', { bodyType: 'broad', faceMark: 'scarCheek' }], says: 'Firing Line and Range Road are mine. If it moves out there, it is either a target or a recruit who did not listen.' },
  { id: 'archivist-okafor', name: 'Nell Okafor', title: 'Keeper of the Meridian manifest', examine: 'Carries a ledger older than Rustwater, bound in hull plate, and writes in it in pencil so she can be wrong gently.', look: ['female', '#5a3422', 'braids', '#d8d2c4', { bodyType: 'slight', augment: 'ocularImplant' }], says: 'Twelve thousand souls came down on the Meridian. Rustwater has names for nine thousand. I would like the rest.' },
  { id: 'surveyor-idris', name: 'Idris Vell', title: 'Pylon surveyor', examine: 'A Directorate surveyor with a tuning fork on every finger of one glove. The other glove is for shaking hands.', look: ['male', '#a86f4c', 'swept', '#2a1a10', { augment: 'circuitTrace' }], says: 'The pylons of the Quiet still carry a line from the Choir to the Drop. Half of them are out of tune. The other half are out of tune on purpose.' },
  { id: 'reprint-adebayo', name: 'Femi Adebayo', title: 'Sluice hand, Harrowgate', examine: 'Works the terrace sluices and whistles the Directorate march without knowing what it is.', look: ['male', '#5a3a28', 'crop', '#1a1a1a', { bodyType: 'broad' }], says: 'I came up the road two springs ago with no boots and a Kestrel haircut. The co-op gave me a spade. I never asked for the rest.' },
  { id: 'reprint-sola', name: 'Sola Brightwater', title: 'Glasshouse regular', examine: 'Her face is on a Combine advert two streets over. She has never been photographed.', look: ['female', '#c69a70', 'undercut', '#ff4fa8', { augment: 'circuitTrace' }], says: 'Do not tell me I look like the girl on the billboard. I know. She smiles more.' },
  { id: 'reprint-marek', name: 'Marek Ilic', title: 'Cutter, Rustwater', examine: 'Cuts hull plate with a torch and his eyes shut. Says he knows the ship by its voice.', look: ['male', '#c8a080', 'shaved', '#3a3a3a', { augment: 'respirator', faceMark: 'burnMark' }], says: 'The rustlings talk in the night. One of them talks in my voice. I would like it to stop, or to tell me what I said.' },
  { id: 'reprint-yusuf', name: 'Brother Yusuf', title: 'Pilgrim, the Choir', examine: 'A pilgrim who sings in two voices at once and apologises for both.', look: ['male', '#a8775a', 'long', '#1a1a1a', { bodyType: 'slight' }], says: 'I walked out onto the glass the day I arrived and heard myself already singing. The Choir took me in. They take in anyone who can hold a note.' },
  { id: 'reprint-cass', name: 'Corporal Cass Moreno', title: 'Last Post sentry', examine: 'Stands the night watch on the Spindle side and logs every light. Her service number is two years older than her boots.', look: ['female', '#e0b898', 'bun', '#3a2a20', { augment: 'neuralPort' }], says: 'Thirty-one went into Tallow. I have been counting the ones who came back out. I keep getting a number I do not like.' },
];

export const QUEST_FOLK_NPCS: readonly NpcDefinition[] = FOLK.map((wanderer) => ({
  id: wanderer.id,
  name: wanderer.name,
  title: wanderer.title,
  examine: wanderer.examine,
  appearance: look(wanderer.look),
  gear: [],
  dialogueId: wanderer.id,
  wanderRadius: 0,
}));

export const QUEST_FOLK_DIALOGUES: readonly DialogueDefinition[] = FOLK.map((wanderer) => ({
  id: wanderer.id,
  entries: [{ node: 'start' }],
  nodes: { start: { speaker: 'npc', text: wanderer.says, options: [{ text: 'Goodbye.', next: null }] } },
}));
