import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, questOfferConditions } from '../src/index.ts';
import { SPAN_NPCS } from '../src/content/span/people.ts';

const QUESTS = [...GAME_CONTENT.quests.values()];

const gatherLevel = (itemId: string): { readonly skill: string; readonly level: number } | undefined => {
  let best: { skill: string; level: number } | undefined;
  for (const object of GAME_CONTENT.worldObjects.values()) {
    for (const interaction of object.interactions) {
      const gather = interaction.gather;
      if (gather?.itemId === itemId && (!best || gather.level < best.level)) best = { skill: gather.skill, level: gather.level };
    }
  }
  return best;
};

test('every gather step is gated on the skill its nodes need, by an offer condition or an earlier reach step', () => {
  for (const quest of QUESTS) {
    const offered = questOfferConditions(quest, GAME_CONTENT);
    const gates = new Map<string, number>();
    for (const condition of offered) if (condition.type === 'skillLevel') gates.set(condition.skill, Math.max(gates.get(condition.skill) ?? 0, condition.atLeast));
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        if (objective.type !== 'gather') continue;
        const need = gatherLevel(objective.itemId);
        assert.ok(need, `${quest.id}/${step.id}: nothing gathers ${objective.itemId}`);
        if (need.level <= 1) continue;
        assert.ok((gates.get(need.skill) ?? 0) >= need.level, `${quest.id}/${step.id} gathers ${objective.itemId} (${need.skill} ${need.level}) with no gate`);
      }
      for (const objective of step.objectives) if (objective.type === 'reach') gates.set(objective.measure, Math.max(gates.get(objective.measure) ?? 0, objective.level));
    }
  }
});

test('every side quest offered in dialogue waits on a story quest', () => {
  for (const quest of QUESTS) {
    if (quest.category !== 'side' || !quest.offeredBy) continue;
    assert.ok((quest.offerRequires ?? []).length > 0, `${quest.id} can be taken before any story`);
    const conditions = questOfferConditions(quest, GAME_CONTENT);
    for (const required of quest.offerRequires ?? []) assert.ok(conditions.some((condition) => condition.type === 'questCompleted' && condition.questId === required), `${quest.id} offers before ${required} is done`);
  }
});

test('quest points open the commendation, and no more than the other quests award', () => {
  const gated = QUESTS.flatMap((quest) => questOfferConditions(quest, GAME_CONTENT).flatMap((condition) => (condition.type === 'questPoints' ? [{ quest, points: condition.atLeast }] : [])));
  assert.ok(gated.length > 0, 'nothing reads quest points');
  for (const { quest, points } of gated) {
    const available = QUESTS.filter((other) => other.id !== quest.id && other.category !== 'tutorial').reduce((sum, other) => sum + (other.questPoints ?? 1), 0);
    assert.ok(points <= available, `${quest.id} asks ${points} of ${available}`);
  }
});

test('each ending of End of File opens its own epilogue', () => {
  for (const flag of ['ending:resealed', 'ending:signed-out']) {
    assert.ok(QUESTS.some((quest) => questOfferConditions(quest, GAME_CONTENT).some((condition) => condition.type === 'hasFlag' && condition.flag === flag)), `no epilogue waits on ${flag}`);
  }
});

test('every resident of the Span and every wild creature of the first release has a part in some quest', () => {
  const named = new Set<string>();
  for (const quest of QUESTS) {
    if (quest.offeredBy) named.add(quest.offeredBy);
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        if (objective.type === 'talkTo') named.add(objective.npcId);
        if (objective.type === 'signal' && objective.npcId) named.add(objective.npcId);
        if (objective.type === 'defeat' || objective.type === 'contain') named.add(objective.creatureId);
      }
    }
  }
  for (const npc of SPAN_NPCS) assert.ok(named.has(npc.id), `${npc.id} has no quest`);
  for (const creature of ['lawn-rat', 'courtyard-gull', 'feral-hound', 'crop-magpie', 'alley-crawler', 'rustling', 'prism-hound', 'glass-stalker', 'cell-breaker']) assert.ok(named.has(creature), `${creature} is in no quest`);
});

test('there are at least seventy quests, and every region holds side quests in its wild squares', () => {
  assert.ok(QUESTS.length >= 70, `${QUESTS.length} quests`);
  const wild = new Map<string, Set<string>>();
  const objectHome = new Map<string, string[]>();
  for (const district of GAME_CONTENT.districts.values()) for (const placement of district.objects ?? []) objectHome.set(placement.objectId, [...(objectHome.get(placement.objectId) ?? []), district.id]);
  for (const quest of QUESTS) {
    for (const step of quest.steps) {
      for (const objective of step.objectives) {
        const districts = objective.type === 'enterArea' ? [objective.districtId] : objective.type === 'interactWith' ? (objectHome.get(objective.objectId) ?? []) : [];
        for (const id of districts) {
          const district = GAME_CONTENT.districts.get(id);
          if (!district || (district.npcs ?? []).some((npc) => GAME_CONTENT.npcs.get(npc.npcId)?.shopId)) continue;
          wild.set(district.region ?? '', new Set([...(wild.get(district.region ?? '') ?? []), id]));
        }
      }
    }
  }
  for (const region of GAME_CONTENT.regions.keys()) assert.ok((wild.get(region)?.size ?? 0) >= 3, `${region} sends quests to ${wild.get(region)?.size ?? 0} wild squares`);
});
