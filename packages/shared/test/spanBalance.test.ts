import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStartingSkills, experienceForLevel, levelForExperience, SKILL_LEVEL_CAP } from '../src/character/skills.ts';
import { deriveCombatProfile } from '../src/character/derivedStats.ts';
import { creatureAttackProfile, defenceAgainst, hitChance, killValue, playerAttackProfile, rollAttack } from '../src/combat/combatMath.ts';
import { creatureDefence, FIRST_STUDY_KILL_SHARE, studyExperience, weaknessOf } from '../src/combat/study.ts';
import { REGENERATION_INTERVAL_TICKS, regenerationPerInterval } from '../src/combat/regeneration.ts';
import { COMBAT_STYLE_INFO, WEAPON_KIND_INFO, styleBeating, type WeaponKind } from '../src/combat/weapons.ts';
import { equipmentStats, type EquipmentState } from '../src/gear/equipment.ts';
import { GAME_CONTENT, containmentExperience, containmentLevelFor, objectiveDistricts, realignedProgress, tierForLevel, type ItemDefinition } from '../src/index.ts';
import { gatheringSourcesOf } from '../src/content/craftingIntegrity.ts';
import { ladderArmourId, ladderWeaponId, MATERIAL_LADDER } from '../src/content/catalog/items.ts';
import { standardIntegrity } from '../src/content/catalog/creatureKit.ts';
import { encounterExperience } from '../src/content/span/creatures.ts';

const statTotal = (item: ItemDefinition | undefined): number => Object.values(item?.equipment?.stats ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);

test('creatures never outrank the tier of the ground they live on', () => {
  for (const district of GAME_CONTENT.districts.values()) {
    for (const placement of district.creatures ?? []) {
      const creature = GAME_CONTENT.creatures.get(placement.creatureId);
      assert.ok(creature);
      assert.ok(tierForLevel(creature.level) <= district.tier, `${creature.id} (level ${creature.level}) is too strong for ${district.id} (tier ${district.tier})`);
    }
  }
});

const LADDER_WEAPONS: readonly WeaponKind[] = ['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator'];

const BODY_SLOTS = ['head', 'torso', 'hands', 'legs', 'feet'] as const;

test('every weapon and armour piece gets stronger at each rung of the material ladder', () => {
  for (let rung = 1; rung < MATERIAL_LADDER.length; rung++) {
    const lower = MATERIAL_LADDER[rung - 1]!;
    const upper = MATERIAL_LADDER[rung]!;
    assert.ok(upper.level > lower.level);
    for (const kind of LADDER_WEAPONS) {
      const upperId = ladderWeaponId(upper, kind);
      const lowerId = ladderWeaponId(lower, kind);
      assert.ok(statTotal(GAME_CONTENT.items.get(upperId)) > statTotal(GAME_CONTENT.items.get(lowerId)), `${upperId} beats ${lowerId}`);
    }
    for (const slot of BODY_SLOTS) {
      const upperId = ladderArmourId(upper, 'bulwark', slot);
      const lowerId = ladderArmourId(lower, 'bulwark', slot);
      assert.ok(statTotal(GAME_CONTENT.items.get(upperId)) > statTotal(GAME_CONTENT.items.get(lowerId)), `${upperId} beats ${lowerId}`);
    }
  }
});

test('gathering pays more experience the higher the spot', () => {
  const bySkill = new Map<string, { level: number; experience: number }[]>();
  for (const object of GAME_CONTENT.worldObjects.values()) {
    for (const source of gatheringSourcesOf(GAME_CONTENT, object.id)) {
      bySkill.set(source.skill, [...(bySkill.get(source.skill) ?? []), { level: source.level, experience: source.experience }]);
    }
  }
  for (const [skill, sources] of bySkill) {
    const sorted = [...sources].sort((a, b) => a.level - b.level);
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1]!;
      const current = sorted[index]!;
      if (current.level > previous.level) assert.ok(current.experience > previous.experience, `${skill} level ${current.level} pays more than level ${previous.level}`);
    }
  }
});

test('profession rewards stay within half a level at their unlock level', () => {
  const professionSkills = new Set(['engineering', 'refining', 'salvage', 'biochemistry']);
  const nextLevelExperience = (level: number) => experienceForLevel(level + 1) - experienceForLevel(level);
  for (const recipe of GAME_CONTENT.recipes.values()) {
    if (!professionSkills.has(recipe.skill)) continue;
    assert.ok(
      recipe.experience <= nextLevelExperience(recipe.level) / 2,
      `${recipe.id} grants ${recipe.experience} XP at level ${recipe.level}, more than half of the ${nextLevelExperience(recipe.level)} XP level step`,
    );
  }
  for (const object of GAME_CONTENT.worldObjects.values()) {
    for (const source of gatheringSourcesOf(GAME_CONTENT, object.id)) {
      if (!professionSkills.has(source.skill)) continue;
      assert.ok(
        source.experience <= nextLevelExperience(source.level) / 2,
        `${object.id} grants ${source.experience} XP at level ${source.level}, more than half of the ${nextLevelExperience(source.level)} XP level step`,
      );
    }
  }
});

