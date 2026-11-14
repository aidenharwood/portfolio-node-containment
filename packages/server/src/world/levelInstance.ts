import {
  chunkKeyOf,
  chunkOf,
  createObjectWalkabilityGrid,
  doorTilesOf,
  withOpenDoors,
  type DoorTiles,
  type WorldObjectId,
  interestDelta,
  interestSet,
  findPath,
  fitsFootprint,
  footprintTiles,
  isCardinallyAdjacent,
  isInFootprint,
  nearestFootprintTile,
  tileKey,
  CARDINAL_OFFSETS,
  rectContains,
  type ChunkKey,
  type CreatureDefinition,
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
  isSafeIn,
} from '@containment/shared';
import { Creature } from './creature.ts';
import { groundItemSnapshot, isGroundItemVisibleTo, type GroundItem } from './groundItem.ts';
import { Npc } from './npc.ts';
import type { Player } from './player.ts';

const SAFE_SPAWN_SEARCH_RADIUS = 12;
const FREE_ANCHOR_SEARCH_RADIUS = 6;
const STRAIGHT_STEP_COST = 10;

export interface Walker {
  readonly entityId: EntityId;
  readonly position: TilePoint;
  readonly size: number;
}

export interface EntityMove {
  readonly from: TilePoint;
  readonly movement: EntityMovement;
}

export interface InterestChange {
  readonly entered: ReadonlySet<ChunkKey>;
  readonly left: ReadonlySet<ChunkKey>;
}

const NO_CHUNKS: ReadonlySet<ChunkKey> = new Set();

interface IndexedMove {
  readonly move: EntityMove;
  readonly order: number;
  readonly fromKey: ChunkKey;
  readonly toKey: ChunkKey;
}

function groupByChunk(moves: readonly IndexedMove[], keyOf: (move: IndexedMove) => ChunkKey): Map<ChunkKey, IndexedMove[]> {
  const groups = new Map<ChunkKey, IndexedMove[]>();
  for (const move of moves) {
    const key = keyOf(move);
    const group = groups.get(key);
    if (group) group.push(move);
    else groups.set(key, [move]);
  }
  return groups;
}
const NO_CHANGE: InterestChange = { entered: NO_CHUNKS, left: NO_CHUNKS };

export interface PlacedObject {
  readonly placement: ObjectPlacement;
  readonly definition: WorldObjectDefinition;
}

export class LevelInstance {
  readonly definition: ResolvedLevel;
  readonly layout: LevelLayout;
  readonly grid: WalkabilityGrid;
  readonly creatureGrid: WalkabilityGrid;
  readonly doors: DoorTiles;
  readonly players = new Map<EntityId, Player>();
  readonly npcs = new Map<InstanceId, Npc>();
  readonly objects = new Map<InstanceId, PlacedObject>();
  readonly creatures = new Map<EntityId, Creature>();
  readonly groundItems = new Map<string, GroundItem>();
  private readonly bodyOccupancy = new Map<string, EntityId>();
  private readonly sizedGrids = new Map<number, WalkabilityGrid>();
  private transientCount = 0;
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
    this.grid = createObjectWalkabilityGrid(this.layout, definition.objects, (objectId) => content.worldObjects.get(objectId));
    const grid = this.grid;
    this.doors = doorTilesOf(definition.objects, (objectId) => content.worldObjects.get(objectId));
    this.creatureGrid = { isWalkable: (point) => grid.isWalkable(point) && !this.isSafe(point) };

