import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
const where = new Map<string, Set<string>>();
for (const d of GAME_CONTENT.districts.values()) for (const c of d.creatures ?? []) { const s = where.get(c.creatureId) ?? new Set(); s.add(d.id); where.set(c.creatureId, s); }
for (const c of [...GAME_CONTENT.creatures.values()].sort((a, b) => a.level - b.level)) console.log(c.level, c.id, [...(where.get(c.id) ?? [])].join(','));
