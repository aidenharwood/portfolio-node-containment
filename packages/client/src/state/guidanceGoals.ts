import { GAME_CONTENT, resourceRouteGoals, routeGoals, trackedQuest, type ActiveQuest, type GameContent, type GuidanceTarget, type QuestLog, type ResourceGoals, type RouteScene } from '@containment/shared';

export function guidedQuest(target: GuidanceTarget | null, log: QuestLog, content: GameContent = GAME_CONTENT): ActiveQuest | null {
  if (target?.kind === 'resource') return null;
  return trackedQuest(log, content.quests, target?.questId ?? null) ?? null;
}

export function guidanceGoals(target: GuidanceTarget | null, log: QuestLog, scene: RouteScene, content: GameContent = GAME_CONTENT): ResourceGoals {
  if (target?.kind === 'resource') return resourceRouteGoals(target.objectId, scene);
  const tracked = guidedQuest(target, log, content);
  return { goals: tracked ? routeGoals(tracked, scene, content) : [], allDepleted: false };
}
