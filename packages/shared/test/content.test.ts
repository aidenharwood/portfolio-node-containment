import assert from 'node:assert/strict';
import { test } from 'node:test';
import { districtObjects, findContentIssues, GAME_CONTENT } from '../src/index.ts';

test('all content references resolve and every zone is well formed', () => {
  assert.deepEqual(findContentIssues(GAME_CONTENT), []);
});

test('every piece of gear and medicine has a recipe fed from tier-appropriate sources', () => {
  const withoutMaul = new Map(GAME_CONTENT.recipes);
  withoutMaul.delete('fabricator:shock-maul');
  assert.ok(
    findContentIssues({ ...GAME_CONTENT, recipes: withoutMaul }).some((issue) => issue.startsWith('item shock-maul') && issue.includes('crafting recipe')),
  );

  const deepKestrel = new Map(GAME_CONTENT.recipes);
  const kestrel = GAME_CONTENT.recipes.get('fabricator:kestrel-sidearm');
  assert.ok(kestrel);
  deepKestrel.set(kestrel.id, { ...kestrel, inputs: [{ itemId: 'hardened-steel', count: 1 }] });
  assert.ok(
    findContentIssues({ ...GAME_CONTENT, recipes: deepKestrel }).some((issue) => issue.includes('kestrel-sidearm') && issue.includes('tier 3')),
  );

  const underLevelled = new Map(GAME_CONTENT.recipes);
  const carbine = GAME_CONTENT.recipes.get('fabricator:marksman-carbine');
  assert.ok(carbine);
  underLevelled.set(carbine.id, { ...carbine, level: 2 });
  assert.ok(findContentIssues({ ...GAME_CONTENT, recipes: underLevelled }).some((issue) => issue.includes('below the item')));
});

test('unique gear is never crafted and is a rare drop from a creature strong enough to justify it', () => {
  const uniques = [...GAME_CONTENT.items.values()].filter((item) => item.unique);
  assert.ok(uniques.length >= 20);
  assert.ok(new Set(uniques.map((item) => item.rarity)).size >= 3, 'unique drops span several rarities');

  const recipes = new Map(GAME_CONTENT.recipes);
  recipes.set('fabricator:final-notice', { ...GAME_CONTENT.recipes.get('fabricator:franking-hammer')!, id: 'fabricator:final-notice', output: { itemId: 'final-notice', count: 1 } });
  assert.ok(findContentIssues({ ...GAME_CONTENT, recipes }).some((issue) => issue.startsWith('item final-notice') && issue.includes('no crafting recipe')));

  const creatures = new Map(GAME_CONTENT.creatures);
  const postmaster = GAME_CONTENT.creatures.get('the-postmaster')!;
  creatures.set(postmaster.id, { ...postmaster, loot: postmaster.loot.filter((entry) => entry.itemId !== 'final-notice') });
  assert.ok(findContentIssues({ ...GAME_CONTENT, creatures }).some((issue) => issue.startsWith('item final-notice') && issue.includes('placed creature')));

  const weakened = new Map(GAME_CONTENT.creatures);
  weakened.set(postmaster.id, { ...postmaster, level: 30 });
  assert.ok(findContentIssues({ ...GAME_CONTENT, creatures: weakened }).some((issue) => issue.startsWith('item final-notice') && issue.includes('above the level')));
});

test('there is craftable gear for every tier up to the Dead Letter Office', () => {
  const slots = ['head', 'torso', 'hands', 'legs', 'feet', 'primary'] as const;
  for (const level of [30, 35]) {
    for (const slot of slots) {
      const found = [...GAME_CONTENT.items.values()].some(
        (item) => !item.unique && item.equipment?.slot === slot && Math.max(...Object.values(item.equipment.requirements?.skills ?? {}).map((value) => value ?? 0)) === level,
      );
      assert.ok(found, `no craftable ${slot} gear at level ${level}`);
    }
  }
});

test('every quest can be started: it opens the game, follows another quest, or is offered in dialogue', () => {
  const startedInDialogue = new Set<string>();
  for (const dialogue of GAME_CONTENT.dialogues.values()) {
    for (const node of Object.values(dialogue.nodes)) {
      for (const effect of [...(node.effects ?? []), ...(node.options ?? []).flatMap((option) => option.effects ?? [])]) {
        if (effect.type === 'startQuest') startedInDialogue.add(effect.questId);
      }
    }
  }
  const followUps = new Set([...GAME_CONTENT.quests.values()].flatMap((quest) => (quest.followUpQuestId ? [quest.followUpQuestId] : [])));
  const unreachable = [...GAME_CONTENT.quests.keys()].filter(
    (questId) => questId !== GAME_CONTENT.newCharacter.startingQuestId && !followUps.has(questId) && !startedInDialogue.has(questId),
  );
  assert.deepEqual(unreachable, []);
});

test('every lift into a deep zone has a way back out', () => {
  const destinations = new Map<string, Set<string>>();
  for (const zone of GAME_CONTENT.districts.values()) {
    for (const placement of districtObjects(zone, GAME_CONTENT.assemblies)) {
      for (const interaction of GAME_CONTENT.worldObjects.get(placement.objectId)?.interactions ?? []) {
        for (const effect of interaction.effects) {
          if (effect.type !== 'teleport' || effect.districtId === zone.id) continue;
          destinations.set(zone.id, (destinations.get(zone.id) ?? new Set()).add(effect.districtId));
        }
      }
    }
  }
  for (const [from, targets] of destinations) {
    for (const to of targets) assert.ok(destinations.get(to)?.size, `${to} is reachable from ${from} but has no exit`);
  }
  const enteredLevels = new Set([GAME_CONTENT.newCharacter.startingLocation.levelId]);
  for (const targets of destinations.values()) {
    for (const districtId of targets) enteredLevels.add(GAME_CONTENT.levelOfDistrict.get(districtId) ?? '');
  }
  for (const districtId of GAME_CONTENT.districts.keys()) {
    const levelId = GAME_CONTENT.levelOfDistrict.get(districtId);
    assert.ok(levelId !== undefined && enteredLevels.has(levelId), `nothing leads into ${districtId}`);
  }
});

test('every quest sits in exactly one questline of its own kind', () => {
  const [first, second] = [...GAME_CONTENT.questlines.values()].filter((questline) => questline.kind === 'side');
  assert.ok(first && second);
  const misplaced = new Map(GAME_CONTENT.questlines);
  misplaced.set(first.id, { ...first, questIds: first.questIds.slice(1) });
  misplaced.set(second.id, { ...second, questIds: [...second.questIds, 'the-knocking'] });
  const issues = findContentIssues({ ...GAME_CONTENT, questlines: misplaced });
  assert.ok(issues.some((issue) => issue.includes(first.questIds[0] ?? '') && issue.includes('no questline')));
  assert.ok(issues.some((issue) => issue.includes('"the-knocking" is already in questline')));
  assert.ok(issues.some((issue) => issue.includes('main quest "the-knocking" does not belong in a side questline')));
});
