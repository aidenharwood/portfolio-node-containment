import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
for (const i of GAME_CONTENT.items.values()) if (i.equipment?.stats && 'insight' in i.equipment.stats) console.log(i.id, i.equipment.slot, JSON.stringify(i.equipment.stats), JSON.stringify(i.equipment.requirements ?? (i.equipment as any).requires ?? ''), i.unique ?? '');
console.log([...new Set([...GAME_CONTENT.items.values()].map((i) => i.equipment?.slot).filter(Boolean))].join(' '));
