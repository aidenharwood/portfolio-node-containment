import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
for (const o of GAME_CONTENT.worldObjects.values()) for (const i of o.interactions) if (i.gather) console.log('SPOT', o.id, i.gather.skill, i.gather.level, i.gather.itemId);
for (const r of GAME_CONTENT.recipes.values()) if (/-bar$/.test(r.output.itemId)) console.log('REC', r.id, r.skill, r.level, JSON.stringify(r.inputs));
