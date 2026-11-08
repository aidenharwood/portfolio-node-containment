import type { CreatureId } from '../combat/creatures.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { NpcId, WorldObjectId } from '../ids.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { QuestObjective } from './questDefinition.ts';
import { objectIdsForObjective, type TrackedQuest } from './questGuidance.ts';

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

function objectGoals(objective: QuestObjective, scene: RouteScene, content: RouteContent): RouteGoal[] {
  const ids = objectIdsForObjective(objective, content.worldObjects, content.recipes);
  return scene.level.objects
    .filter((placement) => ids.has(placement.objectId) && !scene.depletedInstances.has(placement.instanceId))
    .map((placement) => adjacentTo(placement.position));
}

function goalsForObjective(objective: QuestObjective, scene: RouteScene, content: RouteContent): RouteGoal[] {
  switch (objective.type) {
    case 'talkTo':
      return npcGoals(objective.npcId, scene);
    case 'signal':
      return objective.npcId ? npcGoals(objective.npcId, scene) : [];
    case 'defeat':
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

export function routeGoals(tracked: TrackedQuest, scene: RouteScene, content: RouteContent): RouteGoal[] {
  return tracked.objectives.flatMap(({ objective, done }) => (done ? [] : goalsForObjective(objective, scene, content)));
}
