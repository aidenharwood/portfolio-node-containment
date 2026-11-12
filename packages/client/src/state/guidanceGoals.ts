import { GAME_CONTENT, resourceRouteGoals, routeGoals, trackedQuest, type GuidanceTarget, type QuestLog, type ResourceGoals, type RouteScene } from '@containment/shared';

export function guidanceGoals(target: GuidanceTarget | null, log: QuestLog, scene: RouteScene): ResourceGoals {
  if (target?.kind === 'resource') return resourceRouteGoals(target.objectId, scene);
  const tracked = trackedQuest(log, GAME_CONTENT.quests, target?.questId ?? null);
  return { goals: tracked ? routeGoals(tracked, scene, GAME_CONTENT) : [], allDepleted: false };
}
