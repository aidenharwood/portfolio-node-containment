import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, GAME_CONTENT } from '../src/index.ts';

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
  for (const zone of GAME_CONTENT.zones.values()) {
    for (const placement of zone.objects) {
      for (const interaction of GAME_CONTENT.worldObjects.get(placement.objectId)?.interactions ?? []) {
        for (const effect of interaction.effects) {
          if (effect.type !== 'teleport' || effect.zoneId === zone.id) continue;
          destinations.set(zone.id, (destinations.get(zone.id) ?? new Set()).add(effect.zoneId));
        }
      }
    }
  }
  for (const [from, targets] of destinations) {
    for (const to of targets) assert.ok(destinations.get(to)?.size, `${to} is reachable from ${from} but has no exit`);
  }
  for (const zoneId of GAME_CONTENT.zones.keys()) {
    if (zoneId === GAME_CONTENT.newCharacter.startingLocation.zoneId) continue;
    assert.ok([...destinations.values()].some((targets) => targets.has(zoneId)), `nothing leads into ${zoneId}`);
  }
});
