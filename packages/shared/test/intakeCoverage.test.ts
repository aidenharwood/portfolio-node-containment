import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMBAT_STYLE_INFO, COMBAT_STYLES, GAME_CONTENT, SKILL_IDS, STUDIED_FLAG_PREFIX, WEAPON_KIND_INFO, weaknessOf, type CombatStyle, type GameEffect, type QuestObjective, type SkillId } from '../src/index.ts';
import { INTAKE_TRAINING_QUEST_IDS } from '../src/content/span/quests/intake.ts';

const intake = GAME_CONTENT.questlines.get('act-one-intake');
const quests = (intake?.questIds ?? []).map((questId) => GAME_CONTENT.quests.get(questId)).filter((quest) => quest !== undefined);
const steps = quests.flatMap((quest) => quest.steps.map((step) => ({ where: `${quest.id}/${step.id}`, step })));
const objectives: readonly QuestObjective[] = steps.flatMap(({ step }) => step.objectives);

const objectEffects = (objectId: string): GameEffect['type'][] => (GAME_CONTENT.worldObjects.get(objectId)?.interactions ?? []).flatMap((interaction) => interaction.effects.map((effect) => effect.type));
const gatherSkill = (itemId: string): SkillId | undefined =>
  [...GAME_CONTENT.worldObjects.values()].flatMap((object) => object.interactions).find((interaction) => interaction.gather?.itemId === itemId)?.gather?.skill;
const recipeFor = (itemId: string) => [...GAME_CONTENT.recipes.values()].find((recipe) => recipe.output.itemId === itemId);
const droppedBy = (creatureId: string): string[] => {
  const creature = GAME_CONTENT.creatures.get(creatureId);
  return [...(creature?.loot ?? []), ...(creature?.containment?.loot ?? [])].map((entry) => entry.itemId);
};
const sold = (itemId: string): boolean => [...GAME_CONTENT.shops.values()].some((shop) => shop.listings.some((listing) => listing.itemId === itemId));

const studySignals = new Set(
  [...GAME_CONTENT.dialogues.values()].flatMap((dialogue) =>
    Object.values(dialogue.nodes).flatMap((node) =>
      (node.options ?? [])
        .filter((option) => (option.conditions ?? []).some((condition) => condition.type === 'hasFlag' && condition.flag.startsWith(STUDIED_FLAG_PREFIX)))
        .flatMap((option) => (option.effects ?? []).flatMap((effect) => (effect.type === 'emitSignal' ? [effect.signal] : []))),
    ),
  ),
);

const uses = (effect: GameEffect['type']): boolean => objectives.some((objective) => objective.type === 'interactWith' && objectEffects(objective.objectId).includes(effect));

test('Act I opens with the intake training quests and then the story', () => {
  assert.ok(intake);
  assert.deepEqual(intake.questIds.slice(0, INTAKE_TRAINING_QUEST_IDS.length), [...INTAKE_TRAINING_QUEST_IDS]);
  assert.equal(GAME_CONTENT.newCharacter.startingQuestId, INTAKE_TRAINING_QUEST_IDS[0]);
  assert.ok(intake.questIds.includes('paper-trail'));
});

for (const style of COMBAT_STYLES) {
  test(`the intake has the recruit equip a ${style} weapon and win a fight with it against a creature weak to it`, () => {
    const lesson = steps.find(({ step }) => step.objectives.some((objective) => objective.type === 'defeat' && objective.style === style));
    assert.ok(lesson, `no intake step asks for a ${style} win`);
    const defeat = lesson.step.objectives.find((objective) => objective.type === 'defeat' && objective.style === style);
    assert.ok(defeat?.type === 'defeat');
    const creature = GAME_CONTENT.creatures.get(defeat.creatureId);
    assert.ok(creature, defeat.creatureId);
    assert.equal(weaknessOf(creature), style, `${lesson.where} fights ${creature.id}, which is not weak to ${style}`);
    const index = steps.indexOf(lesson);
    const equipped = steps.slice(0, index + 1).some(({ step }) =>
      step.objectives.some((objective) => {
        if (objective.type !== 'equipItem') return false;
        const weapon = GAME_CONTENT.items.get(objective.itemId)?.equipment?.weapon;
        return weapon !== undefined && WEAPON_KIND_INFO[weapon.kind].style === style;
      }),
    );
    assert.ok(equipped, `no step before ${lesson.where} has the recruit equip a ${style} weapon`);
  });
}

test('the intake covers every core mechanic', () => {
  const mechanics: Record<string, boolean> = {
    talking: objectives.some((objective) => objective.type === 'talkTo'),
    containment: objectives.some((objective) => objective.type === 'contain'),
    study: objectives.some((objective) => objective.type === 'signal' && studySignals.has(objective.signal)),
    pickingUpLoot: steps.some(({ step }) => step.objectives.some((objective) => objective.type === 'obtainItem' && step.objectives.some((fight) => (fight.type === 'contain' || fight.type === 'defeat') && droppedBy(fight.creatureId).includes(objective.itemId)))),
    eating: objectives.some((objective) => objective.type === 'useItem' && GAME_CONTENT.items.get(objective.itemId)?.consumable?.kind === 'food'),
    buying: objectives.some((objective) => objective.type === 'obtainItem' && sold(objective.itemId)),
    storage: uses('openStorage'),
    contracts: uses('openContracts'),
    exchange: uses('openMarket'),
    tram: uses('openTramMap'),
    lift: objectives.some((objective) => objective.type === 'enterArea' && GAME_CONTENT.levelOfDistrict.get(objective.districtId) !== GAME_CONTENT.newCharacter.startingLocation.levelId),
  };
  for (const station of ['refinery', 'fabricator', 'synthesiser', 'cooker']) {
    mechanics[station] = objectives.some((objective) => objective.type === 'craft' && recipeFor(objective.itemId)?.station === station);
  }
  for (const [mechanic, covered] of Object.entries(mechanics)) assert.ok(covered, `the intake never teaches ${mechanic}`);
});

test('the intake trains every skill at least once', () => {
  const trained = new Set<SkillId>();
  for (const objective of objectives) {
    if (objective.type === 'defeat' && objective.style) trained.add(COMBAT_STYLE_INFO[objective.style as CombatStyle].skill).add('fortitude');
    if (objective.type === 'contain') trained.add('containment');
    if (objective.type === 'signal' && studySignals.has(objective.signal)) trained.add('research');
    const gathered = objective.type === 'gather' ? gatherSkill(objective.itemId) : undefined;
    if (gathered) trained.add(gathered);
    const recipe = objective.type === 'craft' ? recipeFor(objective.itemId) : undefined;
    if (recipe) trained.add(recipe.skill);
  }
  assert.deepEqual(SKILL_IDS.filter((skill) => !trained.has(skill)), []);
});