for (const kind of ['food', 'medicine'] as const) {
  test(`higher ${kind} heals more`, () => {
    const healing = [...GAME_CONTENT.recipes.values()]
      .map((recipe) => ({ level: recipe.level, consumable: GAME_CONTENT.items.get(recipe.output.itemId)?.consumable }))
      .filter((entry) => entry.consumable?.kind === kind)
      .map((entry) => ({ level: entry.level, heal: entry.consumable!.heal }))
      .sort((a, b) => a.level - b.level);
    for (let index = 1; index < healing.length; index++) assert.ok(healing[index]!.heal >= healing[index - 1]!.heal, `level ${healing[index]!.level} heals at least as much as level ${healing[index - 1]!.level}`);
  });
}

test('medicine heals less than half of the food at its level', () => {
  const foods = [...GAME_CONTENT.recipes.values()].filter((recipe) => GAME_CONTENT.items.get(recipe.output.itemId)?.consumable?.kind === 'food');
  for (const recipe of GAME_CONTENT.recipes.values()) {
    const medicine = GAME_CONTENT.items.get(recipe.output.itemId)?.consumable;
    if (medicine?.kind !== 'medicine') continue;
    const best = Math.max(...foods.filter((food) => food.level <= recipe.level).map((food) => GAME_CONTENT.items.get(food.output.itemId)!.consumable!.heal));
    assert.ok(medicine.heal * 2 <= best + 1, `${recipe.output.itemId} heals ${medicine.heal} against food ${best}`);
  }
});

test('standard-integrity creatures give more experience at higher levels', () => {
  const creatures = [...GAME_CONTENT.creatures.values()]
    .filter((creature) => creature.integrity === standardIntegrity(creature.level))
    .sort((a, b) => a.level - b.level);
  for (let index = 1; index < creatures.length; index++) {
    const previous = creatures[index - 1]!;
    const current = creatures[index]!;
    if (current.level > previous.level) assert.ok(current.experience > previous.experience, `${current.id} rewards more than ${previous.id}`);
  }
});

const questPointsOf = (quest: { readonly questPoints?: number; readonly category: string }): number => quest.questPoints ?? (quest.category === 'tutorial' ? 0 : 1);

const STORYLINES = () => [...GAME_CONTENT.questlines.values()].filter((questline) => questline.kind === 'main');

const STORY_CHAPTERS = (): string[] => STORYLINES().flatMap((questline) => questline.questIds);

const predecessorsOf = (questId: string): string[] => {
  const before: string[] = [];
  let current = questId;
  for (;;) {
    const previous = [...GAME_CONTENT.quests.values()].find((quest) => quest.followUpQuestId === current && !before.includes(quest.id) && quest.id !== questId);
    if (!previous) return before;
    before.push(previous.id);
    current = previous.id;
  }
};

test('every quest-point gate, the finale included, asks no more than the other quests offer', () => {
  for (const quest of GAME_CONTENT.quests.values()) {
    const available = [...GAME_CONTENT.quests.values()].filter((other) => other.id !== quest.id).reduce((sum, other) => sum + questPointsOf(other), 0);
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        if (objective.type === 'reach' && objective.measure === 'questPoints') assert.ok(objective.level <= available, `${quest.id}/${step.id} asks ${objective.level} of the ${available} quest points on offer elsewhere`);
      }
    }
  }
});

const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const typicalFortitude = (n: number): number => levelForExperience(experienceForLevel(n) / 2);

interface Operative {
  readonly closeQuarters: number;
  readonly fortitude: number;
  readonly gear: EquipmentState;
}

function gauntletWinRate(operative: Operative, creatureId: string, count: number, healBetween = 0, fights = 2000): number {
  const creature = GAME_CONTENT.creatures.get(creatureId);
  assert.ok(creature, creatureId);
  const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(operative.closeQuarters), fortitude: experienceForLevel(operative.fortitude) };
  const attack = playerAttackProfile(skills, operative.gear, GAME_CONTENT.items);
  const profile = deriveCombatProfile(skills, equipmentStats(operative.gear, GAME_CONTENT.items));
  const guard = defenceAgainst(profile, creature.attack.style);
  const theirs = creatureAttackProfile(creature);
  const random = mulberry(creature.level * 7919 + operative.closeQuarters + count * 31);
  let wins = 0;
  for (let run = 0; run < fights; run++) {
    let mine = profile.integrity;
    for (let fight = 0; fight < count && mine > 0; fight++) {
      if (fight > 0) mine = Math.min(profile.integrity, mine + healBetween);
      let its = creature.integrity;
      for (let tick = 0; mine > 0 && its > 0; tick++) {
        if (tick % attack.speedTicks === 0) its -= rollAttack(attack, creatureDefence(creature, attack.style, false), random).damage;
        if (its > 0 && tick % theirs.speedTicks === 0) mine -= rollAttack(theirs, guard, random).damage;
      }
    }
    if (mine > 0) wins++;
  }
  return wins / fights;
}

const winRate = (operative: Operative, creatureId: string, fights = 2000): number => gauntletWinRate(operative, creatureId, 1, 0, fights);

