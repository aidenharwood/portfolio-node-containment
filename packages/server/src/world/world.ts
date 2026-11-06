import {
  chebyshevDistance,
  facingBetween,
  type Facing,
  type AreaId,
  type EntityMovement,
  type GameContent,
  type TilePoint,
  type ZoneDefinition,
  type ZoneId,
  type ZoneLocation,
} from '@containment/shared';
import type { Creature } from './creature.ts';
import type { Npc } from './npc.ts';
import type { Player } from './player.ts';
import { ZoneInstance } from './zoneInstance.ts';

export interface WorldHooks {
  onAreaEntered(player: Player, zoneId: ZoneId, areaId: AreaId): void;
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
const MAX_WALK_DISTANCE = 64;

export class World {
  readonly tickMs: number;
  private readonly content: GameContent;
  private readonly hooks: WorldHooks;
  private readonly random: () => number;
  private readonly capacityOverride: number | undefined;
  private readonly layers = new Map<ZoneId, ZoneInstance[]>();
  private readonly playerLayers = new Map<string, ZoneInstance>();
  private tickCount = 0;

  constructor(content: GameContent, hooks: WorldHooks, options: WorldOptions) {
    this.content = content;
    this.hooks = hooks;
    this.tickMs = options.tickMs;
    this.random = options.random ?? Math.random;
    this.capacityOverride = options.capacityOverride;
    for (const definition of content.zones.values()) this.layers.set(definition.id, [new ZoneInstance(definition, content, 1)]);
  }

  *instances(): Generator<ZoneInstance> {
    for (const layers of this.layers.values()) yield* layers;
  }

  layersOf(zoneId: ZoneId): readonly ZoneInstance[] {
    return this.layers.get(zoneId) ?? [];
  }

  findZoneOf(player: Player): ZoneInstance | undefined {
    return this.playerLayers.get(player.entityId);
  }

  zoneOf(player: Player): ZoneInstance {
    const zone = this.findZoneOf(player);
    if (!zone) throw new Error(`Player ${player.entityId} is not in any zone layer.`);
    return zone;
  }

  capacityOf(definition: ZoneDefinition): number {
    return this.capacityOverride ?? definition.capacity ?? DEFAULT_ZONE_CAPACITY;
  }

  spawn(player: Player): void {
    const zone = this.chooseLayer(this.content.zones.has(player.zoneId) ? player.zoneId : this.fallbackZoneId());
    player.relocate({ zoneId: zone.id, position: zone.safeSpawnPoint(player.position) });
    zone.players.set(player.entityId, player);
    this.playerLayers.set(player.entityId, zone);
    player.send({
      type: 'world.entered',
      zoneId: zone.id,
      selfEntityId: player.entityId,
      entities: zone.entitySnapshots(),
      groundItems: zone.groundItemsVisibleTo(player.entityId),
      depletedObjects: [...zone.depletedUntil.keys()],
      tickMs: this.tickMs,
      layer: zone.layer,
    });
    zone.broadcast({ type: 'world.entitySpawned', entity: player.snapshot() }, player.entityId);
    this.refreshAreas(player, zone);
  }

  despawn(player: Player): void {
    const zone = this.playerLayers.get(player.entityId);
    this.playerLayers.delete(player.entityId);
    if (!zone?.players.delete(player.entityId)) return;
    zone.broadcast({ type: 'world.entityDespawned', entityId: player.entityId });
    for (const npc of zone.npcs.values()) {
      if (npc.engagedWith === player.entityId) npc.engagedWith = null;
    }
    for (const creature of zone.creatures.values()) {
      if (creature.targetId !== player.entityId) continue;
      creature.targetId = null;
      creature.returningHome = true;
    }
    player.combatTargetId = null;
  }

  transfer(player: Player, location: ZoneLocation): void {
    this.despawn(player);
    player.relocate(location);
    this.spawn(player);
  }

  walk(player: Player, target: TilePoint): boolean {
    if (chebyshevDistance(player.position, target) > MAX_WALK_DISTANCE) return false;
    const path = this.zoneOf(player).pathBetween(player.position, target, false);
    if (!path) return false;
    player.path = path;
    return true;
  }

  approach(player: Player, target: TilePoint): boolean {
    const path = this.zoneOf(player).pathBetween(player.position, target, true);
    if (!path) return false;
    player.path = path;
    return true;
  }

  face(player: Player, target: TilePoint): void {
    player.facing = facingBetween(player.position, target, player.facing);
    this.zoneOf(player).broadcast({
      type: 'world.tick',
      movements: [{ entityId: player.entityId, position: player.position, facing: player.facing }],
    });
  }

