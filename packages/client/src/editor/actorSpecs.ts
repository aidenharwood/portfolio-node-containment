import type { CharacterAppearance, CreatureModel, GameContent, ItemId, ResolvedLevel, TilePoint } from '@containment/shared';

export type ActorSpec =
  | { readonly kind: 'npc'; readonly id: string; readonly appearance: CharacterAppearance; readonly gear: readonly ItemId[]; readonly position: TilePoint }
  | { readonly kind: 'creature'; readonly id: string; readonly model: CreatureModel; readonly position: TilePoint };

export function actorsOf(content: GameContent, level: ResolvedLevel): ActorSpec[] {
  const actors: ActorSpec[] = [];
  for (const placement of level.npcs) {
    const npc = content.npcs.get(placement.npcId);
    if (npc) actors.push({ kind: 'npc', id: placement.instanceId, appearance: npc.appearance, gear: npc.gear, position: placement.position });
  }
  for (const placement of level.creatures) {
    const creature = content.creatures.get(placement.creatureId);
    if (creature) actors.push({ kind: 'creature', id: placement.instanceId, model: creature.model, position: placement.position });
  }
  return actors;
}
