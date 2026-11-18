import { createStartingSkills, experienceForLevel } from '../packages/shared/src/character/skills.ts';
import { deriveCombatProfile } from '../packages/shared/src/character/derivedStats.ts';
import { creatureAttackProfile, defenceAgainst, playerAttackProfile, rollAttack } from '../packages/shared/src/combat/combatMath.ts';
import { creatureDefence } from '../packages/shared/src/combat/study.ts';
import { equipmentStats, type EquipmentState } from '../packages/shared/src/gear/equipment.ts';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
const rungs: [number, string][] = [[1, 'scrap'], [10, 'iron'], [20, 'steel'], [30, 'alloy'], [40, 'sinter'], [50, 'vault-glass']];
const keyFor = (level: number) => rungs.filter(([l]) => l <= level).at(-1)![1];
const set = (key: string, offset = 0): EquipmentState => ({ primary: `${key}-baton`, head: `${key}-helm`, torso: `${key}-plate`, hands: `${key}-gauntlets`, legs: `${key}-greaves`, feet: `${key}-boots` });
let seed = 7;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const sim = (level: number, creatureId: string, gearLevel = level, fights = 2000) => {
  const creature = GAME_CONTENT.creatures.get(creatureId)!;
  const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(level), fortitude: experienceForLevel(level) };
  const gear = set(keyFor(gearLevel));
  const attack = playerAttackProfile(skills, gear, GAME_CONTENT.items);
  const profile = deriveCombatProfile(skills, equipmentStats(gear, GAME_CONTENT.items));
  const guard = defenceAgainst(profile, creature.attack.style);
  const theirs = creatureAttackProfile(creature);
  let wins = 0, lost = 0, ticks = 0;
  for (let run = 0; run < fights; run++) {
    let mine = profile.integrity, its = creature.integrity, tick = 0;
    for (; mine > 0 && its > 0; tick++) {
      if (tick % attack.speedTicks === 0) its -= rollAttack(attack, creatureDefence(creature, attack.style, false), random).damage;
      if (its > 0 && tick % theirs.speedTicks === 0) mine -= rollAttack(theirs, guard, random).damage;
    }
    if (mine > 0) wins++;
    lost += (profile.integrity - Math.max(0, mine)) / profile.integrity; ticks += tick;
  }
  return { win: wins / fights, lost: lost / fights, ticks: ticks / fights, hp: profile.integrity, def: guard, acc: attack.accuracy, maxHit: attack.maxHit, cHp: creature.integrity, cMax: theirs.maxHit, cAcc: theirs.accuracy, cDef: creature.defence };
};
const fmt = (r: ReturnType<typeof sim>) => `win ${(r.win * 100).toFixed(0).padStart(3)}% hpLost ${(r.lost * 100).toFixed(0).padStart(3)}% ${r.ticks.toFixed(0).padStart(3)}t`;
const creatures = [...GAME_CONTENT.creatures.values()].filter((c) => c.level >= 4).sort((a, b) => a.level - b.level);
const offsets = (process.argv[2] ?? '0,-5,-10').split(',').map(Number);
for (const c of creatures) {
  const parts = offsets.map((o) => { const lv = Math.max(1, c.level + o); return `@${lv}: ${fmt(sim(lv, c.id))}`; });
  const at = sim(c.level, c.id);
  console.log(`${c.id.padEnd(16)} L${String(c.level).padStart(2)} hp${String(c.integrity).padStart(4)} max${String(c.attack.maxHit).padStart(3)} acc${String(c.attack.accuracy).padStart(3)} def${String(c.defence).padStart(3)} ${c.attack.style.padEnd(7)} | you hp${at.hp} def${at.def} acc${at.acc} max${at.maxHit} | ${parts.join(' | ')}`);
}
