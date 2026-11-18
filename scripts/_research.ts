import { experienceForLevel, levelForExperience } from '../packages/shared/src/character/skills.ts';
import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
import { gatherChance, depletionChance } from '../packages/shared/src/crafting/gathering.ts';
import { studyExperience } from '../packages/shared/src/combat/study.ts';
const spots = [...GAME_CONTENT.worldObjects.values()].flatMap((o) => o.interactions.flatMap((i) => i.gather && i.gather.skill === 'research' ? [{ id: o.id, ...i.gather }] : []));
for (const s of spots) console.log(s.id, 'L', s.level, 'xp', s.experience, 'charges', s.charges, 'resp', s.respawnTicks, 'deplete', depletionChance(s as any).toFixed(2));
const firstStudy = [...GAME_CONTENT.creatures.values()].map((c) => [c.id, c.level, studyExperience(c, true)] as const).sort((a, b) => a[1] - b[1]);
console.log(firstStudy.map(([id, l, x]) => `${id}:L${l}:${x}`).join(' '));
const start = Number(process.argv[2] ?? 3000), target = Number(process.argv[3] ?? 25), nodes = 3, walk = 3;
let xp = start, secs = 0;
while (levelForExperience(xp) < target) {
  const lvl = levelForExperience(xp);
  const s = spots.filter((p) => p.level <= lvl && !['vault-trace','red-trace'].includes(p.id)).sort((a, b) => b.experience - a.experience)[0];
  const p = gatherChance(s as any, lvl), d = depletionChance(s as any);
  const succPerNode = s.charges / d;
  const tNode = (succPerNode / p) * s.attemptTicks * 0.3 + walk;
  const cycle = Math.max(nodes * tNode, tNode + s.respawnTicks * 0.3);
  xp += (nodes * succPerNode * s.experience) * Math.min(1, cycle / cycle); secs += cycle;
}
console.log('from', start, 'to R', target, 'minutes', (secs / 60).toFixed(0), 'need', experienceForLevel(target) - start);
