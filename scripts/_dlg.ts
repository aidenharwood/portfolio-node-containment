import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
for (const d of [...GAME_CONTENT.dialogues.values()].sort((a, b) => a.id.localeCompare(b.id))) console.log(d.id, d.entries.map((e) => e.node).join(','));
