import assert from 'node:assert/strict';
import { test } from 'node:test';
import { districtObjects, findContentIssues } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

test('all content references resolve and every zone is well formed', () => {
  assert.deepEqual(findContentIssues(FIXTURE_CONTENT), []);
});

test('every piece of gear and medicine has a recipe fed from tier-appropriate sources', () => {
  const withoutMaul = new Map(FIXTURE_CONTENT.recipes);
  withoutMaul.delete('fabricator:heavy-maul');
  assert.ok(findContentIssues({ ...FIXTURE_CONTENT, recipes: withoutMaul }).some((issue) => issue.startsWith('item heavy-maul') && issue.includes('crafting recipe')));

  const field = FIXTURE_CONTENT.districts.get('fx-field');
  assert.ok(field);
  const deepField = new Map([...FIXTURE_CONTENT.districts, ['fx-field', { ...field, tier: 3 }]]);
  assert.ok(findContentIssues({ ...FIXTURE_CONTENT, districts: deepField }).some((issue) => issue.includes('tier 3')));

  const underLevelled = new Map(FIXTURE_CONTENT.recipes);
  const rifle = FIXTURE_CONTENT.recipes.get('fabricator:long-rifle');
  assert.ok(rifle);
  underLevelled.set(rifle.id, { ...rifle, level: 2 });
  assert.ok(findContentIssues({ ...FIXTURE_CONTENT, recipes: underLevelled }).some((issue) => issue.includes('below the item')));
});

test('unique gear is never crafted and is a rare drop from a creature strong enough to justify it', () => {
  assert.ok([...FIXTURE_CONTENT.items.values()].some((item) => item.unique));

  const recipes = new Map(FIXTURE_CONTENT.recipes);
  recipes.set('fabricator:warden-badge', { ...FIXTURE_CONTENT.recipes.get('fabricator:field-knife')!, id: 'fabricator:warden-badge', output: { itemId: 'warden-badge', count: 1 } });
  assert.ok(findContentIssues({ ...FIXTURE_CONTENT, recipes }).some((issue) => issue.startsWith('item warden-badge') && issue.includes('no crafting recipe')));

  const warden = FIXTURE_CONTENT.creatures.get('hollow-warden')!;
  const creatures = new Map(FIXTURE_CONTENT.creatures);
  creatures.set(warden.id, { ...warden, loot: warden.loot.filter((entry) => entry.itemId !== 'warden-badge') });
  assert.ok(findContentIssues({ ...FIXTURE_CONTENT, creatures }).some((issue) => issue.startsWith('item warden-badge') && issue.includes('placed creature')));

  const weakened = new Map(FIXTURE_CONTENT.creatures);
  weakened.set(warden.id, { ...warden, level: 2, containment: warden.containment ? { ...warden.containment, requiredLevel: 2 } : undefined });
  assert.ok(findContentIssues({ ...FIXTURE_CONTENT, creatures: weakened }).some((issue) => issue.startsWith('item warden-badge') && issue.includes('above the level')));
});

test('every quest can be started: it opens the game, follows another quest, or is offered in dialogue', () => {
  const startedInDialogue = new Set<string>();
  for (const dialogue of FIXTURE_CONTENT.dialogues.values()) {
    for (const node of Object.values(dialogue.nodes)) {
      for (const effect of [...(node.effects ?? []), ...(node.options ?? []).flatMap((option) => option.effects ?? [])]) {
        if (effect.type === 'startQuest') startedInDialogue.add(effect.questId);
      }
    }
  }
  const followUps = new Set([...FIXTURE_CONTENT.quests.values()].flatMap((quest) => (quest.followUpQuestId ? [quest.followUpQuestId] : [])));
  const unreachable = [...FIXTURE_CONTENT.quests.keys()].filter(
    (questId) => questId !== FIXTURE_CONTENT.newCharacter.startingQuestId && !followUps.has(questId) && !startedInDialogue.has(questId),
  );
  assert.deepEqual(unreachable, []);
});

test('every lift into a deep zone has a way back out', () => {
  const destinations = new Map<string, Set<string>>();
  for (const zone of FIXTURE_CONTENT.districts.values()) {
    for (const placement of districtObjects(zone, FIXTURE_CONTENT.assemblies)) {
      for (const interaction of FIXTURE_CONTENT.worldObjects.get(placement.objectId)?.interactions ?? []) {
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
  const enteredLevels = new Set([FIXTURE_CONTENT.newCharacter.startingLocation.levelId]);
  for (const targets of destinations.values()) {
    for (const districtId of targets) enteredLevels.add(FIXTURE_CONTENT.levelOfDistrict.get(districtId) ?? '');
  }
  for (const districtId of FIXTURE_CONTENT.districts.keys()) {
    const levelId = FIXTURE_CONTENT.levelOfDistrict.get(districtId);
    assert.ok(levelId !== undefined && enteredLevels.has(levelId), `nothing leads into ${districtId}`);
  }
});

test('every quest sits in exactly one questline of its own kind', () => {
  const side = [...FIXTURE_CONTENT.questlines.values()].find((questline) => questline.kind === 'side');
  assert.ok(side);
  const misplaced = new Map(FIXTURE_CONTENT.questlines);
  misplaced.set(side.id, { ...side, questIds: [...side.questIds.slice(1), 'vault-run'] });
  const issues = findContentIssues({ ...FIXTURE_CONTENT, questlines: misplaced });
  assert.ok(issues.some((issue) => issue.includes(side.questIds[0] ?? '') && issue.includes('no questline')));
  assert.ok(issues.some((issue) => issue.includes('"vault-run" is already in questline')));
  assert.ok(issues.some((issue) => issue.includes('main quest "vault-run" does not belong in a side questline')));
});
