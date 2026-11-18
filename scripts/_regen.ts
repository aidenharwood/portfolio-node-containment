import { createStartingSkills, experienceForLevel } from '../packages/shared/src/character/skills.ts';
import { deriveCombatProfile } from '../packages/shared/src/character/derivedStats.ts';
import { creatureAttackProfile, defenceAgainst, hitChance, playerAttackProfile } from '../packages/shared/src/combat/combatMath.ts';
import { creatureDefence } from '../packages/shared/src/combat/study.ts';
import { equipmentStats } from '../packages/shared/src/gear/equipment.ts';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
const share = Number(process.argv[2] ?? 0), cap = Number(process.argv[3] ?? 99), coef = Number(process.argv[4] ?? 3);
const bonus = (L: number) => L * 6 + 2 * Math.min(L, 16) ** 2 + coef * Math.max(0, Math.min(L, cap) - 14) ** 2;
const set = (k: string) => ({ primary: `${k}-baton`, head: `${k}-helm`, torso: `${k}-plate`, hands: `${k}-gauntlets`, legs: `${k}-greaves`, feet: `${k}-boots` }) as any;
for (const [L, k] of [[20, 'steel'], [25, 'steel'], [30, 'alloy'], [35, 'alloy']] as const) {
  const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(L), fortitude: experienceForLevel(L) };
  const attack = playerAttackProfile(skills, set(k), GAME_CONTENT.items);
  const prof = deriveCombatProfile(skills, equipmentStats(set(k), GAME_CONTENT.items));
  const per = Math.max(1, Math.round(prof.integrity * share));
  const row = ['scrap-crawler', 'rustling', 'glass-hound', 'hull-knocker', 'tide-wraith', 'cordon-stalker'].map((id) => {
    const c = GAME_CONTENT.creatures.get(id)!;
    const perSwing = hitChance(attack.accuracy, creatureDefence(c, attack.style, false)) * (1 + attack.maxHit) / 2;
    const fight = (c.integrity / perSwing) * attack.speedTicks;
    const t = creatureAttackProfile(c);
    const taken = (fight / t.speedTicks) * hitChance(t.accuracy, defenceAgainst(prof, c.attack.style)) * (1 + t.maxHit) / 2;
    const regen = taken > 0 ? Math.max(0, (taken / per) * 20 + 16 - 15) : 0;
    const pm = ((c.integrity * 4 + bonus(c.level)) / (fight + 15 + regen)) * 200;
    return `${id.slice(0, 8)}:${pm.toFixed(0)}(-${taken.toFixed(0)})`;
  });
  console.log(L, k, 'hp', prof.integrity, 'regen/int', per, row.join(' '));
}
