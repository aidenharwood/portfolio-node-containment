import { experienceForLevel, levelForExperience } from '../packages/shared/src/character/skills.ts';
import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
console.log('lvl xp delta');
for (const l of [2,3,4,5,6,8,10,12,15,18,20,25,30,35,40,50]) console.log(l, experienceForLevel(l), experienceForLevel(l)-experienceForLevel(l-1));
const totals: Record<string, number> = {};
for (const q of GAME_CONTENT.quests.values()) {
  const xs = q.rewards.filter((e: any) => e.type === 'grantExperience').map((e: any) => `${e.skill}:${e.amount}`);
  const scrip = q.rewards.filter((e: any) => e.type === 'giveItem' && e.itemId === 'meridian-scrip').reduce((s: number, e: any) => s + (e.count ?? 1), 0);
  console.log(q.id.padEnd(16), q.category, 'rec', q.recommendedLevel ?? '-', 'req', JSON.stringify(q.offerRequires ?? []), xs.join(' '), 'scrip', scrip);
}
console.log('levels from 300xp', levelForExperience(300), '500', levelForExperience(500), '800', levelForExperience(800), '1200', levelForExperience(1200), '2000', levelForExperience(2000));
for (const c of GAME_CONTENT.creatures.values()) console.log(c.id.padEnd(16), 'L', c.level, 'hp', c.integrity, 'def', c.defence, 'atk', JSON.stringify(c.attack), 'xp', c.experience, 'aggr', c.aggressive ?? false, 'resp', c.respawnTicks);
for (const s of GAME_CONTENT.shops.values()) console.log('SHOP', s.id, JSON.stringify((s as any).listings ?? (s as any).stock));