const KIT: EquipmentState = { primary: 'scrap-shock-baton', torso: 'scrap-carapace' };
const SCRAP_SET: EquipmentState = { primary: 'scrap-shock-baton', head: 'scrap-helmet', torso: 'scrap-carapace', legs: 'scrap-legguards' };
const IRON_SET: EquipmentState = { primary: 'ferro-shock-baton', head: 'ferro-helmet', torso: 'ferro-carapace', hands: 'ferro-gauntlets', legs: 'ferro-legguards', feet: 'ferro-mag-boots' };

const BANDS: readonly { readonly name: string; readonly operative: Operative; readonly creature: string; readonly min: number; readonly max: number }[] = [
  { name: 'a fresh operative in the issue kit beats lawn rats', operative: { closeQuarters: 1, fortitude: 1, gear: KIT }, creature: 'lawn-rat', min: 0.95, max: 1 },
  { name: 'a fresh operative in the issue kit beats courtyard gulls', operative: { closeQuarters: 1, fortitude: 1, gear: KIT }, creature: 'courtyard-gull', min: 0.95, max: 1 },
  { name: 'a fresh operative is not yet safe against grounds mites', operative: { closeQuarters: 1, fortitude: 1, gear: KIT }, creature: 'grounds-mite', min: 0, max: 0.85 },
  { name: 'combat level 4 in the issue kit handles grounds mites', operative: { closeQuarters: 5, fortitude: 3, gear: KIT }, creature: 'grounds-mite', min: 0.95, max: 1 },
  { name: 'Close Quarters 6 in scrap handles furrow eels', operative: { closeQuarters: 6, fortitude: 5, gear: SCRAP_SET }, creature: 'furrow-eel', min: 0.85, max: 1 },
  { name: 'the Orchard Keeper turns back an operative still in scrap', operative: { closeQuarters: 18, fortitude: 14, gear: SCRAP_SET }, creature: 'orchard-keeper', min: 0, max: 0.4 },
  { name: 'the Orchard Keeper falls to the same operative in ferro', operative: { closeQuarters: 18, fortitude: 14, gear: IRON_SET }, creature: 'orchard-keeper', min: 0.75, max: 0.97 },
  { name: 'the upper Harrow terraces are no place for Close Quarters 8 in scrap', operative: { closeQuarters: 8, fortitude: 6, gear: SCRAP_SET }, creature: 'thornback', min: 0, max: 0.25 },
  { name: 'a ferro blade at Close Quarters 10 handles thornbacks', operative: { closeQuarters: 10, fortitude: 7, gear: { ...SCRAP_SET, primary: 'ferro-monoblade' } }, creature: 'thornback', min: 0.8, max: 1 },
  { name: 'an operative at 10 in ferro clears seed mites', operative: { closeQuarters: 10, fortitude: 10, gear: IRON_SET }, creature: 'seed-mite', min: 0.9, max: 1 },
];

for (const band of BANDS) {
  test(`balance: ${band.name}`, () => {
    const rate = winRate(band.operative, band.creature);
    assert.ok(rate >= band.min && rate <= band.max, `${band.creature}: ${(rate * 100).toFixed(1)}% is outside ${band.min * 100}-${band.max * 100}%`);
  });
}

test('ladder weapons carry only the offence stat their style uses, and the blade outhits the baton', () => {
  for (const rung of MATERIAL_LADDER) {
    for (const kind of LADDER_WEAPONS) {
      const item = GAME_CONTENT.items.get(ladderWeaponId(rung, kind));
      const weapon = item?.equipment?.weapon;
      assert.ok(item && weapon, ladderWeaponId(rung, kind));
      const offence = COMBAT_STYLE_INFO[WEAPON_KIND_INFO[weapon.kind].style].offenceStat;
      assert.deepEqual(Object.keys(item.equipment?.stats ?? {}), [offence], `${item.id} carries only ${offence}`);
    }
    const power = (kind: WeaponKind) => GAME_CONTENT.items.get(ladderWeaponId(rung, kind))?.equipment?.stats.power ?? 0;
    assert.ok(power('blade') > power('baton'), `${rung.key} blade outhits the baton`);
    assert.ok(power('maul') > power('blade'), `${rung.key} maul outhits the blade`);
  }
});

test('every storyline hands each chapter straight to the next, and the first quest leads into one', () => {
  const start = GAME_CONTENT.newCharacter.startingQuestId ?? '';
  assert.ok(GAME_CONTENT.quests.get(start), start);
  const questlines = STORYLINES();
  assert.ok(questlines.some((questline) => questline.questIds[0] === start || questline.questIds[0] === GAME_CONTENT.quests.get(start)?.followUpQuestId), `${start} opens no storyline`);
  for (const questline of questlines) {
    for (const [index, questId] of questline.questIds.slice(0, -1).entries()) {
      assert.equal(GAME_CONTENT.quests.get(questId)?.followUpQuestId, questline.questIds[index + 1], `${questline.id}: ${questId} leads on`);
    }
  }
});

