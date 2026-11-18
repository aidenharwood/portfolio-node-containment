import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
console.log([...GAME_CONTENT.items.values()].filter((i) => i.equipment && /^(iron|oilskin|felt|steel)-/.test(i.id)).map((i) => `${i.id}:${i.value}`).join(' '));
let qp = 0; for (const q of GAME_CONTENT.quests.values()) if (q.id !== 'the-heart' && q.category !== 'tutorial') qp += q.questPoints ?? 1; console.log('QP before heart', qp);
