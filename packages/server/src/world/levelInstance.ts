import {
  createWalkabilityGrid,
  findPath,
  rectContains,
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
  type LevelId,
  type LevelLayout,
  type ResolvedArea,
  type ResolvedLevel,
} from '@containment/shared';
import { Creature } from './creature.ts';
import { groundItemSnapshot, isGroundItemVisibleTo, type GroundItem } from './groundItem.ts';
import { Npc } from './npc.ts';
import type { Player } from './player.ts';

const SAFE_SPAWN_SEARCH_RADIUS = 12;

export interface PlacedObject {
  readonly placement: ObjectPlacement;
  readonly definition: WorldObjectDefinition;
}

export class LevelInstance {
  readonly definition: ResolvedLevel;
  readonly layout: LevelLayout;
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

  constructor(definition: ResolvedLevel, content: GameContent, layer: number) {
    this.definition = definition;
    this.layer = layer;
    this.layout = definition.layout;

    for (const placement of definition.objects) {
      const objectDefinition = content.worldObjects.get(placement.objectId);
      if (objectDefinition) this.objects.set(placement.instanceId, { placement, definition: objectDefinition });
    }
    const blockedTiles = [...this.objects.values()]
      .filter((object) => object.definition.blocksMovement)
      .map((object) => object.placement.position);
    this.grid = createWalkabilityGrid(this.layout, blockedTiles);

    for (const placement of definition.creatures) {
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

  get id(): LevelId {
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

  areasAt(point: TilePoint): ResolvedArea[] {
    return this.definition.areas.filter((area) => rectContains(area.rect, point));
  }

  pathBetween(from: TilePoint, to: TilePoint, arriveAdjacent: boolean, maxSearchNodes?: number): TilePoint[] | null {
    return findPath(this.grid, { from, to, arriveAdjacent, maxSearchNodes });
  }

  creatureByInstance(instanceId: InstanceId): Creature | undefined {
    return this.creatures.get(`creature:${instanceId}`);
  }

  safeSpawnPoint(preferred: TilePoint): TilePoint {
    if (this.grid.isWalkable(preferred)) return preferred;
    const districtId = this.layout.districtAt(preferred);
    if (!districtId) return this.definition.spawn;
    for (let radius = 1; radius <= SAFE_SPAWN_SEARCH_RADIUS; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const candidate = { x: preferred.x + dx, y: preferred.y + dy };
          if (this.grid.isWalkable(candidate) && this.layout.districtAt(candidate) === districtId) return candidate;
        }
      }
    }
    return this.definition.spawn;
  }
}