test('three grounds mites back to back are risky without food and safe eating smoked eels between fights', () => {
  const eel = GAME_CONTENT.items.get('smoked-eel')?.consumable?.heal ?? 0;
  assert.ok(eel > 0);
  const fresh: Operative = { closeQuarters: 4, fortitude: 3, gear: KIT };
  const recommended: Operative = { closeQuarters: 6, fortitude: 4, gear: KIT };
  assert.ok(gauntletWinRate(fresh, 'grounds-mite', 3) < 0.3, 'the warning to eat is earned');
  assert.ok(gauntletWinRate(fresh, 'grounds-mite', 3, 2 * eel) >= 0.95, 'two eels between fights carry a fresh operative through');
  assert.ok(gauntletWinRate(recommended, 'grounds-mite', 3, eel) >= 0.95, 'one eel between fights is enough at the recommended level');
});

test('quest rewards hand out only craftable, non-unique gear and consumables', () => {
  for (const quest of GAME_CONTENT.quests.values()) {
    for (const effect of quest.rewards) {
      if (effect.type !== 'giveItem') continue;
      const item = GAME_CONTENT.items.get(effect.itemId);
      if (!item?.equipment && !item?.consumable) continue;
      assert.ok(!item.unique, `${quest.id} rewards unique ${item.id}`);
      assert.ok([...GAME_CONTENT.recipes.values()].some((recipe) => recipe.output.itemId === item.id), `${quest.id} rewards ${item.id}, which has no recipe`);
    }
  }
});

test('a story chapter that has you craft its own item pays most of the skill beforehand or gates on it first', () => {
  for (const questId of STORY_CHAPTERS()) {
    const quest = GAME_CONTENT.quests.get(questId);
    assert.ok(quest, questId);
    const before = predecessorsOf(quest.id);
    const gates = new Map<string, number>();
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        if (objective.type !== 'craft') continue;
        const item = GAME_CONTENT.items.get(objective.itemId);
        const recipe = [...GAME_CONTENT.recipes.values()].find((entry) => entry.output.itemId === objective.itemId);
        if (item?.category !== 'quest' || !recipe || recipe.level <= 1) continue;
        if ((gates.get(recipe.skill) ?? 0) >= recipe.level) continue;
        const paid = before.flatMap((id) => GAME_CONTENT.quests.get(id)?.rewards ?? []).reduce((sum, effect) => sum + (effect.type === 'grantExperience' && effect.skill === recipe.skill ? effect.amount : 0), 0);
        assert.ok(paid >= 0.75 * experienceForLevel(recipe.level), `${quest.id}/${step.id} crafts ${item.id} at ${recipe.skill} ${recipe.level}: earlier quests pay ${paid} of ${experienceForLevel(recipe.level)} XP`);
      }
      for (const objective of step.objectives) {
        if (objective.type === 'reach') gates.set(objective.measure, Math.max(gates.get(objective.measure) ?? 0, objective.level));
      }
    }
  }
});

test('tier-1 food sells for no more than 1.5 scrip per point healed', () => {
  for (const shop of GAME_CONTENT.shops.values()) {
    if (shop.currency) continue;
    for (const listing of shop.listings) {
      const recipe = [...GAME_CONTENT.recipes.values()].find((entry) => entry.output.itemId === listing.itemId);
      const food = GAME_CONTENT.items.get(listing.itemId)?.consumable;
      if (!recipe || recipe.level >= 5 || food?.kind !== 'food') continue;
      assert.ok(listing.price <= food.heal * 1.5, `${shop.id} sells ${listing.itemId} at ${listing.price} for ${food.heal} integrity`);
    }
  }
});

test('Kit Order counts every scrap piece a fabricator makes', () => {
  const kitOrder = GAME_CONTENT.contracts.get('daily:kit-order');
  assert.ok(kitOrder && kitOrder.objective.type === 'craft');
  const counted = new Set(kitOrder.objective.itemIds);
  for (const recipe of GAME_CONTENT.recipes.values()) {
    if (recipe.station !== 'fabricator' || recipe.level !== 1 || !GAME_CONTENT.items.get(recipe.output.itemId)?.equipment) continue;
    assert.ok(counted.has(recipe.output.itemId), `Kit Order misses ${recipe.output.itemId}`);
  }
});

test('the maul hits at least as hard per tick as the blade at every rung', () => {
  for (const rung of MATERIAL_LADDER) {
    const perTick = (kind: WeaponKind) => {
      const item = GAME_CONTENT.items.get(ladderWeaponId(rung, kind));
      const weapon = item?.equipment?.weapon;
      assert.ok(item && weapon);
      const rating = rung.level + (item.equipment?.stats.power ?? 0);
      const maxHit = 1 + Math.floor((rating * WEAPON_KIND_INFO[weapon.kind].damageScale) / 4);
      return (hitChance(rating, rung.level) * (1 + maxHit) / 2) / weapon.speedTicks;
    };
    assert.ok(perTick('maul') >= perTick('blade'), `${rung.key} maul ${perTick('maul').toFixed(3)} against blade ${perTick('blade').toFixed(3)}`);
  }
});

