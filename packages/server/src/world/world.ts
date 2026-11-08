import {
  chunkKeyOf,
  chunkOf,
  facingBetween,
  type Facing,
  type AreaId,
  type GameContent,
  type TilePoint,
  type DistrictId,
  type LevelId,
  type ResolvedLevel,
  type WorldLocation,
} from '@containment/shared';
import type { Creature } from './creature.ts';
import type { Npc } from './npc.ts';
import type { Player } from './player.ts';
import { LevelInstance, type EntityMove } from './levelInstance.ts';

export interface WorldHooks {
  onAreaEntered(player: Player, districtId: DistrictId, areaId: AreaId): void;
  onPathCompleted(player: Player): void;
}

interface Walker {
  readonly entityId: string;
  readonly home: TilePoint;
  position: TilePoint;
  facing: Facing;
  path: TilePoint[];
}

export interface WorldOptions {
  readonly tickMs: number;
  readonly random?: () => number;
  readonly capacityOverride?: number;
}

export const DEFAULT_ZONE_CAPACITY = 50;
const EMPTY_LAYER_RETIREMENT_TICKS = 200;

const NPC_WANDER_CHANCE_PER_TICK = 0.04;
const NPC_WANDER_SEARCH_LIMIT = 200;

export class World {
  readonly tickMs: number;
  private readonly content: GameContent;
  private readonly hooks: WorldHooks;
  private readonly random: () => number;
  private readonly capacityOverride: number | undefined;
  private readonly layers = new Map<LevelId, LevelInstance[]>();
  private readonly playerLayers = new Map<string, LevelInstance>();
  private tickCount = 0;

  constructor(content: GameContent, hooks: WorldHooks, options: WorldOptions) {
    this.content = content;
    this.hooks = hooks;
    this.tickMs = options.tickMs;
    this.random = options.random ?? Math.random;
    this.capacityOverride = options.capacityOverride;
    for (const definition of content.levels.values()) this.layers.set(definition.id, [new LevelInstance(definition, content, 1)]);
  }

  *instances(): Generator<LevelInstance> {
    for (const layers of this.layers.values()) yield* layers;
  }

  layersOf(levelId: LevelId): readonly LevelInstance[] {
    return this.layers.get(levelId) ?? [];
  }

  findLevelOf(player: Player): LevelInstance | undefined {
    return this.playerLayers.get(player.entityId);
  }

  districtOf(player: Player): DistrictId | undefined {
    return this.findLevelOf(player)?.layout.districtAt(player.position);
  }

  levelOf(player: Player): LevelInstance {
    const level = this.findLevelOf(player);
    if (!level) throw new Error(`Player ${player.entityId} is not in any level layer.`);
    return level;
  }

  capacityOf(definition: ResolvedLevel): number {
    return this.capacityOverride ?? definition.capacity ?? DEFAULT_ZONE_CAPACITY;
  }

  spawn(player: Player): void {
    const level = this.chooseLayer(this.content.levels.has(player.levelId) ? player.levelId : this.fallbackLevelId());
    player.relocate({ levelId: level.id, position: level.safeSpawnPoint(player.position) });
    level.players.set(player.entityId, player);
    this.playerLayers.set(player.entityId, level);
    player.interestChunk = chunkOf(player.position);
    const interest = level.interestOf(player);
    player.send({
      type: 'world.entered',
      levelId: level.id,
      selfEntityId: player.entityId,
      entities: level.entitySnapshotsIn(interest),
      groundItems: level.groundItemsVisibleIn(interest, player.entityId),
      depletedObjects: level.depletedObjectsIn(interest),
      tickMs: this.tickMs,
      layer: level.layer,
    });
    level.broadcastNear(player.position, { type: 'world.entitySpawned', entity: player.snapshot() }, player.entityId);
    this.refreshAreas(player, level);
  }

  despawn(player: Player): void {
    const level = this.playerLayers.get(player.entityId);
    this.playerLayers.delete(player.entityId);
    if (!level?.players.delete(player.entityId)) return;
    player.interestChunk = null;
    level.broadcastNear(player.position, { type: 'world.entityDespawned', entityId: player.entityId });
    for (const npc of level.npcs.values()) {
      if (npc.engagedWith === player.entityId) npc.engagedWith = null;
    }
    for (const creature of level.creatures.values()) {
      if (creature.targetId !== player.entityId) continue;
      creature.targetId = null;
      creature.returningHome = true;
    }
    player.combatTargetId = null;
  }

  transfer(player: Player, location: WorldLocation): void {
    const current = this.findLevelOf(player);
    if (current?.id === location.levelId) {
      this.moveWithin(player, current, location.position);
      return;
    }
    this.despawn(player);
    player.relocate(location);
    this.spawn(player);
  }

  private moveWithin(player: Player, level: LevelInstance, target: TilePoint): void {
    const from = player.position;
    const interestBefore = new Map([...level.players.values()].map((other) => [other.entityId, level.interestOf(other)] as const));
    player.relocate({ levelId: level.id, position: level.safeSpawnPoint(target) });
    const change = level.syncInterest(player);
    player.send({ type: 'world.entitySpawned', entity: player.snapshot() });
    level.publishMoves(
      [{ from, movement: { entityId: player.entityId, position: player.position, facing: player.facing } }],
      interestBefore,
      new Map([[player.entityId, change]]),
    );
    this.refreshAreas(player, level);
  }

  walk(player: Player, target: TilePoint): boolean {
    const level = this.levelOf(player);
    if (!level.isInterestOf(player, target)) return false;
    const path = level.pathBetween(player.position, target, false);
    if (!path) return false;
    player.path = path;
    return true;
  }

