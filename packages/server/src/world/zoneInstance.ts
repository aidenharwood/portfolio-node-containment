import {
  createWalkabilityGrid,
  findPath,
  parseTileLayout,
  rectContains,
  type AreaDefinition,
  type EntityId,
  type EntitySnapshot,
  type GroundItemSnapshot,
  type GameContent,
  type InstanceId,
  type ObjectPlacement,
  type ServerMessage,
  type TilePoint,
  type WalkabilityGrid,
  type WorldObjectDefinition,
  type DistrictDefinition,
  type TileLayout,
} from '@containment/shared';
import { Creature } from './creature.ts';
import { groundItemSnapshot, isGroundItemVisibleTo, type GroundItem } from './groundItem.ts';
import { Npc } from './npc.ts';
import type { Player } from './player.ts';

export interface PlacedObject {
  readonly placement: ObjectPlacement;
  readonly definition: WorldObjectDefinition;
}

export class ZoneInstance {
  readonly definition: DistrictDefinition;
  readonly layout: TileLayout;
  readonly grid: WalkabilityGrid;
  readonly players = new Map<EntityId, Player>();
  readonly npcs = new Map<InstanceId, Npc>();
  readonly objects = new Map<InstanceId, PlacedObject>();
  readonly creatures = new Map<EntityId, Creature>();
  readonly groundItems = new Map<string, GroundItem>();
  readonly depletedUntil = new Map<InstanceId, number>();
  private readonly nodeCharges = new Map<InstanceId, number>();
  readonly layer: number;
  emptySinceTick: number | null = null;

  constructor(definition: DistrictDefinition, content: GameContent, layer: number) {
    this.definition = definition;
    this.layer = layer;
    this.layout = parseTileLayout(definition.map);

    for (const placement of definition.objects) {
      const objectDefinition = content.worldObjects.get(placement.objectId);
      if (objectDefinition) this.objects.set(placement.instanceId, { placement, definition: objectDefinition });
    }
    const blockedTiles = [...this.objects.values()]
      .filter((object) => object.definition.blocksMovement)
      .map((object) => object.placement.position);
    this.grid = createWalkabilityGrid(this.layout, blockedTiles);

    for (const placement of definition.creatures ?? []) {
      const creatureDefinition = content.creatures.get(placement.creatureId);
      if (!creatureDefinition) continue;
      const creature = new Creature(placement, creatureDefinition);
      this.creatures.set(creature.entityId, creature);
    }

    for (const placement of definition.npcs) {
      const npcDefinition = content.npcs.get(placement.npcId);
      if (npcDefinition) this.npcs.set(placement.instanceId, new Npc(placement, npcDefinition));
    }
  }

  get id(): string {
    return this.definition.id;
  }

  broadcast(message: ServerMessage, exceptEntityId?: EntityId): void {
    for (const player of this.players.values()) {
      if (player.entityId !== exceptEntityId) player.send(message);
    }
  }

  entitySnapshots(): EntitySnapshot[] {
    return [
      ...[...this.npcs.values()].map((npc) => npc.snapshot()),
      ...[...this.creatures.values()].filter((creature) => creature.state !== 'despawned').map((creature) => creature.snapshot()),
      ...[...this.players.values()].map((player) => player.snapshot()),
    ];
  }

  groundItemsVisibleTo(entityId: EntityId): GroundItemSnapshot[] {
    return [...this.groundItems.values()].filter((item) => isGroundItemVisibleTo(item, entityId)).map((item) => groundItemSnapshot(item, entityId));
  }

  spendNodeCharge(instanceId: InstanceId, capacity: number): boolean {
    const left = (this.nodeCharges.get(instanceId) ?? capacity) - 1;
    this.nodeCharges.set(instanceId, left);
    return left <= 0;
  }

  restoreNode(instanceId: InstanceId): void {
    this.depletedUntil.delete(instanceId);
    this.nodeCharges.delete(instanceId);
  }

  areasAt(point: TilePoint): AreaDefinition[] {
    return this.definition.areas.filter((area) => rectContains(area.rect, point));
  }

  pathBetween(from: TilePoint, to: TilePoint, arriveAdjacent: boolean, maxSearchNodes?: number): TilePoint[] | null {
    return findPath(this.grid, { from, to, arriveAdjacent, maxSearchNodes });
  }

  creatureByInstance(instanceId: InstanceId): Creature | undefined {
    return this.creatures.get(`creature:${instanceId}`);
  }

  safeSpawnPoint(preferred: TilePoint): TilePoint {
    return this.grid.isWalkable(preferred) ? preferred : this.definition.spawn;
  }
}