const COLUMNS: readonly { readonly name: string; readonly tiers: readonly [number, number] }[] = [
  { name: 'Kestrel', tiers: [1, 2] },
  { name: 'Harrow', tiers: [3, 5] },
  { name: 'Halcyon', tiers: [6, 7] },
  { name: 'Wreckfield', tiers: [8, 9] },
  { name: 'Glass Steppe', tiers: [10, 11] },
  { name: 'Spindle', tiers: [12, 13] },
];

const homeTiers = (): Map<string, number> => {
  const tiers = new Map<string, number>();
  for (const district of GAME_CONTENT.districts.values()) {
    for (const placement of district.creatures ?? []) tiers.set(placement.creatureId, Math.max(tiers.get(placement.creatureId) ?? 0, district.tier));
  }
  return tiers;
};

const isBoss = (creatureId: string): boolean => Boolean(GAME_CONTENT.creatures.get(creatureId)?.encounter);

const residentsOf = (column: (typeof COLUMNS)[number]): string[] =>
  [...homeTiers()].filter(([id, tier]) => !isBoss(id) && tier >= column.tiers[0] && tier <= column.tiers[1]).map(([id]) => id);

test('the strongest creature of Kestrel and Harrow an operative can safely farm pays within a tenth of the best experience per minute', () => {
  const operative: Operative = { closeQuarters: 10, fortitude: 10, gear: IRON_SET };
  const candidates = [...residentsOf(COLUMNS[0]!), ...residentsOf(COLUMNS[1]!)];
  const perMinute = (creatureId: string): number => {
    const creature = GAME_CONTENT.creatures.get(creatureId);
    assert.ok(creature);
    const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(operative.closeQuarters), fortitude: experienceForLevel(operative.fortitude) };
    const attack = playerAttackProfile(skills, operative.gear, GAME_CONTENT.items);
    const perSwing = hitChance(attack.accuracy, creatureDefence(creature, attack.style, false)) * (1 + attack.maxHit) / 2;
    const ticks = (creature.integrity / perSwing) * attack.speedTicks + 15;
    return ((killValue(creature)) / ticks) * 200;
  };
  const safe = candidates.filter((id) => winRate(operative, id, 1000) >= 0.95);
  const strongest = safe.reduce((top, id) => (GAME_CONTENT.creatures.get(id)!.level > GAME_CONTENT.creatures.get(top)!.level ? id : top));
  const best = candidates.reduce((top, id) => (perMinute(id) > perMinute(top) ? id : top));
  assert.ok(perMinute(strongest) >= perMinute(best) * 0.9, `${best} pays ${perMinute(best).toFixed(1)} a minute against ${strongest}'s ${perMinute(strongest).toFixed(1)}`);
});

type Style = keyof typeof COMBAT_STYLE_INFO;

const STYLES = Object.keys(COMBAT_STYLE_INFO) as Style[];

const LINE_KIT: Readonly<Record<Style, { readonly weapon: WeaponKind; readonly weapons: readonly WeaponKind[] }>> = {
  melee: { weapon: 'baton', weapons: ['baton', 'blade', 'maul'] },
  ranged: { weapon: 'pistol', weapons: ['pistol', 'carbine', 'rifle'] },
  psionic: { weapon: 'focus', weapons: ['focus', 'resonator'] },
};

const rungAt = (level: number) => MATERIAL_LADDER.filter((rung) => rung.level <= level).at(-1)!;

function strongestWeapon(style: Style, rung: (typeof MATERIAL_LADDER)[number], level: number): WeaponKind {
  const perTick = (kind: WeaponKind): number => {
    const weapon = GAME_CONTENT.items.get(ladderWeaponId(rung, kind))?.equipment;
    assert.ok(weapon?.weapon, ladderWeaponId(rung, kind));
    const rating = level + Object.values(weapon.stats).reduce((sum, value) => sum + (value ?? 0), 0);
    const maxHit = 1 + Math.floor((rating * WEAPON_KIND_INFO[weapon.weapon.kind].damageScale) / 4);
    return (hitChance(rating, level) * (1 + maxHit)) / 2 / weapon.weapon.speedTicks;
  };
  return LINE_KIT[style].weapons.reduce((top, kind) => (perTick(kind) > perTick(top) ? kind : top));
}

function lineGear(style: Style, level: number, strongest = false): EquipmentState {
  const rung = rungAt(level);
  const kit = LINE_KIT[style];
  const pieces = Object.fromEntries(BODY_SLOTS.map((slot) => [slot, ladderArmourId(rung, COMBAT_STYLE_INFO[style].line, slot)]));
  const gear = { primary: ladderWeaponId(rung, strongest ? strongestWeapon(style, rung, level) : kit.weapon), ...pieces };
  for (const itemId of Object.values(gear)) assert.ok(GAME_CONTENT.items.get(itemId), `${itemId} exists`);
  return gear;
}

const lineSkills = (style: Style, level: number) => ({ ...createStartingSkills(), [COMBAT_STYLE_INFO[style].skill]: experienceForLevel(level), fortitude: experienceForLevel(typicalFortitude(level)) });

