import { createStartingSkills, experienceForLevel } from '../packages/shared/src/character/skills.ts';
import { deriveCombatProfile } from '../packages/shared/src/character/derivedStats.ts';
import { creatureAttackProfile, defenceAgainst, hitChance, playerAttackProfile, rollAttack } from '../packages/shared/src/combat/combatMath.ts';
import { creatureDefence } from '../packages/shared/src/combat/study.ts';
import { equipmentStats } from '../packages/shared/src/gear/equipment.ts';
import { GAME_CONTENT, tierForLevel } from '../packages/shared/src/index.ts';
import { MATERIAL_LADDER } from '../packages/shared/src/content/ward/items.ts';
const formula = (globalThis as any).process.argv[2] ?? 'cur';
const bonus = (c: any): number => {
  const L = c.level;
  if (formula === 'cur') return c.experience;
  if (formula === 'a') return L * 6 + 2 * Math.min(L, 16) ** 2 + 3 * Math.max(0, L - 14) ** 2;
  if (formula === 'b') return L * 6 + 2 * Math.min(L, 16) ** 2 + 5 * Math.max(0, L - 14) ** 2;
  if (formula === 'c') return L * 6 + 2 * Math.min(L, 16) ** 2 + 8 * Math.max(0, L - 14) ** 2;
  return c.experience;
};
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gearFor = (L: number) => { const k = [...MATERIAL_LADDER].reverse().find((m) => m.level <= L)!.key; return { primary: `${k}-baton`, head: `${k}-helm`, torso: `${k}-plate`, hands: `${k}-gauntlets`, legs: `${k}-greaves`, feet: `${k}-boots` } as any; };
const cr = [...GAME_CONTENT.creatures.values()].filter((c) => !['the-warden','the-lamplighter','training-drone','crate-wisp','line-mimic'].includes(c.id) && c.level < 50);
for (const L of [12, 15, 18, 20, 22, 25, 28, 30, 33, 35, 38, 40]) {
  const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(L), fortitude: experienceForLevel(L) };
  const gear = gearFor(L);
  const attack = playerAttackProfile(skills, gear, GAME_CONTENT.items);
  const profile = deriveCombatProfile(skills, equipmentStats(gear, GAME_CONTENT.items));
  const rows = cr.map((c) => {
    const guard = defenceAgainst(profile, c.attack.style); const theirs = creatureAttackProfile(c);
    let wins = 0; for (let f = 0; f < 300; f++) { let m = profile.integrity, i = c.integrity; for (let t = 0; m > 0 && i > 0; t++) { if (t % attack.speedTicks === 0) i -= rollAttack(attack, creatureDefence(c, attack.style, false), rnd).damage; if (i > 0 && t % theirs.speedTicks === 0) m -= rollAttack(theirs, guard, rnd).damage; } if (i <= 0) wins++; }
    const perSwing = hitChance(attack.accuracy, creatureDefence(c, attack.style, false)) * (1 + attack.maxHit) / 2;
    const ticks = (c.integrity / perSwing) * attack.speedTicks + 15;
    return { id: c.id, win: wins / 300, pm: ((c.integrity * 4 + bonus(c)) / ticks) * 200 };
  }).filter((r) => r.win >= 0.9).sort((a, b) => b.pm - a.pm);
  console.log(L, rows.slice(0, 3).map((r) => `${r.id}:${r.pm.toFixed(0)}(${r.win.toFixed(2)})`).join('  '));
}
