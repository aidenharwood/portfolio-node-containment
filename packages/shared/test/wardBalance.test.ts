import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStartingSkills, experienceForLevel, levelForExperience } from '../src/character/skills.ts';
import { deriveCombatProfile } from '../src/character/derivedStats.ts';
import { creatureAttackProfile, defenceAgainst, hitChance, playerAttackProfile, rollAttack } from '../src/combat/combatMath.ts';
import { creatureDefence, weaknessOf } from '../src/combat/study.ts';
import { REGENERATION_INTERVAL_TICKS, regenerationPerInterval } from '../src/combat/regeneration.ts';
import { COMBAT_STYLE_INFO, WEAPON_KIND_INFO, styleBeating } from '../src/combat/weapons.ts';
import { equipmentStats, type EquipmentState } from '../src/gear/equipment.ts';
import { GAME_CONTENT, containmentLevelFor, objectiveDistricts, realignedProgress, tierForLevel, type ItemDefinition } from '../src/index.ts';
import { gatheringSourcesOf } from '../src/content/craftingIntegrity.ts';
import { MATERIAL_LADDER } from '../src/content/ward/items.ts';

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

test('every weapon and armour piece gets stronger at each rung of the material ladder', () => {
  const kinds = ['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator'];
  for (let rung = 1; rung < MATERIAL_LADDER.length; rung++) {
    const lower = MATERIAL_LADDER[rung - 1]!;
    const upper = MATERIAL_LADDER[rung]!;
    assert.ok(upper.level > lower.level);
    for (const kind of kinds) {
      assert.ok(statTotal(GAME_CONTENT.items.get(`${upper.key}-${kind}`)) > statTotal(GAME_CONTENT.items.get(`${lower.key}-${kind}`)), `${upper.key}-${kind} beats ${lower.key}-${kind}`);
    }
    for (const noun of ['helm', 'plate', 'gauntlets', 'greaves', 'boots']) {
      const upperId = `${upper.key}-${noun}`;
      const lowerId = `${lower.key}-${noun}`;
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

test('creatures give more experience the stronger they are', () => {
  const creatures = [...GAME_CONTENT.creatures.values()].sort((a, b) => a.level - b.level);
  for (let index = 1; index < creatures.length; index++) {
    const previous = creatures[index - 1]!;
    const current = creatures[index]!;
    if (current.level > previous.level) assert.ok(current.experience > previous.experience, `${current.id} rewards more than ${previous.id}`);
  }
});

test('the Ward offers enough quest points to reach The Heart', () => {
  const heart = GAME_CONTENT.quests.get('the-heart');
  assert.ok(heart);
  const available = [...GAME_CONTENT.quests.values()].filter((quest) => quest.id !== 'the-heart').reduce((sum, quest) => sum + (quest.questPoints ?? (quest.category === 'tutorial' ? 0 : 1)), 0);
  assert.ok(available >= 12, `${available} quest points are on offer before The Heart`);
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

const KIT: EquipmentState = { primary: 'scrap-baton', torso: 'scrap-plate' };
const SCRAP_SET: EquipmentState = { primary: 'scrap-baton', head: 'scrap-helm', torso: 'scrap-plate', legs: 'scrap-greaves' };
const IRON_SET: EquipmentState = { primary: 'iron-baton', head: 'iron-helm', torso: 'iron-plate', hands: 'iron-gauntlets', legs: 'iron-greaves', feet: 'iron-boots' };

const BANDS: readonly { readonly name: string; readonly operative: Operative; readonly creature: string; readonly min: number; readonly max: number }[] = [
  { name: 'a fresh operative in the issue kit beats canal rats', operative: { closeQuarters: 1, fortitude: 1, gear: KIT }, creature: 'canal-rat', min: 0.95, max: 1 },
  { name: 'a fresh operative in the issue kit beats stray dogs', operative: { closeQuarters: 1, fortitude: 1, gear: KIT }, creature: 'stray-dog', min: 0.95, max: 1 },
  { name: 'a fresh operative is not yet safe against gutter mites', operative: { closeQuarters: 1, fortitude: 1, gear: KIT }, creature: 'gutter-mite', min: 0, max: 0.85 },
  { name: 'combat level 4 in the issue kit handles gutter mites', operative: { closeQuarters: 5, fortitude: 3, gear: KIT }, creature: 'gutter-mite', min: 0.95, max: 1 },
  { name: 'Close Quarters 6 in scrap handles silt eels', operative: { closeQuarters: 6, fortitude: 5, gear: SCRAP_SET }, creature: 'silt-eel', min: 0.85, max: 1 },
  { name: 'the Lamplighter turns back an operative still in scrap', operative: { closeQuarters: 10, fortitude: 7, gear: SCRAP_SET }, creature: 'the-lamplighter', min: 0, max: 0.4 },
  { name: 'the Lamplighter falls to the same operative with an iron baton', operative: { closeQuarters: 10, fortitude: 7, gear: { ...SCRAP_SET, primary: 'iron-baton' } }, creature: 'the-lamplighter', min: 0.75, max: 0.97 },
  { name: 'the Scrapyards stake is no place for Close Quarters 8 in scrap', operative: { closeQuarters: 8, fortitude: 6, gear: SCRAP_SET }, creature: 'rustling', min: 0, max: 0.25 },
  { name: 'an iron blade at Close Quarters 10 handles rustlings', operative: { closeQuarters: 10, fortitude: 7, gear: { ...SCRAP_SET, primary: 'iron-blade' } }, creature: 'rustling', min: 0.8, max: 1 },
  { name: 'an operative at 10 in iron clears scrap crawlers', operative: { closeQuarters: 10, fortitude: 10, gear: IRON_SET }, creature: 'scrap-crawler', min: 0.9, max: 1 },
];

for (const band of BANDS) {
  test(`balance: ${band.name}`, () => {
    const rate = winRate(band.operative, band.creature);
    assert.ok(rate >= band.min && rate <= band.max, `${band.creature}: ${(rate * 100).toFixed(1)}% is outside ${band.min * 100}-${band.max * 100}%`);
  });
}

test('ladder weapons carry only the offence stat their style uses, and the blade outhits the baton', () => {
  for (const rung of MATERIAL_LADDER) {
    for (const kind of ['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator']) {
      const item = GAME_CONTENT.items.get(`${rung.key}-${kind}`);
      const weapon = item?.equipment?.weapon;
      assert.ok(item && weapon, `${rung.key}-${kind}`);
      const offence = COMBAT_STYLE_INFO[WEAPON_KIND_INFO[weapon.kind].style].offenceStat;
      assert.deepEqual(Object.keys(item.equipment?.stats ?? {}), [offence], `${item.id} carries only ${offence}`);
    }
    const power = (kind: string) => GAME_CONTENT.items.get(`${rung.key}-${kind}`)?.equipment?.stats.power ?? 0;
    assert.ok(power('blade') > power('baton'), `${rung.key} blade outhits the baton`);
    assert.ok(power('maul') > power('blade'), `${rung.key} maul outhits the blade`);
  }
});

test('the Site Meridian storyline hands each chapter straight to the next', () => {
  const tutorial = GAME_CONTENT.quests.get(GAME_CONTENT.newCharacter.startingQuestId ?? '');
  assert.equal(tutorial?.followUpQuestId, GAME_CONTENT.questlines.get('site-meridian')?.questIds[0]);
  const chapters = GAME_CONTENT.questlines.get('site-meridian')?.questIds ?? [];
  for (const [index, questId] of chapters.slice(0, -1).entries()) {
    assert.equal(GAME_CONTENT.quests.get(questId)?.followUpQuestId, chapters[index + 1], `${questId} leads on`);
  }
});

test('Lost Cat runs three gutter mites back to back: risky without food, safe eating smoked eels between fights', () => {
  const eel = GAME_CONTENT.items.get('smoked-eel')?.consumable?.heal ?? 0;
  assert.ok(eel > 0);
  const mites = GAME_CONTENT.quests.get('lost-cat')?.steps.find((step) => step.id === 'mites')?.objectives[0];
  assert.ok(mites?.type === 'defeat' && mites.creatureId === 'gutter-mite');
  const fresh: Operative = { closeQuarters: 4, fortitude: 3, gear: KIT };
  const recommended: Operative = { closeQuarters: 6, fortitude: 4, gear: KIT };
  assert.ok(gauntletWinRate(fresh, 'gutter-mite', mites.count) < 0.3, 'the journal warning to eat is earned');
  assert.ok(gauntletWinRate(fresh, 'gutter-mite', mites.count, 2 * eel) >= 0.95, 'two eels between fights carry a fresh operative through');
  assert.ok(gauntletWinRate(recommended, 'gutter-mite', mites.count, eel) >= 0.95, 'one eel between fights is enough at the recommended level');
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

test('quests before Dead Band pay most of the Engineering its receiver needs', () => {
  const receiver = [...GAME_CONTENT.recipes.values()].find((recipe) => recipe.output.itemId === 'dead-band-receiver');
  assert.ok(receiver);
  const before = ['valve-trouble', 'steel-below'];
  const paid = before.flatMap((id) => GAME_CONTENT.quests.get(id)?.rewards ?? []).reduce((sum, effect) => sum + (effect.type === 'grantExperience' && effect.skill === 'engineering' ? effect.amount : 0), 0);
  assert.ok(paid >= 0.75 * experienceForLevel(receiver.level), `${paid} Engineering XP against ${experienceForLevel(receiver.level)}`);
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
    const perTick = (kind: string) => {
      const item = GAME_CONTENT.items.get(`${rung.key}-${kind}`);
      const weapon = item?.equipment?.weapon;
      assert.ok(item && weapon);
      const rating = rung.level + (item.equipment?.stats.power ?? 0);
      const maxHit = 1 + Math.floor((rating * WEAPON_KIND_INFO[weapon.kind].damageScale) / 4);
      return (hitChance(rating, rung.level) * (1 + maxHit) / 2) / weapon.speedTicks;
    };
    assert.ok(perTick('maul') >= perTick('blade'), `${rung.key} maul ${perTick('maul').toFixed(3)} against blade ${perTick('blade').toFixed(3)}`);
  }
});

test('early levels come quickly and the eased curve rejoins the old one by level 25', () => {
  assert.ok(experienceForLevel(2) <= 20, 'a training drone is enough for level 2');
  assert.ok(experienceForLevel(5) <= 320, 'level 5 costs about a dozen small fights');
  assert.ok(experienceForLevel(10) <= 2800, 'level 10 costs under 2800');
  assert.equal(experienceForLevel(25), 37564);
  for (let level = 3; level <= 60; level++) {
    const step = experienceForLevel(level) - experienceForLevel(level - 1);
    const previous = experienceForLevel(level - 1) - experienceForLevel(level - 2);
    assert.ok(step >= previous, `level ${level} costs at least as much as level ${level - 1}`);
  }
});

test('the strongest creature an operative can safely farm pays the most experience per minute', () => {
  const farmable = ['canal-rat', 'pigeon', 'scrap-magpie', 'stray-dog', 'gutter-mite', 'silt-eel', 'scrap-crawler'];
  const operative: Operative = { closeQuarters: 10, fortitude: 10, gear: IRON_SET };
  const perMinute = (creatureId: string): number => {
    const creature = GAME_CONTENT.creatures.get(creatureId);
    assert.ok(creature);
    const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(operative.closeQuarters), fortitude: experienceForLevel(operative.fortitude) };
    const attack = playerAttackProfile(skills, operative.gear, GAME_CONTENT.items);
    const perSwing = hitChance(attack.accuracy, creatureDefence(creature, attack.style, false)) * (1 + attack.maxHit) / 2;
    const ticks = (creature.integrity / perSwing) * attack.speedTicks + 15;
    return ((creature.integrity * 4 + creature.experience) / ticks) * 200;
  };
  const best = farmable.reduce((top, id) => (perMinute(id) > perMinute(top) ? id : top));
  assert.equal(best, 'scrap-crawler', `${best} pays ${perMinute(best).toFixed(0)} a minute`);
});

type Style = keyof typeof COMBAT_STYLE_INFO;

const STYLES = Object.keys(COMBAT_STYLE_INFO) as Style[];

const LINE_KIT: Readonly<Record<Style, { readonly weapon: string; readonly weapons: readonly string[]; readonly pieces: Readonly<Record<'head' | 'torso' | 'hands' | 'legs' | 'feet', string>> }>> = {
  melee: { weapon: 'baton', weapons: ['baton', 'blade', 'maul'], pieces: { head: 'helm', torso: 'plate', hands: 'gauntlets', legs: 'greaves', feet: 'boots' } },
  ranged: { weapon: 'pistol', weapons: ['pistol', 'carbine', 'rifle'], pieces: { head: 'hood', torso: 'jacket', hands: 'gloves', legs: 'trousers', feet: 'treads' } },
  psionic: { weapon: 'focus', weapons: ['focus', 'resonator'], pieces: { head: 'cowl', torso: 'robe', hands: 'wraps', legs: 'breeches', feet: 'footwraps' } },
};

const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z]+/g, '-');

const rungAt = (level: number) => MATERIAL_LADDER.filter((rung) => rung.level <= level).at(-1)!;

function strongestWeapon(style: Style, rungKey: string, level: number): string {
  const perTick = (kind: string): number => {
    const weapon = GAME_CONTENT.items.get(`${rungKey}-${kind}`)?.equipment;
    assert.ok(weapon?.weapon, `${rungKey}-${kind}`);
    const rating = level + Object.values(weapon.stats).reduce((sum, value) => sum + (value ?? 0), 0);
    const maxHit = 1 + Math.floor((rating * WEAPON_KIND_INFO[weapon.weapon.kind].damageScale) / 4);
    return (hitChance(rating, level) * (1 + maxHit)) / 2 / weapon.weapon.speedTicks;
  };
  return LINE_KIT[style].weapons.reduce((top, kind) => (perTick(kind) > perTick(top) ? kind : top));
}

function lineGear(style: Style, level: number, strongest = false): EquipmentState {
  const rung = rungAt(level);
  const line = style === 'melee' ? rung.key : slugOf(style === 'ranged' ? rung.skirmisher : rung.warden);
  const kit = LINE_KIT[style];
  const pieces = Object.fromEntries(Object.entries(kit.pieces).map(([slot, noun]) => [slot, `${line}-${noun}`]));
  const gear = { primary: `${rung.key}-${strongest ? strongestWeapon(style, rung.key, level) : kit.weapon}`, ...pieces };
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
  return ((creature.integrity * 4 + creature.experience) / (fight + Math.max(15, healing))) * 200;
}

test('counting the wait to heal, the Fringe pays better than crawlers until the Cordon catches up in the forties and takes over at 50', () => {
  for (const level of [20, 25, 30, 35]) {
    const knockers = linePace('melee', level, 'hull-knocker');
    const crawlers = linePace('melee', level, 'scrap-crawler');
    assert.ok(knockers > crawlers * 1.1, `at ${level} knockers pay ${knockers.toFixed(0)} against crawlers' ${crawlers.toFixed(0)}`);
    assert.ok(linePace('melee', level, 'cordon-stalker') < knockers, `at ${level} the Cordon outpays the Fringe`);
  }
  for (const level of [40, 45, 50]) {
    const knockers = linePace('melee', level, 'hull-knocker', 40);
    const cordon = linePace('melee', level, 'cordon-stalker', 40);
    const floor = level >= 50 ? 1 : 0.9;
    assert.ok(cordon >= knockers * floor, `at ${level} the Cordon pays ${cordon.toFixed(0)} against knockers' ${knockers.toFixed(0)}`);
  }
});

const farmable = (): string[] => {
  const spots = new Map<string, number>();
  for (const district of GAME_CONTENT.districts.values()) {
    for (const placement of district.creatures ?? []) spots.set(placement.creatureId, (spots.get(placement.creatureId) ?? 0) + 1);
  }
  return [...spots].filter(([, count]) => count >= 2).map(([id]) => id);
};

test('at combat levels 20, 30, 40 and 50 every style has a safe farm in its own armour line and strongest weapon that keeps pace with melee', () => {
  const creatures = farmable();
  assert.ok(!creatures.includes('the-warden') && !creatures.includes('the-lamplighter'));
  for (const level of [20, 30, 40, 50]) {
    const best = (style: Style) =>
      creatures
        .map((id) => ({ id, ...lineFight(style, level, id, true), pace: linePace(style, level, id, level, true) }))
        .filter((fight) => fight.win >= 0.95 && fight.lost <= 0.6)
        .sort((a, b) => b.pace - a.pace)[0];
    const melee = best('melee');
    assert.ok(melee, `melee has no safe farm at ${level}`);
    for (const style of STYLES) {
      const farm = best(style);
      assert.ok(farm, `${style} has no safe farm at ${level}`);
      assert.ok(farm.pace >= 0.7 * melee.pace, `${style} at ${level}: ${farm.id} pays ${farm.pace.toFixed(0)} a minute against melee's ${melee.pace.toFixed(0)} on ${melee.id}`);
    }
  }
});

test('past level 28, aggressive creatures are a fair fight at level and a real danger ten levels under, even in plate', () => {
  const veterans = [...GAME_CONTENT.creatures.values()].filter((creature) => creature.level > 28 && creature.aggressive && creature.id !== 'the-warden');
  assert.ok(veterans.length >= 5);
  for (const creature of veterans) {
    const even = plateFight(creature.level, creature.id);
    const under = plateFight(creature.level - 10, creature.id);
    const label = (fight: { win: number; lost: number }) => `${(fight.win * 100).toFixed(0)}% win, ${(fight.lost * 100).toFixed(0)}% lost`;
    if (creature.attack.style === 'psionic') {
      assert.ok(even.win >= 0.85, `${creature.id} at level: ${label(even)}`);
      assert.ok(under.win <= 0.75, `${creature.id} ten under: ${label(under)}`);
      continue;
    }
    const near = plateFight(creature.level - 5, creature.id);
    assert.ok(even.win >= 0.97 && even.lost >= 0.3 && even.lost <= 0.6, `${creature.id} at level: ${label(even)}`);
    assert.ok(near.win >= 0.65 && near.lost >= 0.55 && near.lost <= 0.85, `${creature.id} five under: ${label(near)}`);
    assert.ok(under.win <= 0.85 && under.lost >= 0.75, `${creature.id} ten under: ${label(under)}`);
  }
  const warden = plateFight(54, 'the-warden');
  assert.ok(warden.win >= 0.7 && warden.win <= 0.85, `the Warden at 54 in plate: ${(warden.win * 100).toFixed(0)}%`);
});

test('every combat style has at least two non-boss creatures that guard with its armour line', () => {
  const creatures = [...GAME_CONTENT.creatures.values()].filter((creature) => creature.id !== 'the-warden');
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
  const chapters = GAME_CONTENT.questlines.get('site-meridian')?.questIds ?? [];
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
  const available = [...GAME_CONTENT.quests.values()].filter((quest) => quest.id !== 'the-heart' && quest.category !== 'tutorial').reduce((sum, quest) => sum + (quest.questPoints ?? 1), 0);
  for (const questId of chapters) {
    for (const step of GAME_CONTENT.quests.get(questId)?.steps ?? []) {
      for (const objective of step.objectives) {
        if (objective.type === 'reach' && objective.measure === 'questPoints') assert.ok(objective.level <= available, `${questId} asks ${objective.level} of ${available} quest points`);
      }
    }
  }
});

test('each story gate on a skill or combat level points the minimap somewhere to train', () => {
  for (const questId of GAME_CONTENT.questlines.get('site-meridian')?.questIds ?? []) {
    for (const step of GAME_CONTENT.quests.get(questId)?.steps ?? []) {
      for (const objective of step.objectives) {
        if (objective.type !== 'reach' || objective.measure === 'questPoints') continue;
        const districts = objectiveDistricts([{ objective, progress: 0, goal: objective.level, done: false }], GAME_CONTENT);
        assert.ok(districts.size > 0, `${questId}/${step.id} ${objective.label} has no route hint`);
      }
    }
  }
});

test('quest experience snowballs: quests from Dead Band on pay more levels the later they are recommended', () => {
  const stepAt = (level: number): number => experienceForLevel(level + 1) - experienceForLevel(level);
  const levelsPaid = (questId: string): number => {
    const quest = GAME_CONTENT.quests.get(questId);
    assert.ok(quest?.recommendedLevel, `${questId} needs a recommended level`);
    const amounts = quest.rewards.flatMap((effect) => (effect.type === 'grantExperience' || effect.type === 'grantStyleExperience' ? [effect.amount] : []));
    return Math.max(...amounts) / stepAt(quest.recommendedLevel);
  };
  for (const questId of ['lost-cat', 'drowned-lamp', 'steel-below', 'dead-band']) {
    const levels = levelsPaid(questId);
    assert.ok(levels >= 0.8 && levels <= 1.5, `${questId} pays ${levels.toFixed(2)} levels; the early game pays about one`);
  }
  const late = [...GAME_CONTENT.quests.values()]
    .filter((quest) => (quest.recommendedLevel ?? 0) >= 12)
    .sort((a, b) => (a.recommendedLevel ?? 0) - (b.recommendedLevel ?? 0));
  for (let index = 1; index < late.length; index++) {
    const before = late[index - 1]!;
    const after = late[index]!;
    if (after.recommendedLevel === before.recommendedLevel) continue;
    assert.ok(levelsPaid(after.id) >= levelsPaid(before.id) - 0.05, `${after.id} pays fewer levels than ${before.id}`);
  }
  assert.ok(levelsPaid('bill-of-lading') >= 2.5, 'Bill of Lading pays at least two and a half levels');
  assert.ok(levelsPaid('the-heart') >= 3.5, 'The Heart pays at least three and a half levels');
  const cordonKill = GAME_CONTENT.creatures.get('cordon-stalker')!.experience;
  const heartPay = GAME_CONTENT.quests.get('the-heart')!.rewards.flatMap((effect) => (effect.type === 'grantExperience' || effect.type === 'grantStyleExperience' ? [effect.amount] : []));
  assert.ok(Math.max(...heartPay) >= 3 * cordonKill, 'The Heart pays more than a few Cordon kills');
});

test('a story chapter never hides a Containment wall inside a contain step: a reach gate comes first', () => {
  const chapters = GAME_CONTENT.questlines.get('site-meridian')?.questIds ?? [];
  const contained: string[] = [];
  let supplied = 0;
  for (const questId of chapters) {
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
  assert.ok(contained.includes('bill-of-lading/specimen') && contained.includes('the-heart/tide'), contained.join(', '));
});

test('The Heart contains its tide wraith before the Warden, and saves on every step stay put or wait on the wraith', () => {
  const heart = GAME_CONTENT.quests.get('the-heart');
  assert.ok(heart);
  const ids = heart.steps.map((step) => step.id);
  assert.ok(ids.indexOf('tide') > ids.indexOf('hale') && ids.indexOf('tide') < ids.indexOf('descend'), ids.join(','));
  assert.ok(ids.indexOf('descend') < ids.indexOf('warden') && ids.indexOf('warden') < ids.indexOf('hatch'));
  for (const stepId of ['hale', 'descend', 'warden', 'hatch', 'mercer', 'tide']) {
    const saved = { questId: heart.id, status: 'active' as const, stepIndex: 0, stepId, objectiveProgress: [0] };
    const moved = realignedProgress(heart, saved);
    assert.equal(heart.steps[moved.stepIndex]?.id, stepId, `a save on ${stepId} stays on it`);
  }
  const legacy = (stepIndex: number) => ({ questId: heart.id, status: 'active' as const, stepIndex, objectiveProgress: [0] });
  const placed = [0, 1, 2, 3, 4].map((index) => heart.steps[realignedProgress(heart, legacy(index)).stepIndex]?.id);
  assert.equal(placed[0], 'hale');
  for (const stepId of placed) assert.ok(stepId && ids.indexOf(stepId) <= ids.indexOf('mercer'));
  assert.ok(ids.indexOf(placed[2] ?? '') <= ids.indexOf('warden'), 'a legacy save at the Warden is never moved past it');
});