function lineFight(style: Style, level: number, creatureId: string, strongest = false, fights = 1500): { win: number; lost: number } {
  const creature = GAME_CONTENT.creatures.get(creatureId);
  assert.ok(creature, creatureId);
  const gear = lineGear(style, level, strongest);
  const skills = lineSkills(style, level);
  const attack = playerAttackProfile(skills, gear, GAME_CONTENT.items);
  assert.equal(attack.style, style);
  const profile = deriveCombatProfile(skills, equipmentStats(gear, GAME_CONTENT.items));
  const guard = defenceAgainst(profile, creature.attack.style);
  const theirs = creatureAttackProfile(creature);
  const random = mulberry(creature.level * 104729 + level);
  let wins = 0;
  let lost = 0;
  for (let run = 0; run < fights; run++) {
    let mine = profile.integrity;
    let its = creature.integrity;
    for (let tick = 0; mine > 0 && its > 0; tick++) {
      if (tick % attack.speedTicks === 0) its -= rollAttack(attack, creatureDefence(creature, attack.style, false), random).damage;
      if (its > 0 && tick % theirs.speedTicks === 0) mine -= rollAttack(theirs, guard, random).damage;
    }
    if (mine > 0) wins++;
    lost += (profile.integrity - Math.max(0, mine)) / profile.integrity;
  }
  return { win: wins / fights, lost: lost / fights };
}

const plateFight = (level: number, creatureId: string): { win: number; lost: number } => lineFight('melee', level, creatureId);

function linePace(style: Style, level: number, creatureId: string, gearLevel = level, strongest = false): number {
  const creature = GAME_CONTENT.creatures.get(creatureId);
  assert.ok(creature, creatureId);
  const gear = lineGear(style, gearLevel, strongest);
  const skills = lineSkills(style, level);
  const attack = playerAttackProfile(skills, gear, GAME_CONTENT.items);
  const profile = deriveCombatProfile(skills, equipmentStats(gear, GAME_CONTENT.items));
  const fight = (creature.integrity / (hitChance(attack.accuracy, creatureDefence(creature, attack.style, false)) * (1 + attack.maxHit) / 2)) * attack.speedTicks;
  const theirs = creatureAttackProfile(creature);
  const taken = (fight / theirs.speedTicks) * hitChance(theirs.accuracy, defenceAgainst(profile, creature.attack.style)) * (1 + theirs.maxHit) / 2;
  const healing = (taken / regenerationPerInterval(profile.integrity)) * REGENERATION_INTERVAL_TICKS;
  return ((killValue(creature)) / (fight + Math.max(15, healing))) * 200;
}

const farmable = (): string[] => {
  const spots = new Map<string, number>();
  for (const district of GAME_CONTENT.districts.values()) {
    for (const placement of district.creatures ?? []) spots.set(placement.creatureId, (spots.get(placement.creatureId) ?? 0) + 1);
  }
  return [...spots].filter(([, count]) => count >= 2).map(([id]) => id);
};

const bestSafeFarm = (creatures: readonly string[], styles: readonly Style[], level: number) =>
  creatures
    .flatMap((id) => styles.map((style) => ({ id, style, ...lineFight(style, level, id, true), pace: linePace(style, level, id, level, true) })))
    .filter((fight) => fight.win >= 0.95 && fight.lost <= 0.6)
    .sort((a, b) => b.pace - a.pace)[0];

test('bosses and elites pay the encounter share of kill experience, outrank everything placed with them and drop a unique', () => {
  for (const creature of GAME_CONTENT.creatures.values()) {
    if (!creature.encounter) continue;
    assert.equal(creature.experience, encounterExperience(creature.level, creature.integrity), `${creature.id} pays the encounter share`);
    assert.ok(creature.loot.some((drop) => GAME_CONTENT.items.get(drop.itemId)?.unique && drop.chance < 1), `${creature.id} drops a unique`);
  }
  for (const district of GAME_CONTENT.districts.values()) {
    const placed = (district.creatures ?? []).map((placement) => GAME_CONTENT.creatures.get(placement.creatureId)!);
    const top = Math.max(0, ...placed.filter((creature) => !creature.encounter).map((creature) => creature.level));
    for (const creature of placed.filter((entry) => entry.encounter)) assert.ok(creature.level > top, `${creature.id} (level ${creature.level}) outranks the level-${top} creatures of ${district.id}`);
  }
});

test('no boss is a farm', () => {
  for (const id of farmable()) assert.ok(!isBoss(id), `${id} is placed as a farm`);
});

for (const level of [20, 30, 40, 50]) {
  test(`at combat level ${level} every style has a safe farm in its own armour line and strongest weapon that keeps pace with melee`, () => {
    const creatures = farmable();
    const melee = bestSafeFarm(creatures, ['melee'], level);
    assert.ok(melee, `melee has no safe farm at ${level}`);
    for (const style of STYLES) {
      const farm = bestSafeFarm(creatures, [style], level);
      assert.ok(farm, `${style} has no safe farm at ${level}`);
      assert.ok(farm.pace >= 0.7 * melee.pace, `${style} at ${level}: ${farm.id} pays ${farm.pace.toFixed(0)} a minute against melee's ${melee.pace.toFixed(0)} on ${melee.id}`);
    }
  });
}

