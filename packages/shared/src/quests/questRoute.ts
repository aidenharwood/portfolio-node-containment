import type { CreatureId } from '../combat/creatures.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { DialogueId, NpcId, WorldObjectId } from '../ids.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../world/entities.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { QuestObjective } from './questDefinition.ts';
import { npcIdsForObjective, objectIdsForObjective, type ActiveQuest } from './questGuidance.ts';

export interface RouteGoal {
  readonly point: TilePoint;
  readonly arriveAdjacent: boolean;
}

export interface LiveCreature {
  readonly creatureId: CreatureId;
  readonly position: TilePoint;
}

export interface RouteScene {
  readonly level: Pick<ResolvedLevel, 'areas' | 'npcs' | 'objects' | 'creatures'>;
  readonly npcPositions: ReadonlyMap<NpcId, TilePoint>;
  readonly creatures: readonly LiveCreature[];
  readonly depletedInstances: ReadonlySet<string>;
}

export interface RouteContent {
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
  readonly recipes: ReadonlyMap<string, RecipeDefinition>;
  readonly npcs: ReadonlyMap<NpcId, NpcDefinition>;
  readonly dialogues: ReadonlyMap<DialogueId, DialogueDefinition>;
}

const adjacentTo = (point: TilePoint): RouteGoal => ({ point, arriveAdjacent: true });

function npcGoals(npcId: NpcId, scene: RouteScene): RouteGoal[] {
  const live = scene.npcPositions.get(npcId);
  if (live) return [adjacentTo(live)];
  return scene.level.npcs.filter((npc) => npc.npcId === npcId).map((npc) => adjacentTo(npc.position));
}

function creatureGoals(creatureId: CreatureId, scene: RouteScene): RouteGoal[] {
  const live = scene.creatures.filter((creature) => creature.creatureId === creatureId);
  const positions = live.length > 0 ? live.map((creature) => creature.position) : scene.level.creatures.filter((creature) => creature.creatureId === creatureId).map((creature) => creature.position);
  return positions.map(adjacentTo);
}

const placementsOf = (ids: ReadonlySet<WorldObjectId>, scene: RouteScene) => scene.level.objects.filter((placement) => ids.has(placement.objectId));

function objectGoals(objective: QuestObjective, scene: RouteScene, content: RouteContent): RouteGoal[] {
  return placementsOf(objectIdsForObjective(objective, content.worldObjects, content.recipes), scene)
    .filter((placement) => !scene.depletedInstances.has(placement.instanceId))
    .map((placement) => adjacentTo(placement.position));
}

export interface ResourceGoals {
  readonly goals: RouteGoal[];
  readonly allDepleted: boolean;
}

export function resourceRouteGoals(objectId: WorldObjectId, scene: RouteScene): ResourceGoals {
  const placements = placementsOf(new Set([objectId]), scene);
  const live = placements.filter((placement) => !scene.depletedInstances.has(placement.instanceId));
  const allDepleted = live.length === 0 && placements.length > 0;
  return { goals: (allDepleted ? placements : live).map((placement) => adjacentTo(placement.position)), allDepleted };
}

function goalsForObjective(objective: QuestObjective, scene: RouteScene, content: RouteContent): RouteGoal[] {
  switch (objective.type) {
    case 'talkTo':
    case 'signal':
      return [...npcIdsForObjective(objective, content.npcs, content.dialogues)].flatMap((npcId) => npcGoals(npcId, scene));
    case 'obtainItem':
      return [
        ...objectGoals(objective, scene, content),
        ...[...npcIdsForObjective(objective, content.npcs, content.dialogues)].flatMap((npcId) => npcGoals(npcId, scene)),
      ];
    case 'defeat':
    case 'contain':
      return creatureGoals(objective.creatureId, scene);
    case 'interactWith':
    case 'gather':
    case 'craft':
      return objectGoals(objective, scene, content);
    case 'enterArea':
      return scene.level.areas
        .filter((area) => area.districtId === objective.districtId && area.id === objective.areaId)
        .map((area) => ({ point: { x: area.rect.x + Math.floor(area.rect.width / 2), y: area.rect.y + Math.floor(area.rect.height / 2) }, arriveAdjacent: false }));
    default:
      return [];
  }
}

export function routeGoals(tracked: ActiveQuest, scene: RouteScene, content: RouteContent): RouteGoal[] {
  return tracked.objectives.flatMap(({ objective, done }) => (done ? [] : goalsForObjective(objective, scene, content)));
}
