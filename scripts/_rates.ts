import { createStartingSkills, experienceForLevel } from '../packages/shared/src/character/skills.ts';
import { deriveCombatProfile } from '../packages/shared/src/character/derivedStats.ts';
import { creatureAttackProfile, defenceAgainst, playerAttackProfile, rollAttack } from '../packages/shared/src/combat/combatMath.ts';
import { creatureDefence } from '../packages/shared/src/combat/study.ts';
import { equipmentStats } from '../packages/shared/src/gear/equipment.ts';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
const MODE = process.argv[2] ?? 'now';
const base = (level: number) => { const s = Math.max(0, level - 1); return Math.floor(25 * s + 18 * s ** 2.4); };
const eased = (level: number) => { const s = Math.max(0, level - 1); return Math.floor((25 * s + 18 * s ** 2.4) * Math.min(1, 0.35 + 0.65 * s / 19)); };
const curve = MODE === 'eased' ? eased : MODE === 'live' ? experienceForLevel : base;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gearFor = (l: number) => l >= 10 ? { primary: 'iron-baton', head: 'scrap-helm', torso: 'scrap-plate', legs: 'scrap-greaves' } : { primary: l >= 1 ? 'scrap-blade' : 'scrap-baton', torso: 'scrap-plate', head: 'scrap-helm', legs: 'scrap-greaves' };
function fight(l: number, id: string) {
  const c = GAME_CONTENT.creatures.get(id)!;
  const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(l), fortitude: experienceForLevel(Math.max(1, l - 1)) };
  const g = gearFor(l) as any;
  const a = playerAttackProfile(skills, g, GAME_CONTENT.items);
  const p = deriveCombatProfile(skills, equipmentStats(g, GAME_CONTENT.items));
  const guard = defenceAgainst(p, c.attack.style); const t = creatureAttackProfile(c);
  let wins = 0, ticks = 0, lost = 0; const N = 600;
  for (let f = 0; f < N; f++) { let m = p.integrity, h = c.integrity, k = 0;
    for (; m > 0 && h > 0; k++) { if (k % a.speedTicks === 0) h -= rollAttack(a, creatureDefence(c, a.style, false), rnd).damage; if (h > 0 && k % t.speedTicks === 0) m -= rollAttack(t, guard, rnd).damage; }
    if (h <= 0) wins++; ticks += k; lost += p.integrity - Math.max(0, m); }
  return { win: wins / N, ticks: ticks / N, lost: lost / N, xp: c.integrity * 4 + c.experience, regen: p.integrity };
}
const placed: Record<string, number> = {};
for (const d of GAME_CONTENT.districts.values()) for (const c of d.creatures ?? []) placed[c.creatureId] = Math.max(placed[c.creatureId] ?? 0, (d.creatures ?? []).filter(x => x.creatureId === c.creatureId).length);
const ids = ['canal-rat', 'pigeon', 'stray-dog', 'scrap-magpie', 'line-mimic', 'gutter-mite', 'silt-eel', 'the-lamplighter', 'moth-lantern', 'scrap-crawler', 'rustling'].filter(i => !['the-lamplighter','line-mimic'].includes(i));
console.log('L  xpToNext  bestCreature  win  xp/min(combat,incl 15 ticks walk + 1hp/20t regen)  min-to-next | gather min | refine-scrap min');
let total = 0;
for (let l = 1; l < 20; l++) {
  const need = curve(l + 1) - curve(l);
  let best = { id: '', rate: 0, win: 0 };
  for (const id of ids) { const r = fight(l, id); if (r.win < 0.95) continue;
    const c = GAME_CONTENT.creatures.get(id)!; const solo = r.ticks + 15 + r.lost * 20 * 0.5; const cap = (c.respawnTicks + 3 + r.ticks + 10) / (placed[id] ?? 1); const ticks = Math.max(solo, cap); const rate = r.xp / ticks * 200; if (rate > best.rate) best = { id, rate, win: r.win }; }
  const gch = Math.min(0.95, 0.5 + (l - 1) * 0.04); const gRate = 10 * gch / 4 * 200;
  const mins = need / best.rate; total += mins;
  console.log(String(l).padStart(2), String(need).padStart(6), best.id.padEnd(12), best.win.toFixed(2), best.rate.toFixed(0).padStart(5), mins.toFixed(1).padStart(6), ' cum', total.toFixed(0).padStart(4), ' | gather', (need / gRate).toFixed(1));
}