for (const [index, column] of COLUMNS.entries()) {
  const previous = COLUMNS[index - 1];
  if (index < 2 || !previous) continue;
  test(`the ${column.name}'s best farm is worth more a kill than the ${previous.name}'s once an operative is level with it`, () => {
    const residents = residentsOf(column).filter((id) => farmable().includes(id));
    assert.ok(residents.length > 0, `${column.name} has no farm`);
    const level = Math.max(...residents.map((id) => GAME_CONTENT.creatures.get(id)!.level)) + 3;
    const here = bestSafeFarm(residents, STYLES, level);
    const there = bestSafeFarm(residentsOf(previous).filter((id) => farmable().includes(id)), STYLES, level);
    assert.ok(here && there, `no safe farm at ${level}`);
    const perKill = (id: string) => killValue(GAME_CONTENT.creatures.get(id)!);
    assert.ok(perKill(here.id) > perKill(there.id), `at ${level} the ${column.name} pays ${perKill(here.id)} a kill on ${here.id} against ${perKill(there.id)} on ${there.id} in the ${previous.name}`);
  });
}

test('every combat style has at least two non-boss creatures that guard with its armour line', () => {
  const creatures = [...GAME_CONTENT.creatures.values()].filter((creature) => !creature.encounter);
  for (const style of Object.keys(COMBAT_STYLE_INFO) as (keyof typeof COMBAT_STYLE_INFO)[]) {
    const line = COMBAT_STYLE_INFO[style].line;
    const guarded = creatures.filter((creature) => creature.guard === line);
    assert.ok(guarded.length >= 2, `${line} guards only ${guarded.map((creature) => creature.id).join(', ') || 'nothing'}`);
    for (const creature of guarded) assert.equal(weaknessOf(creature), styleBeating(style), `${creature.id} is weak to ${styleBeating(style)}`);
  }
});

test('ranged creatures exist, and skirmisher armour turns their shots better than plate', () => {
  const ranged = [...GAME_CONTENT.creatures.values()].filter((creature) => creature.attack.style === 'ranged');
  assert.ok(ranged.length >= 2, 'at least two ranged attackers');
  assert.ok(ranged.every((creature) => creature.attack.range > 1));
  for (const creature of ranged) {
    const rung = rungAt(creature.level);
    const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(creature.level), fortitude: experienceForLevel(typicalFortitude(creature.level)) };
    const against = (gear: EquipmentState): number => {
      const profile = deriveCombatProfile(skills, equipmentStats(gear, GAME_CONTENT.items));
      const theirs = creatureAttackProfile(creature);
      return hitChance(theirs.accuracy, defenceAgainst(profile, creature.attack.style)) * (1 + theirs.maxHit) / 2;
    };
    const plate = against(lineGear('melee', rung.level));
    const skirmisher = against(lineGear('ranged', rung.level));
    assert.ok(skirmisher < plate, `${creature.id}: skirmisher armour takes ${skirmisher.toFixed(2)} a swing against plate's ${plate.toFixed(2)}`);
  }
});

test('an NPC with a waiting line says it while the quest is active', () => {
  for (const dialogue of GAME_CONTENT.dialogues.values()) {
    for (const [id, node] of Object.entries(dialogue.nodes)) {
      if (!id.endsWith('waiting') || !node.text) continue;
      assert.ok(dialogue.entries.some((entry) => entry.node === id), `${dialogue.id} never says ${id}`);
    }
  }
});

test('a story chapter that starts on its own has no gated offer left to hide its story, and its gates are reachable', () => {
  const followUps = new Set([...GAME_CONTENT.quests.values()].flatMap((quest) => (quest.followUpQuestId ? [quest.followUpQuestId] : [])));
  const skipped = new Set(['skillLevel', 'combatLevel', 'questPoints']);
  for (const dialogue of GAME_CONTENT.dialogues.values()) {
    for (const entry of dialogue.entries) {
      const starts = dialogue.nodes[entry.node]?.options?.flatMap((option) => option.effects ?? []).filter((effect) => effect.type === 'startQuest') ?? [];
      for (const effect of starts) {
        if (effect.type !== 'startQuest' || !followUps.has(effect.questId)) continue;
        assert.ok(!(entry.conditions ?? []).some((condition) => skipped.has(condition.type)), `${dialogue.id} gates ${effect.questId}, which starts on its own`);
      }
    }
  }
  for (const questId of STORY_CHAPTERS()) {
    const available = [...GAME_CONTENT.quests.values()].filter((quest) => quest.id !== questId && quest.category !== 'tutorial').reduce((sum, quest) => sum + (quest.questPoints ?? 1), 0);
    for (const step of GAME_CONTENT.quests.get(questId)?.steps ?? []) {
      for (const objective of step.objectives) {
        if (objective.type === 'reach' && objective.measure === 'questPoints') assert.ok(objective.level <= available, `${questId} asks ${objective.level} of ${available} quest points`);
      }
    }
  }
});

