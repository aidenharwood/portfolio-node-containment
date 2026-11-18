import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
for (const id of ['officer-brandt', 'imogen-hale']) { const d = GAME_CONTENT.dialogues.get(id); console.log(id, d?.entries.map((e) => `${e.node}:${JSON.stringify(e.conditions ?? [])}`).join('\n  ')); }
