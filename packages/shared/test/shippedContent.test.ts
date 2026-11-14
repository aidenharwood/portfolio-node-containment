import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, GAME_CONTENT } from '../src/index.ts';

test('the shipped world passes every content check', () => {
  assert.deepEqual(findContentIssues(GAME_CONTENT), []);
});

test('new characters start in a district of the shipped world', () => {
  const start = GAME_CONTENT.newCharacter.startingLocation;
  assert.ok(GAME_CONTENT.levels.get(start.levelId)?.layout.districtAt(start.position));
});

test('the Site Meridian lifts run from the headhouse down to the Vault and back', () => {
  const depthOf = (districtId: string): number | undefined => {
    const levelId = GAME_CONTENT.levelOfDistrict.get(districtId);
    return levelId === undefined ? undefined : GAME_CONTENT.levels.get(levelId)?.definition.depth;
  };
  const destination = (objectId: string): string => {
    const effect = GAME_CONTENT.worldObjects.get(objectId)?.interactions[0]?.effects[0];
    assert.equal(effect?.type, 'teleport', `${objectId} is a lift`);
    return effect.type === 'teleport' ? effect.districtId : '';
  };
  const route: readonly [string, string, number][] = [
    ['meridian-lift', 'canal-basin', -1],
    ['intake-lift-down', 'meridian-intake', -2],
    ['secure-lift-down', 'meridian-secure', -3],
    ['vault-lift-up', 'meridian-vault', -2],
    ['secure-lift-up', 'meridian-secure', -1],
    ['intake-lift-up', 'meridian-intake', 0],
  ];
  for (const [lift, from, depth] of route) {
    const placed = GAME_CONTENT.districts.get(from)?.objects.some((object) => object.objectId === lift);
    assert.ok(placed, `${lift} stands in ${from}`);
    assert.equal(depthOf(destination(lift)), depth, `${lift} leads to depth ${depth}`);
  }
});

test('the opening quest can be finished in Terminus Square', () => {
  const opening = GAME_CONTENT.quests.get(GAME_CONTENT.newCharacter.startingQuestId ?? '');
  assert.ok(opening, 'new characters start on a quest');
  const terminus = GAME_CONTENT.districts.get('terminus-square');
  const placed = new Set((terminus?.creatures ?? []).map((creature) => creature.creatureId));
  for (const step of opening.steps) {
    for (const objective of step.objectives) {
      if (objective.type === 'defeat' || objective.type === 'contain') assert.ok(placed.has(objective.creatureId), `${objective.creatureId} lives in Terminus Square`);
      if (objective.type === 'talkTo') assert.ok(terminus?.npcs.some((npc) => npc.npcId === objective.npcId), `${objective.npcId} stands in Terminus Square`);
    }
  }
});

test('every material in the ladder has a full set of weapons and armour', () => {
  const parts: Readonly<Record<string, readonly [string, string]>> = { scrap: ['scrap-bar', 'rag-bundle'], iron: ['iron-bar', 'waxed-canvas'], steel: ['steel-bar', 'synth-weave'], alloy: ['alloy-bar', 'tarred-canvas'] };
  for (const [material, [bar, fibre]] of Object.entries(parts)) {
    const weapons = ['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator'].map((kind) => `${material}-${kind}`);
    for (const id of weapons) assert.ok(GAME_CONTENT.items.get(id)?.equipment?.weapon, `${id} is a weapon`);
    const armour = [...GAME_CONTENT.items.values()].filter((item) => item.equipment && !item.equipment.weapon && !item.unique && GAME_CONTENT.recipes.get(`fabricator:${item.id}`)?.inputs.some((input) => input.itemId === bar || input.itemId === fibre));
    assert.equal(armour.length, 15, `${material} has fifteen armour pieces`);
  }
});

test('every quest names people, creatures and objects that stand somewhere in the world', () => {
  const districts = [...GAME_CONTENT.districts.values()];
  const npcs = new Set(districts.flatMap((district) => district.npcs.map((npc) => npc.npcId)));
  const creatures = new Set(districts.flatMap((district) => (district.creatures ?? []).map((creature) => creature.creatureId)));
  const objects = new Set(districts.flatMap((district) => district.objects.map((object) => object.objectId)));
  for (const quest of GAME_CONTENT.quests.values()) {
    if (quest.offeredBy) assert.ok(npcs.has(quest.offeredBy), `${quest.id} is offered by someone placed`);
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        const where = `${quest.id}/${step.id}`;
        if (objective.type === 'talkTo') assert.ok(npcs.has(objective.npcId), `${where}: ${objective.npcId}`);
        if (objective.type === 'signal' && objective.npcId) assert.ok(npcs.has(objective.npcId), `${where}: ${objective.npcId}`);
        if (objective.type === 'defeat' || objective.type === 'contain') assert.ok(creatures.has(objective.creatureId), `${where}: ${objective.creatureId}`);
        if (objective.type === 'interactWith') assert.ok(objects.has(objective.objectId), `${where}: ${objective.objectId}`);
      }
    }
  }
});
