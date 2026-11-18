import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
import { MATERIAL_LADDER } from '../packages/shared/src/content/ward/items.ts';
for (const m of MATERIAL_LADDER.slice(2, 4)) console.log(m.key, m.skirmisher, m.warden, [...GAME_CONTENT.items.values()].filter((i) => i.equipment && (i.id.startsWith(m.key + '-') || i.id.startsWith(m.skirmisher.toLowerCase() + '-') || i.id.startsWith(m.warden.toLowerCase() + '-'))).map((i) => `${i.id}:${i.value}`).join(' '));