  approach(player: Player, target: TilePoint): boolean {
    const path = this.levelOf(player).pathBetween(player.position, target, true);
    if (!path) return false;
    player.path = path;
    return true;
  }

  face(player: Player, target: TilePoint): void {
    player.facing = facingBetween(player.position, target, player.facing);
    this.levelOf(player).broadcastNear(player.position, {
      type: 'world.tick',
      movements: [{ entityId: player.entityId, position: player.position, facing: player.facing }],
    });
  }

  faceNpc(npc: Walker, target: TilePoint, level: LevelInstance): void {
    npc.facing = facingBetween(npc.position, target, npc.facing);
    npc.path = [];
    level.broadcastNear(npc.position, { type: 'world.tick', movements: [{ entityId: npc.entityId, position: npc.position, facing: npc.facing }] });
  }

  tick(): void {
    this.tickCount++;
    this.retireEmptyLayers();
    for (const level of this.instances()) {
      if (level.players.size === 0) continue;
      const moves: EntityMove[] = [];
      const watched = level.watchedChunks();
      for (const npc of level.npcs.values()) {
        if (watched.has(chunkKeyOf(npc.position))) this.advanceNpc(npc, level, moves);
      }
      for (const creature of level.creatures.values()) {
        if (watched.has(chunkKeyOf(creature.position))) this.advanceCreature(creature, level, moves);
      }

      const arrived: Player[] = [];
      for (const player of [...level.players.values()]) {
        const next = player.path.shift();
        if (next) {
          const from = player.position;
          player.facing = facingBetween(player.position, next, player.facing);
          player.position = next;
          moves.push({ from, movement: { entityId: player.entityId, position: next, facing: player.facing } });
          this.refreshAreas(player, level);
        }
        if (player.path.length === 0 && player.pendingInteraction) arrived.push(player);
      }

      const interestBefore = new Map([...level.players.values()].map((player) => [player.entityId, level.interestOf(player)] as const));
      const changes = new Map([...level.players.values()].map((player) => [player.entityId, level.syncInterest(player)] as const));
      level.publishMoves(moves, interestBefore, changes);
      for (const player of arrived) {
        if (level.players.has(player.entityId)) this.hooks.onPathCompleted(player);
      }
    }
  }

  private advanceNpc(npc: Npc, level: LevelInstance, moves: EntityMove[]): void {
    if (npc.engagedWith) return;
    this.advanceWalker(npc, npc.definition.wanderRadius, level, moves);
  }

  private advanceCreature(creature: Creature, level: LevelInstance, moves: EntityMove[]): void {
    if (!creature.isAlive) return;
    this.advanceWalker(creature, creature.canWander ? creature.definition.wanderRadius : 0, level, moves);
  }

  private advanceWalker(walker: Walker, wanderRadius: number, level: LevelInstance, moves: EntityMove[]): void {
    if (walker.path.length === 0 && wanderRadius > 0 && this.random() < NPC_WANDER_CHANCE_PER_TICK) {
      walker.path = this.wanderPath(walker, wanderRadius, level);
    }
    const next = walker.path.shift();
    if (!next) return;
    const from = walker.position;
    walker.facing = facingBetween(walker.position, next, walker.facing);
    walker.position = next;
    moves.push({ from, movement: { entityId: walker.entityId, position: next, facing: walker.facing } });
  }

  private wanderPath(walker: Walker, radius: number, level: LevelInstance): TilePoint[] {
    const target = {
      x: walker.home.x + Math.round((this.random() * 2 - 1) * radius),
      y: walker.home.y + Math.round((this.random() * 2 - 1) * radius),
    };
    if (!level.grid.isWalkable(target)) return [];
    return level.pathBetween(walker.position, target, false, NPC_WANDER_SEARCH_LIMIT) ?? [];
  }

  private refreshAreas(player: Player, level: LevelInstance): void {
    const areas = level.areasAt(player.position);
    const current = new Set(areas.map((area) => `${area.districtId}/${area.id}`));
    const entered = areas.filter((area) => !player.occupiedAreas.has(`${area.districtId}/${area.id}`));
    player.occupiedAreas = current;
    for (const area of entered) this.hooks.onAreaEntered(player, area.districtId, area.id);
  }

  private chooseLayer(levelId: LevelId): LevelInstance {
    const layers = this.layers.get(levelId) ?? [];
    const definition = this.content.levels.get(levelId) as ResolvedLevel;
    const capacity = this.capacityOf(definition);
    const open = layers.filter((layer) => layer.players.size < capacity).sort((a, b) => b.players.size - a.players.size || a.layer - b.layer)[0];
    if (open) return open;
    const used = new Set(layers.map((layer) => layer.layer));
    let next = 1;
    while (used.has(next)) next++;
    const created = new LevelInstance(definition, this.content, next);
    this.layers.set(levelId, [...layers, created].sort((a, b) => a.layer - b.layer));
    return created;
  }

  private retireEmptyLayers(): void {
    for (const [levelId, layers] of this.layers) {
      const keep = layers.filter((layer) => {
        if (layer.layer === 1 || layer.players.size > 0) {
          layer.emptySinceTick = null;
          return true;
        }
        layer.emptySinceTick ??= this.tickCount;
        return this.tickCount - layer.emptySinceTick < EMPTY_LAYER_RETIREMENT_TICKS;
      });
      if (keep.length !== layers.length) this.layers.set(levelId, keep);
    }
  }

  private fallbackLevelId(): LevelId {
    const first = this.layers.keys().next().value;
    if (!first) throw new Error('The world has no levels.');
    return first;
  }
}
