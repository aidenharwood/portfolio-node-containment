import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, GAME_CONTENT } from '../src/index.ts';
import { ladderWeaponId, MATERIAL_LADDER } from '../src/content/catalog/items.ts';

test('the shipped world passes every content check', () => {
  assert.deepEqual(findContentIssues(GAME_CONTENT), []);
});

test('new characters start in a district of the shipped world', () => {
  const start = GAME_CONTENT.newCharacter.startingLocation;
  assert.ok(GAME_CONTENT.levels.get(start.levelId)?.layout.districtAt(start.position));
});

test('every Site lift runs from its headhouse down to its facility level and back', () => {
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
    ['kestrel-lift-down', 'site-kestrel', -1],
    ['kestrel-lift-up', 'kestrel-intake', 0],
    ['gallowglass-lift-down', 'site-gallowglass', -1],
    ['gallowglass-lift-up', 'gallowglass-undercity', 0],
    ['null-lift-down', 'site-null', -1],
    ['null-lift-up', 'null-below', 0],
    ['tallow-lift-down', 'site-tallow', -1],
    ['tallow-lift-up', 'tallow-holding', 0],
    ['vesper-lift-down', 'site-vesper', -1],
    ['vesper-lift-up', 'vesper-deep', 0],
  ];
  for (const [lift, from, depth] of route) {
    const placed = GAME_CONTENT.districts.get(from)?.objects.some((object) => object.objectId === lift);
    assert.ok(placed, `${lift} stands in ${from}`);
    assert.equal(depthOf(destination(lift)), depth, `${lift} leads to depth ${depth}`);
  }
});

test('the opening quest can be finished between Site Kestrel and Kestrel Commons', () => {
  const opening = GAME_CONTENT.quests.get(GAME_CONTENT.newCharacter.startingQuestId ?? '');
  assert.ok(opening, 'new characters start on a quest');
  const home = ['site-kestrel', 'kestrel-commons'].map((id) => GAME_CONTENT.districts.get(id));
  const placed = new Set(home.flatMap((district) => (district?.creatures ?? []).map((creature) => creature.creatureId)));
  const people = new Set(home.flatMap((district) => (district?.npcs ?? []).map((npc) => npc.npcId)));
  for (const step of opening.steps) {
    for (const objective of step.objectives) {
      if (objective.type === 'defeat' || objective.type === 'contain') assert.ok(placed.has(objective.creatureId), `${objective.creatureId} lives at Kestrel`);
      if (objective.type === 'talkTo') assert.ok(people.has(objective.npcId), `${objective.npcId} stands at Kestrel`);
    }
  }
});

test('every material in the ladder has a full set of weapons and armour', () => {
  for (const rung of MATERIAL_LADDER) {
    const weapons = (['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator'] as const).map((kind) => ladderWeaponId(rung, kind));
    for (const id of weapons) assert.ok(GAME_CONTENT.items.get(id)?.equipment?.weapon, `${id} is a weapon`);
    const armour = [...GAME_CONTENT.items.values()].filter((item) => item.equipment && !item.equipment.weapon && !item.unique && GAME_CONTENT.recipes.get(`fabricator:${item.id}`)?.inputs.some((input) => input.itemId === rung.plating || input.itemId === rung.fibre));
    assert.equal(armour.length, 18, `${rung.name} has fifteen armour pieces and three back pieces`);
  }
});

test('every quest names people, creatures and objects that stand somewhere in the world', () => {
  const districts = [...GAME_CONTENT.districts.values()];
  const npcs = new Set(districts.flatMap((district) => district.npcs.map((npc) => npc.npcId)));
  const creatures = new Set(districts.flatMap((district) => (district.creatures ?? []).map((creature) => creature.creatureId)));
  const assembled = districts.flatMap((district) => (district.assemblies ?? []).flatMap((placement) => Object.values(GAME_CONTENT.assemblies.get(placement.assemblyId)?.pieces ?? {}).map((piece) => piece.objectId)));
  const objects = new Set([...districts.flatMap((district) => district.objects.map((object) => object.objectId)), ...assembled]);
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

test('every renamed item points from a retired id to a live one', () => {
  for (const [from, to] of GAME_CONTENT.renamedItems ?? []) {
    assert.equal(GAME_CONTENT.items.has(from), false, `${from} is still live`);
    assert.equal(GAME_CONTENT.items.has(to), true, `${to} does not exist`);
  }
});
