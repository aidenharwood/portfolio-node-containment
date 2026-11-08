import {
  chunkKeyOf,
  chunkOf,
  createWalkabilityGrid,
  interestDelta,
  interestSet,
  findPath,
  rectContains,
  type ChunkKey,
  type EntityId,
  type EntityMovement,
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

export interface EntityMove {
  readonly from: TilePoint;
  readonly movement: EntityMovement;
}

export interface InterestChange {
  readonly entered: ReadonlySet<ChunkKey>;
  readonly left: ReadonlySet<ChunkKey>;
}

const NO_CHUNKS: ReadonlySet<ChunkKey> = new Set();
const NO_CHANGE: InterestChange = { entered: NO_CHUNKS, left: NO_CHUNKS };

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

  interestOf(player: Player): ReadonlySet<ChunkKey> {
    return player.interestChunk ? interestSet(player.interestChunk) : NO_CHUNKS;
  }

  watchedChunks(): ReadonlySet<ChunkKey> {
    const watched = new Set<ChunkKey>();
    for (const player of this.players.values()) {
      for (const key of this.interestOf(player)) watched.add(key);
    }
    return watched;
  }

  isInterestOf(player: Player, point: TilePoint): boolean {
    return this.interestOf(player).has(chunkKeyOf(point));
  }

  observersOf(point: TilePoint): Player[] {
    const key = chunkKeyOf(point);
    return [...this.players.values()].filter((player) => this.interestOf(player).has(key));
  }

  broadcastNear(point: TilePoint, message: ServerMessage, exceptEntityId?: EntityId): void {
    for (const player of this.observersOf(point)) {
      if (player.entityId !== exceptEntityId) player.send(message);
    }
  }

  entitySnapshotsIn(chunks: ReadonlySet<ChunkKey>): EntitySnapshot[] {
    const inside = (point: TilePoint) => chunks.has(chunkKeyOf(point));
    return [
      ...[...this.npcs.values()].filter((npc) => inside(npc.position)).map((npc) => npc.snapshot()),
      ...[...this.creatures.values()].filter((creature) => creature.state !== 'despawned' && inside(creature.position)).map((creature) => creature.snapshot()),
      ...[...this.players.values()].filter((player) => inside(player.position)).map((player) => player.snapshot()),
    ];
  }

  groundItemsVisibleIn(chunks: ReadonlySet<ChunkKey>, entityId: EntityId): GroundItemSnapshot[] {
    return [...this.groundItems.values()]
      .filter((item) => chunks.has(chunkKeyOf(item.position)) && isGroundItemVisibleTo(item, entityId))
      .map((item) => groundItemSnapshot(item, entityId));
  }

  depletedObjectsIn(chunks: ReadonlySet<ChunkKey>): InstanceId[] {
    return [...this.depletedUntil.keys()].filter((instanceId) => {
      const position = this.objects.get(instanceId)?.placement.position;
      return position !== undefined && chunks.has(chunkKeyOf(position));
    });
  }

  syncInterest(player: Player): InterestChange {
    const next = chunkOf(player.position);
    const delta = interestDelta(player.interestChunk, next);
    player.interestChunk = next;
    if (delta.left.length > 0) player.send({ type: 'world.chunksLeft', chunks: delta.left });
    if (delta.entered.length > 0) {
      const entered = new Set(delta.entered);
      player.send({
        type: 'world.chunksEntered',
        chunks: delta.entered,
        entities: this.entitySnapshotsIn(entered).filter((entity) => entity.id !== player.entityId),
        groundItems: this.groundItemsVisibleIn(entered, player.entityId),
        depletedObjects: this.depletedObjectsIn(entered),
      });
    }
    return { entered: new Set(delta.entered), left: new Set(delta.left) };
  }

  publishMoves(moves: readonly EntityMove[], interestBefore: ReadonlyMap<EntityId, ReadonlySet<ChunkKey>>, changes: ReadonlyMap<EntityId, InterestChange>): void {
    for (const observer of this.players.values()) {
      const before = interestBefore.get(observer.entityId) ?? NO_CHUNKS;
      const after = this.interestOf(observer);
      const change = changes.get(observer.entityId) ?? NO_CHANGE;
      const visible: EntityMovement[] = [];
      for (const move of moves) {
        if (move.movement.entityId === observer.entityId) {
          visible.push(move.movement);
          continue;
        }
        const fromKey = chunkKeyOf(move.from);
        const toKey = chunkKeyOf(move.movement.position);
        const clientKnows = (before.has(fromKey) && !change.left.has(fromKey)) || change.entered.has(toKey);
        if (after.has(toKey)) {
          if (clientKnows) visible.push(move.movement);
          else {
            const snapshot = this.snapshotOf(move.movement.entityId);
            if (snapshot) observer.send({ type: 'world.entitySpawned', entity: snapshot });
          }
        } else if (before.has(fromKey) && !change.left.has(fromKey)) {
          observer.send({ type: 'world.entityDespawned', entityId: move.movement.entityId });
        }
      }
      if (visible.length > 0) observer.send({ type: 'world.tick', movements: visible });
    }
  }

  snapshotOf(entityId: EntityId): EntitySnapshot | undefined {
    const player = this.players.get(entityId);
    if (player) return player.snapshot();
    const creature = this.creatures.get(entityId);
    if (creature) return creature.state === 'despawned' ? undefined : creature.snapshot();
    return [...this.npcs.values()].find((npc) => npc.entityId === entityId)?.snapshot();
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
