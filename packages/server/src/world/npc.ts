import type { EntityId, EntitySnapshot, Facing, NpcDefinition, NpcPlacement, TilePoint } from '@containment/shared';

export class Npc {
  readonly entityId: EntityId;
  readonly placement: NpcPlacement;
  readonly definition: NpcDefinition;
  position: TilePoint;
  facing: Facing = 'south';
  path: TilePoint[] = [];
  engagedWith: EntityId | null = null;

  constructor(placement: NpcPlacement, definition: NpcDefinition) {
    this.entityId = `npc:${placement.instanceId}`;
    this.placement = placement;
    this.definition = definition;
    this.position = placement.position;
  }

  get home(): TilePoint {
    return this.placement.position;
  }

  snapshot(): EntitySnapshot {
    return {
      id: this.entityId,
      kind: 'npc',
      name: this.definition.name,
      title: this.definition.title,
      position: this.position,
      facing: this.facing,
      appearance: this.definition.appearance,
      gear: this.definition.gear,
      npcId: this.definition.id,
    };
  }
}
