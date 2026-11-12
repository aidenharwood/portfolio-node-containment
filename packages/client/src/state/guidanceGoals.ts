import { GAME_CONTENT, resourceRouteGoals, routeGoals, trackedQuest, type ActiveQuest, type GuidanceTarget, type QuestLog, type ResourceGoals, type RouteScene } from '@containment/shared';

export function guidedQuest(target: GuidanceTarget | null, log: QuestLog): ActiveQuest | null {
  if (target?.kind === 'resource') return null;
  return trackedQuest(log, GAME_CONTENT.quests, target?.questId ?? null) ?? null;
}

export function guidanceGoals(target: GuidanceTarget | null, log: QuestLog, scene: RouteScene): ResourceGoals {
  if (target?.kind === 'resource') return resourceRouteGoals(target.objectId, scene);
  const tracked = guidedQuest(target, log);
  return { goals: tracked ? routeGoals(tracked, scene, GAME_CONTENT) : [], allDepleted: false };
}