test('each story gate on a skill or combat level points the minimap somewhere to train', () => {
  for (const questId of STORY_CHAPTERS()) {
    for (const step of GAME_CONTENT.quests.get(questId)?.steps ?? []) {
      for (const objective of step.objectives) {
        if (objective.type !== 'reach' || objective.measure === 'questPoints') continue;
        const districts = objectiveDistricts([{ objective, progress: 0, goal: objective.level, done: false }], GAME_CONTENT);
        assert.ok(districts.size > 0, `${questId}/${step.id} ${objective.label} has no route hint`);
      }
    }
  }
});

test('a storyline never hides a Containment wall inside a contain step: a reach gate comes first', () => {
  const contained: string[] = [];
  for (const questline of STORYLINES()) {
    let supplied = 0;
    for (const questId of questline.questIds) {
      const quest = GAME_CONTENT.quests.get(questId);
      assert.ok(quest, questId);
      let gated = 0;
      for (const step of quest.steps) {
        for (const objective of step.objectives) {
          if (objective.type === 'contain') {
            const creature = GAME_CONTENT.creatures.get(objective.creatureId);
            assert.ok(creature, objective.creatureId);
            const level = containmentLevelFor(creature);
            contained.push(`${questId}/${step.id}`);
            if (experienceForLevel(level) > supplied) assert.ok(gated >= level, `${questId}/${step.id} contains ${creature.name} (Containment ${level}) with no earlier reach gate at that level`);
          }
        }
        for (const objective of step.objectives) {
          if (objective.type === 'reach' && objective.measure === 'containment') gated = Math.max(gated, objective.level);
        }
      }
      for (const effect of quest.rewards) {
        if (effect.type === 'grantExperience' && effect.skill === 'containment') supplied += effect.amount;
      }
    }
  }
  assert.ok(contained.length > 0, 'some storyline asks for a containment');
});

test('a save on any quest step stays on that step', () => {
  for (const quest of GAME_CONTENT.quests.values()) {
    for (const step of quest.steps) {
      const saved = { questId: quest.id, status: 'active' as const, stepIndex: 0, stepId: step.id, objectiveProgress: [0] };
      assert.equal(quest.steps[realignedProgress(quest, saved).stepIndex]?.id, step.id, `a save on ${quest.id}/${step.id} stays on it`);
    }
  }
});

test('the level cap is 200 and mastery mantles do not out-stat the best tier-50 back item', () => {
  assert.equal(SKILL_LEVEL_CAP, 200);
  assert.equal(levelForExperience(experienceForLevel(SKILL_LEVEL_CAP) * 3), SKILL_LEVEL_CAP);
  const total = (item: ItemDefinition): number => Object.values(item.equipment?.stats ?? {}).reduce((sum, value) => sum + value, 0);
  const tierFifty = [...GAME_CONTENT.items.values()].filter((item) => item.equipment?.slot === 'back' && !item.mastery && Math.max(1, ...Object.values(item.equipment.requirements?.skills ?? {}).map((level) => level ?? 1)) === 50);
  assert.ok(tierFifty.length > 0);
  const best = Math.max(...tierFifty.map(total));
  const mantles = [...GAME_CONTENT.items.values()].filter((item) => item.mastery);
  assert.equal(mantles.length, 10);
  for (const mantle of mantles) assert.ok(total(mantle) <= best, `${mantle.id} totals ${total(mantle)} against ${best}`);
});

test('a first study is worth a handful of kills, and containment never pays less per point of integrity at a higher level of the same class', () => {
  const creatures = [...GAME_CONTENT.creatures.values()];
  for (const creature of creatures) {
    const kills = studyExperience(creature, true) / killValue(creature);
    assert.ok(Math.abs(kills - FIRST_STUDY_KILL_SHARE) <= 0.1 / killValue(creature) + 1e-9 || studyExperience(creature, true) === 0.1, `${creature.id} first study is worth ${kills.toFixed(2)} kills`);
  }
  const containable = creatures.filter((creature) => creature.containment);
  for (const higher of containable) {
    for (const lower of containable) {
      if (containmentLevelFor(higher) <= containmentLevelFor(lower) || higher.containment!.containmentClass !== lower.containment!.containmentClass) continue;
      assert.ok(containmentExperience(higher) / higher.integrity >= containmentExperience(lower) / lower.integrity - 0.01, `${higher.id} pays at least as much per integrity as ${lower.id}`);
    }
  }
});

test('creatures of the same level pay the same kill experience per point of integrity', () => {
  const rates = new Map<number, number>();
  for (const creature of GAME_CONTENT.creatures.values()) {
    if (creature.encounter) continue;
    const rate = creature.experience / creature.integrity;
    const seen = rates.get(creature.level) ?? rate;
    assert.ok(Math.abs(seen - rate) <= 0.5 / creature.integrity + 0.5 / creature.integrity, `${creature.id} pays ${rate.toFixed(2)} per integrity at level ${creature.level}, others ${seen.toFixed(2)}`);
    rates.set(creature.level, seen);
  }
});