  faceNpc(npc: Walker, target: TilePoint, zone: ZoneInstance): void {
    npc.facing = facingBetween(npc.position, target, npc.facing);
    npc.path = [];
    zone.broadcast({ type: 'world.tick', movements: [{ entityId: npc.entityId, position: npc.position, facing: npc.facing }] });
  }

  tick(): void {
    this.tickCount++;
    this.retireEmptyLayers();
    for (const zone of this.instances()) {
      if (zone.players.size === 0) continue;
      const movements: EntityMovement[] = [];
      for (const npc of zone.npcs.values()) this.advanceNpc(npc, zone, movements);
      for (const creature of zone.creatures.values()) this.advanceCreature(creature, zone, movements);

      const arrived: Player[] = [];
      for (const player of [...zone.players.values()]) {
        const next = player.path.shift();
        if (next) {
          player.facing = facingBetween(player.position, next, player.facing);
          player.position = next;
          movements.push({ entityId: player.entityId, position: next, facing: player.facing });
          this.refreshAreas(player, zone);
        }
        if (player.path.length === 0 && player.pendingInteraction) arrived.push(player);
      }

      if (movements.length > 0) zone.broadcast({ type: 'world.tick', movements });
      for (const player of arrived) {
        if (zone.players.has(player.entityId)) this.hooks.onPathCompleted(player);
      }
    }
  }

  private advanceNpc(npc: Npc, zone: ZoneInstance, movements: EntityMovement[]): void {
    if (npc.engagedWith) return;
    this.advanceWalker(npc, npc.definition.wanderRadius, zone, movements);
  }

  private advanceCreature(creature: Creature, zone: ZoneInstance, movements: EntityMovement[]): void {
    if (!creature.isAlive) return;
    this.advanceWalker(creature, creature.canWander ? creature.definition.wanderRadius : 0, zone, movements);
  }

  private advanceWalker(walker: Walker, wanderRadius: number, zone: ZoneInstance, movements: EntityMovement[]): void {
    if (walker.path.length === 0 && wanderRadius > 0 && this.random() < NPC_WANDER_CHANCE_PER_TICK) {
      walker.path = this.wanderPath(walker, wanderRadius, zone);
    }
    const next = walker.path.shift();
    if (!next) return;
    walker.facing = facingBetween(walker.position, next, walker.facing);
    walker.position = next;
    movements.push({ entityId: walker.entityId, position: next, facing: walker.facing });
  }

  private wanderPath(walker: Walker, radius: number, zone: ZoneInstance): TilePoint[] {
    const target = {
      x: walker.home.x + Math.round((this.random() * 2 - 1) * radius),
      y: walker.home.y + Math.round((this.random() * 2 - 1) * radius),
    };
    if (!zone.grid.isWalkable(target)) return [];
    return zone.pathBetween(walker.position, target, false, NPC_WANDER_SEARCH_LIMIT) ?? [];
  }

  private refreshAreas(player: Player, zone: ZoneInstance): void {
    const current = new Set(zone.areasAt(player.position).map((area) => area.id));
    const entered = [...current].filter((areaId) => !player.occupiedAreas.has(areaId));
    player.occupiedAreas = current;
    for (const areaId of entered) this.hooks.onAreaEntered(player, zone.id, areaId);
  }

  private chooseLayer(zoneId: ZoneId): ZoneInstance {
    const layers = this.layers.get(zoneId) ?? [];
    const definition = this.content.zones.get(zoneId) as ZoneDefinition;
    const capacity = this.capacityOf(definition);
    const open = layers.filter((layer) => layer.players.size < capacity).sort((a, b) => b.players.size - a.players.size || a.layer - b.layer)[0];
    if (open) return open;
    const used = new Set(layers.map((layer) => layer.layer));
    let next = 1;
    while (used.has(next)) next++;
    const created = new ZoneInstance(definition, this.content, next);
    this.layers.set(zoneId, [...layers, created].sort((a, b) => a.layer - b.layer));
    return created;
  }

  private retireEmptyLayers(): void {
    for (const [zoneId, layers] of this.layers) {
      const keep = layers.filter((layer) => {
        if (layer.layer === 1 || layer.players.size > 0) {
          layer.emptySinceTick = null;
          return true;
        }
        layer.emptySinceTick ??= this.tickCount;
        return this.tickCount - layer.emptySinceTick < EMPTY_LAYER_RETIREMENT_TICKS;
      });
      if (keep.length !== layers.length) this.layers.set(zoneId, keep);
    }
  }

  private fallbackZoneId(): ZoneId {
    const first = this.layers.keys().next().value;
    if (!first) throw new Error('The world has no zones.');
    return first;
  }
}
