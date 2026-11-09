import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { Condition } from '../rules/conditions.ts';
import type { GameEffect } from '../rules/effects.ts';
import type { QuestObjective } from '../quests/questDefinition.ts';
import { questlineKindFor } from '../quests/questline.ts';
import { isShapeForSlot } from '../gear/slots.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import { parseTileLayout } from '../world/district.ts';
import { districtObjectsOf, findAssemblyIssues } from './assemblyIntegrity.ts';
import { findContainmentIssues } from './containmentIntegrity.ts';
import { findCraftingIssues, rawSourceTiers } from './craftingIntegrity.ts';
import type { GameContent } from './gameContent.ts';
import { findLevelIssues } from './levelIntegrity.ts';
import { findSafetyIssues } from './safetyIntegrity.ts';
import { findTramIssues } from './tramIntegrity.ts';

export function findContentIssues(content: GameContent): string[] {
  const issues: string[] = [];
  const report = (where: string, problem: string) => issues.push(`${where}: ${problem}`);
  const gatherable = rawSourceTiers(content);
  const craftable = new Set([...content.recipes.values()].map((recipe) => recipe.output.itemId));

  const checkItem = (where: string, itemId: string) => {
    if (!content.items.has(itemId)) report(where, `unknown item "${itemId}"`);
  };
  const checkQuest = (where: string, questId: string) => {
    if (!content.quests.has(questId)) report(where, `unknown quest "${questId}"`);
  };
  const checkConditions = (where: string, conditions: readonly Condition[] | undefined) => {
    for (const condition of conditions ?? []) {
      if (condition.type === 'hasItem' || condition.type === 'lacksItem') checkItem(where, condition.itemId);
      if (condition.type === 'questActive' || condition.type === 'questCompleted' || condition.type === 'questNotStarted') {
        checkQuest(where, condition.questId);
        if (condition.type === 'questActive' && condition.stepId) {
          const quest = content.quests.get(condition.questId);
          if (quest && !quest.steps.some((step) => step.id === condition.stepId)) {
            report(where, `quest "${condition.questId}" has no step "${condition.stepId}"`);
          }
        }
      }
    }
  };
  const checkEffects = (where: string, effects: readonly GameEffect[] | undefined) => {
    for (const effect of effects ?? []) {
      if (effect.type === 'giveItem' || effect.type === 'takeItem') checkItem(where, effect.itemId);
      if (effect.type === 'startQuest') checkQuest(where, effect.questId);
      if (effect.type === 'openShop' && !content.shops.has(effect.shopId)) report(where, `unknown shop "${effect.shopId}"`);
      if (effect.type === 'discoverStation' && !content.tram.stations.has(effect.stationId)) report(where, `unknown tram station "${effect.stationId}"`);
      if (effect.type === 'teleport') {
        const zone = content.districts.get(effect.districtId);
        if (!zone) report(where, `unknown zone "${effect.districtId}"`);
        else if (!TILE_KINDS[parseTileLayout(zone.map).tileAt(effect.position)].walkable) {
          report(where, `teleport destination ${effect.position.x},${effect.position.y} is not walkable`);
        }
      }
    }
  };
  const checkObjective = (where: string, objective: QuestObjective) => {
    if (objective.type === 'talkTo' && !content.npcs.has(objective.npcId)) report(where, `unknown npc "${objective.npcId}"`);
    if (objective.type === 'obtainItem' || objective.type === 'equipItem') checkItem(where, objective.itemId);
    if (objective.type === 'useItem') {
      checkItem(where, objective.itemId);
      if (!content.items.get(objective.itemId)?.consumable) report(where, `"${objective.itemId}" is not consumable`);
    }
    if (objective.type === 'gather' && !gatherable.has(objective.itemId)) report(where, `nothing in the world yields "${objective.itemId}"`);
    if (objective.type === 'craft' && !craftable.has(objective.itemId)) report(where, `no recipe makes "${objective.itemId}"`);
    if ((objective.type === 'defeat' || objective.type === 'contain') && !content.creatures.has(objective.creatureId)) {
      report(where, `unknown creature "${objective.creatureId}"`);
    }
    if (objective.type === 'signal' && objective.npcId && !content.npcs.has(objective.npcId)) {
      report(where, `unknown npc "${objective.npcId}"`);
    }
    if (objective.type === 'interactWith' && !content.worldObjects.has(objective.objectId)) {
      report(where, `unknown object "${objective.objectId}"`);
    }
    if (objective.type === 'enterArea') {
      const zone = content.districts.get(objective.districtId);
      if (!zone?.areas.some((area) => area.id === objective.areaId)) {
        report(where, `unknown area "${objective.districtId}/${objective.areaId}"`);
      }
    }
  };
  const checkDialogue = (dialogue: DialogueDefinition) => {
    const where = `dialogue ${dialogue.id}`;
    for (const entry of dialogue.entries) {
      if (!dialogue.nodes[entry.node]) report(where, `entry points at missing node "${entry.node}"`);
      checkConditions(where, entry.conditions);
    }
    for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
      const nodeWhere = `${where}#${nodeId}`;
      if (node.next && !dialogue.nodes[node.next]) report(nodeWhere, `next points at missing node "${node.next}"`);
      checkEffects(nodeWhere, node.effects);
      for (const option of node.options ?? []) {
        if (option.next && !dialogue.nodes[option.next]) report(nodeWhere, `option points at missing node "${option.next}"`);
        checkConditions(nodeWhere, option.conditions);
        checkEffects(nodeWhere, option.effects);
      }
    }
  };

  for (const item of content.items.values()) {
    if (item.category === 'equipment' && !item.equipment) report(`item ${item.id}`, 'equipment item lacks equipment properties');
    if (item.equipment && !isShapeForSlot(item.equipment.slot, item.icon)) {
      report(`item ${item.id}`, `icon "${item.icon}" is not a ${item.equipment.slot} shape, so the worn model would not match the icon`);
    }
    const weapon = item.equipment?.weapon;
    if (item.equipment?.slot === 'primary' && !weapon) report(`item ${item.id}`, 'primary item lacks a weapon profile');
    if (weapon && weapon.kind !== item.icon) report(`item ${item.id}`, `weapon kind "${weapon.kind}" does not match its icon "${item.icon}"`);
    if (weapon && (weapon.range < 1 || weapon.speedTicks < 1)) report(`item ${item.id}`, 'weapon range and speed must be at least 1');
  }

  const { kit } = content.newCharacter;
  for (const grant of kit.items) checkItem('newCharacter.kit', grant.itemId);
  for (const itemId of kit.equipment) {
    checkItem('newCharacter.kit', itemId);
    if (!content.items.get(itemId)?.equipment) report('newCharacter.kit', `"${itemId}" is not equippable`);
  }

  for (const npc of content.npcs.values()) {
    for (const itemId of npc.gear) checkItem(`npc ${npc.id}`, itemId);
    if (npc.dialogueId && !content.dialogues.has(npc.dialogueId)) report(`npc ${npc.id}`, `unknown dialogue "${npc.dialogueId}"`);
  }

  for (const object of content.worldObjects.values()) {
    if (object.countsAs && !content.worldObjects.has(object.countsAs)) report(`object ${object.id}`, `counts as unknown object "${object.countsAs}"`);
    for (const interaction of object.interactions) {
      checkConditions(`object ${object.id}`, interaction.conditions);
      checkEffects(`object ${object.id}`, interaction.effects);
    }
  }

  for (const dialogue of content.dialogues.values()) checkDialogue(dialogue);

  for (const shop of content.shops.values()) {
    for (const listing of shop.listings) {
      checkItem(`shop ${shop.id}`, listing.itemId);
      if (listing.price <= 0) report(`shop ${shop.id}`, `price for "${listing.itemId}" must be positive`);
    }
  }
  for (const npc of content.npcs.values()) {
    if (npc.shopId && !content.shops.has(npc.shopId)) report(`npc ${npc.id}`, `unknown shop "${npc.shopId}"`);
  }

  for (const creature of content.creatures.values()) {
    const where = `creature ${creature.id}`;
    for (const entry of creature.loot) {
      checkItem(where, entry.itemId);
      if (entry.chance <= 0 || entry.chance > 1) report(where, `loot chance for "${entry.itemId}" must be in (0, 1]`);
    }
    if (creature.integrity <= 0) report(where, 'integrity must be positive');
    if (creature.attack.maxHit < 1) report(where, 'attack maxHit must be at least 1');
  }

  for (const quest of content.quests.values()) {
    checkEffects(`quest ${quest.id}`, quest.rewards);
    if (quest.followUpQuestId) checkQuest(`quest ${quest.id}`, quest.followUpQuestId);
    for (const required of quest.offerRequires ?? []) checkQuest(`quest ${quest.id}`, required);
    for (const step of quest.steps) {
      for (const objective of step.objectives) checkObjective(`quest ${quest.id}/${step.id}`, objective);
      checkEffects(`quest ${quest.id}/${step.id}`, step.onComplete);
    }
  }

  const questlineOfQuest = new Map<string, string>();
  for (const questline of content.questlines.values()) {
    const where = `questline ${questline.id}`;
    if (questline.questIds.length === 0) report(where, 'holds no quests');
    for (const questId of questline.questIds) {
      checkQuest(where, questId);
      const previous = questlineOfQuest.get(questId);
      if (previous) report(where, `quest "${questId}" is already in questline "${previous}"`);
      questlineOfQuest.set(questId, questline.id);
      const quest = content.quests.get(questId);
      if (quest && questlineKindFor(quest) !== questline.kind) report(where, `${quest.category} quest "${questId}" does not belong in a ${questline.kind} questline`);
    }
  }
  for (const quest of content.quests.values()) {
    if (!questlineOfQuest.has(quest.id)) report(`quest ${quest.id}`, 'belongs to no questline');
  }

  for (const zone of content.districts.values()) {
    const where = `zone ${zone.id}`;
    let layout;
    try {
      layout = parseTileLayout(zone.map);
    } catch (error) {
      report(where, (error as Error).message);
      continue;
    }
    const isWalkable = (x: number, y: number) => TILE_KINDS[layout.tileAt({ x, y })].walkable;
    const instanceIds = new Set<string>();
    const occupied = new Set<string>();
    const objects = districtObjectsOf(content, zone.id);
    for (const placement of [...zone.npcs, ...objects]) {
      if (instanceIds.has(placement.instanceId)) report(where, `duplicate instance id "${placement.instanceId}"`);
      instanceIds.add(placement.instanceId);
    }
    for (const placement of zone.npcs) {
      if (!content.npcs.has(placement.npcId)) report(where, `unknown npc "${placement.npcId}"`);
      if (!isWalkable(placement.position.x, placement.position.y)) report(where, `npc "${placement.instanceId}" stands on an unwalkable tile`);
    }
    for (const placement of zone.creatures ?? []) {
      if (instanceIds.has(placement.instanceId)) report(where, `duplicate instance id "${placement.instanceId}"`);
      instanceIds.add(placement.instanceId);
      if (!content.creatures.has(placement.creatureId)) report(where, `unknown creature "${placement.creatureId}"`);
      if (!isWalkable(placement.position.x, placement.position.y)) {
        report(where, `creature "${placement.instanceId}" stands on an unwalkable tile`);
      }
    }
    for (const placement of objects) {
      if (!content.worldObjects.has(placement.objectId)) report(where, `unknown object "${placement.objectId}"`);
      const key = `${placement.position.x},${placement.position.y}`;
      if (occupied.has(key)) report(where, `two objects share tile ${key}`);
      occupied.add(key);
    }
  }

  const start = content.newCharacter.startingLocation;
  if (!content.levels.has(start.levelId)) report('newCharacter', `unknown starting level "${start.levelId}"`);
  checkQuest('newCharacter', content.newCharacter.startingQuestId);

  issues.push(...findCraftingIssues(content));
  issues.push(...findLevelIssues(content));
  issues.push(...findTramIssues(content));
  issues.push(...findAssemblyIssues(content));
  issues.push(...findSafetyIssues(content));
  issues.push(...findContainmentIssues(content));
  return issues;
}