    for (const placement of definition.creatures) {
      const creatureDefinition = content.creatures.get(placement.creatureId);
      if (!creatureDefinition) continue;
      const creature = new Creature(placement, creatureDefinition);
      this.creatures.set(creature.entityId, creature);
    }
    this.rebuildBodies();

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
      for (const message of this.encounterMessagesIn(entered)) player.send(message);
    }
    return { entered: new Set(delta.entered), left: new Set(delta.left) };
  }

  publishMoves(moves: readonly EntityMove[], interestBefore: ReadonlyMap<EntityId, ReadonlySet<ChunkKey>>, changes: ReadonlyMap<EntityId, InterestChange>): void {
    const indexed = moves.map((move, order): IndexedMove => ({ move, order, fromKey: chunkKeyOf(move.from), toKey: chunkKeyOf(move.movement.position) }));
    const arrivingIn = groupByChunk(indexed, (move) => move.toKey);
    const leavingFrom = groupByChunk(indexed, (move) => move.fromKey);
    const ownMove = new Map(indexed.map((move) => [move.move.movement.entityId, move]));
    for (const observer of this.players.values()) {
      const before = interestBefore.get(observer.entityId) ?? NO_CHUNKS;
      const after = this.interestOf(observer);
      const change = changes.get(observer.entityId) ?? NO_CHANGE;
      const nearby = new Map<number, IndexedMove>();
      const own = ownMove.get(observer.entityId);
      if (own) nearby.set(own.order, own);
      for (const key of after) for (const move of arrivingIn.get(key) ?? []) nearby.set(move.order, move);
      for (const key of before) for (const move of leavingFrom.get(key) ?? []) nearby.set(move.order, move);
      const visible: EntityMovement[] = [];
      for (const { move, fromKey, toKey } of [...nearby.values()].sort((left, right) => left.order - right.order)) {
        if (move.movement.entityId === observer.entityId) {
          visible.push(move.movement);
          continue;
        }
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

  isSafe(point: TilePoint): boolean {
    return isSafeIn(this.definition.areas, point);
  }

  gridWithDoors(openDoors: ReadonlySet<WorldObjectId>): WalkabilityGrid {
    return openDoors.size === 0 ? this.grid : withOpenDoors(this.grid, this.layout, this.doors, (objectId) => openDoors.has(objectId));
  }

  pathBetween(from: TilePoint, to: TilePoint, arriveAdjacent: boolean, maxSearchNodes?: number, openDoors: ReadonlySet<WorldObjectId> = new Set()): TilePoint[] | null {
    return findPath(this.gridWithDoors(openDoors), { from, to, arriveAdjacent, maxSearchNodes });
  }

  pathToBody(from: TilePoint, body: Walker, openDoors: ReadonlySet<WorldObjectId> = new Set()): TilePoint[] | null {
    const isGoal = (point: TilePoint) => !isInFootprint(point, body.position, body.size) && isCardinallyAdjacent(point, nearestFootprintTile(body.position, body.size, point));
    return findPath(this.gridWithDoors(openDoors), { from, to: body.position, isGoal, goalSlack: STRAIGHT_STEP_COST * body.size });
  }

  creatureGridFor(size: number): WalkabilityGrid {
    if (size <= 1) return this.creatureGrid;
    const cached = this.sizedGrids.get(size);
    if (cached) return cached;
    const fits = new Map<string, boolean>();
    const grid: WalkabilityGrid = {
      isWalkable: (point) => {
        const key = tileKey(point);
        let known = fits.get(key);
        if (known === undefined) {
          known = fitsFootprint(this.creatureGrid, point, size);
          fits.set(key, known);
        }
        return known;
      },
    };
    this.sizedGrids.set(size, grid);
    return grid;
  }

  rebuildBodies(): void {
    this.bodyOccupancy.clear();
    for (const creature of this.creatures.values()) {
      if (creature.isAlive) this.occupy(creature);
    }
  }

  occupy(walker: Walker): void {
    for (const tile of footprintTiles(walker.position, walker.size)) this.bodyOccupancy.set(tileKey(tile), walker.entityId);
  }

  vacate(walker: Walker): void {
    for (const tile of footprintTiles(walker.position, walker.size)) {
      const key = tileKey(tile);
      if (this.bodyOccupancy.get(key) === walker.entityId) this.bodyOccupancy.delete(key);
    }
  }

  moveBody(walker: Walker & { position: TilePoint }, to: TilePoint): void {
    this.vacate(walker);
    walker.position = to;
    this.occupy(walker);
  }

  bodyAt(point: TilePoint): EntityId | undefined {
    return this.bodyOccupancy.get(tileKey(point));
  }

  isBodyFree(anchor: TilePoint, size: number, self: EntityId): boolean {
    return footprintTiles(anchor, size).every((tile) => {
      const owner = this.bodyOccupancy.get(tileKey(tile));
      return owner === undefined || owner === self;
    });
  }

  creaturePathBetween(walker: Walker, to: TilePoint, arriveAdjacent: boolean, maxSearchNodes?: number, avoidAllBodies = false): TilePoint[] | null {
    const sized = this.creatureGridFor(walker.size);
    const blocks = (owner: EntityId | undefined) =>
      owner !== undefined && owner !== walker.entityId && (avoidAllBodies || (this.creatures.get(owner)?.size ?? 1) > 1);
    const grid: WalkabilityGrid = {
      isWalkable: (point) => sized.isWalkable(point) && !footprintTiles(point, walker.size).some((tile) => blocks(this.bodyOccupancy.get(tileKey(tile)))),
    };
    if (!arriveAdjacent) return findPath(grid, { from: walker.position, to, maxSearchNodes });
    const isGoal = (anchor: TilePoint) => !isInFootprint(to, anchor, walker.size) && isCardinallyAdjacent(nearestFootprintTile(anchor, walker.size, to), to);
    return findPath(grid, { from: walker.position, to, isGoal, goalSlack: STRAIGHT_STEP_COST * walker.size, maxSearchNodes });
  }

  isChokepoint(point: TilePoint): boolean {
    const open = CARDINAL_OFFSETS.filter((offset) => this.grid.isWalkable({ x: point.x + offset.x, y: point.y + offset.y }));
    return open.length === 2 && open[0]!.x === -open[1]!.x && open[0]!.y === -open[1]!.y;
  }

  isWanderDestination(walker: Walker, point: TilePoint): boolean {
    return this.creatureGridFor(walker.size).isWalkable(point) && !footprintTiles(point, walker.size).some((tile) => this.isChokepoint(tile));
  }

  freeAnchorNear(walker: Walker, preferred: TilePoint): TilePoint {
    const grid = this.creatureGridFor(walker.size);
    for (let radius = 0; radius <= FREE_ANCHOR_SEARCH_RADIUS; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const candidate = { x: preferred.x + dx, y: preferred.y + dy };
          if (grid.isWalkable(candidate) && this.isBodyFree(candidate, walker.size, walker.entityId)) return candidate;
        }
      }
    }
    return preferred;
  }

  addTransientCreature(definition: CreatureDefinition, near: TilePoint, summoner: Creature): Creature {
    this.transientCount++;
    const placement = { instanceId: `${summoner.placement.instanceId}/add-${this.transientCount}`, creatureId: definition.id, position: near };
    const creature = new Creature(placement, definition, summoner.entityId);
    creature.position = this.freeAnchorNear(creature, near);
    this.creatures.set(creature.entityId, creature);
    this.occupy(creature);
    this.broadcastNear(creature.position, { type: 'world.entitySpawned', entity: creature.snapshot() });
    return creature;
  }

  removeCreature(creature: Creature): void {
    if (!this.creatures.delete(creature.entityId)) return;
    this.vacate(creature);
    this.broadcastNear(creature.position, { type: 'world.entityDespawned', entityId: creature.entityId });
  }

  encounterMessagesIn(chunks: ReadonlySet<ChunkKey>): ServerMessage[] {
    const messages: ServerMessage[] = [];
    for (const creature of this.creatures.values()) {
      const state = creature.encounter;
      const encounter = creature.definition.encounter;
      if (!state?.engaged || !encounter || !chunks.has(chunkKeyOf(creature.position))) continue;
      const pending = state.pending;
      const mechanic = pending ? encounter.mechanics.find((candidate) => candidate.id === pending.mechanicId) : undefined;
      if (pending && mechanic?.kind === 'telegraph') {
        messages.push({
          type: 'encounter.telegraph',
          entityId: creature.entityId,
          mechanicId: mechanic.id,
          shape: mechanic.shape,
          style: mechanic.style,
          tiles: pending.tiles,
          resolvesAtTick: pending.resolvesAtTick,
          windupTicks: mechanic.windupTicks,
        });
      }
      for (const [mechanicId, tiles] of state.hazards) {
        const hazard = encounter.mechanics.find((candidate) => candidate.id === mechanicId);
        if (hazard?.kind === 'hazard') messages.push({ type: 'encounter.hazard', entityId: creature.entityId, mechanicId, hazard: hazard.hazard, tiles });
      }
    }
    return messages;
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
