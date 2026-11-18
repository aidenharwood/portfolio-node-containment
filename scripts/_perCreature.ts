import { createStartingSkills, experienceForLevel } from '../packages/shared/src/character/skills.ts';
import { deriveCombatProfile } from '../packages/shared/src/character/derivedStats.ts';
import { creatureAttackProfile, defenceAgainst, playerAttackProfile, rollAttack } from '../packages/shared/src/combat/combatMath.ts';
import { creatureDefence } from '../packages/shared/src/combat/study.ts';
import { equipmentStats } from '../packages/shared/src/gear/equipment.ts';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
const MODE = process.argv[2] ?? 'now';
const KILL = (level: number, current: number) => MODE === 'now' ? current : MODE === 'a' ? Math.round(level * 10 + level * level * 1.2) : MODE === 'b' ? Math.round(level * 6 + level * level * 2) : Math.round(level * 10 + level ** 2.3 * 0.6);
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const ids = ['canal-rat', 'pigeon', 'scrap-magpie', 'stray-dog', 'gutter-mite', 'silt-eel', 'moth-lantern', 'scrap-crawler', 'rustling', 'glass-hound'];
for (const l of [3, 6, 10, 15, 20]) {
  const g: any = l >= 10 ? { primary: 'iron-blade', head: 'iron-helm', torso: 'iron-plate', legs: 'iron-greaves', hands: 'iron-gauntlets', feet: 'iron-boots' } : { primary: 'scrap-blade', head: 'scrap-helm', torso: 'scrap-plate', legs: 'scrap-greaves' };
  if (l >= 20) { for (const k of Object.keys(g)) g[k] = g[k].replace('iron', 'steel'); }
  const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(l), fortitude: experienceForLevel(l) };
  const a = playerAttackProfile(skills, g, GAME_CONTENT.items); const p = deriveCombatProfile(skills, equipmentStats(g, GAME_CONTENT.items));
  const row: string[] = [];
  for (const id of ids) { const c = GAME_CONTENT.creatures.get(id)!; const t = creatureAttackProfile(c); const guard = defenceAgainst(p, c.attack.style);
    let w = 0, T = 0, L = 0; for (let f = 0; f < 400; f++) { let m = p.integrity, h = c.integrity, k = 0; for (; m > 0 && h > 0; k++) { if (k % a.speedTicks === 0) h -= rollAttack(a, creatureDefence(c, a.style, false), rnd).damage; if (h > 0 && k % t.speedTicks === 0) m -= rollAttack(t, guard, rnd).damage; } if (h <= 0) w++; T += k; L += p.integrity - Math.max(0, m); }
    const ticks = T / 400 + 15 + (L / 400) * 20 * 0.5; const xp = c.integrity * 4 + KILL(c.level, c.experience);
    row.push(`${id}:${(w / 4).toFixed(0)}%/${(xp / ticks * 200).toFixed(0)}`); }
  console.log('L' + l, row.join(' '));
}
