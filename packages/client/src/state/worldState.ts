import {
  GAME_CONTENT,
  parseZoneLayout,
  WEAPON_KIND_INFO,
  type EntityId,
  type EntityVitals,
  type GroundItemSnapshot,
  type EntitySnapshot,
  type Facing,
  type ItemId,
  type SelfState,
  type ServerMessageOf,
  type CreatureId,
  type TilePoint,
  type ZoneDefinition,
  type ZoneLayout,
  type ProjectileKind,
  type WeaponKind,
} from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';

export interface ClientEntity {
  readonly id: EntityId;
  readonly kind: EntitySnapshot['kind'];
  readonly name: string;
  readonly title: string;
  readonly npcId: string | undefined;
  readonly creatureId: CreatureId | undefined;
  readonly level: number | undefined;
  readonly appearance: EntitySnapshot['appearance'];
  vitals: EntityVitals | undefined;
  lastCombatAt: number;
  attackAt: number;
  attackWeapon: WeaponKind | null;
  hurtAt: number;
  dyingAt: number | null;
  gear: readonly ItemId[];
  facing: Facing;
  from: TilePoint;
  to: TilePoint;
  movedAt: number;
  walkPhase: number;
  speech: { text: string; until: number } | null;
}

export interface ActiveZone {
  readonly definition: ZoneDefinition;
  readonly layout: ZoneLayout;
}

type WorldEvent = 'zoneChanged' | 'selfChanged' | 'vitalsChanged';

export interface CombatHitEvent {
  readonly attackerId: EntityId;
  readonly targetId: EntityId;
  readonly outcome: 'hit' | 'miss';
  readonly damage: number;
  readonly style: 'melee' | 'ranged';
  readonly weapon: WeaponKind | null;
  readonly projectile: ProjectileKind | null;
  readonly at: number;
  readonly impactAt: number;
}

const SPEECH_DURATION_MS = 4500;
const PROJECTILE_BASE_FLIGHT_MS = 120;
const PROJECTILE_FLIGHT_MS_PER_TILE = 70;

const PROJECTILE_FLIGHT_SCALE: Readonly<Record<ProjectileKind, number>> = {
  dart: 0.9,
  bolt: 1,
  tracer: 0.35,
  pellets: 0.6,
  spit: 1.25,
};

export const projectileFlightMs = (kind: ProjectileKind, from: TilePoint, to: TilePoint): number =>
  (PROJECTILE_BASE_FLIGHT_MS + Math.hypot(to.x - from.x, to.y - from.y) * PROJECTILE_FLIGHT_MS_PER_TILE) * PROJECTILE_FLIGHT_SCALE[kind];

const projectileOf = (style: 'melee' | 'ranged', weapon: WeaponKind | null): ProjectileKind | null => {
  if (style !== 'ranged') return null;
  return weapon ? (WEAPON_KIND_INFO[weapon].projectile ?? 'bolt') : 'spit';
};

export class WorldState {
  zone: ActiveZone | null = null;
  selfEntityId: EntityId | null = null;
  tickMs = 300;
  layer = 1;
  self: SelfState | null = null;
  selfVitals: EntityVitals | null = null;
  combatTargetId: EntityId | null = null;
  private readonly hitListeners = new Set<(event: CombatHitEvent) => void>();
  readonly entities = new Map<EntityId, ClientEntity>();
  readonly groundItems = new Map<string, GroundItemSnapshot>();
  readonly depletedObjects = new Set<string>();
  private readonly listeners = new Map<WorldEvent, Set<() => void>>();
  private readonly unsubscribers: (() => void)[] = [];

  constructor(connection: GameConnection) {
    this.unsubscribers.push(
      connection.on('world.entered', (message) => this.enterZone(message)),
      connection.on('world.entitySpawned', ({ entity }) => this.entities.set(entity.id, toClientEntity(entity))),
      connection.on('world.entityDespawned', ({ entityId }) => this.entities.delete(entityId)),
      connection.on('world.tick', (message) => this.applyMovements(message)),
      connection.on('world.entityGearChanged', ({ entityId, gear }) => {
        const entity = this.entities.get(entityId);
        if (entity) entity.gear = gear;
      }),
      connection.on('world.speech', ({ entityId, text }) => {
        const entity = this.entities.get(entityId);
        if (entity) entity.speech = { text, until: performance.now() + SPEECH_DURATION_MS };
      }),
      connection.on('player.state', ({ self }) => {
        this.self = self;
        this.selfVitals = self.vitals;
        this.emit('selfChanged');
        this.emit('vitalsChanged');
      }),
      connection.on('player.vitals', ({ vitals, targetId }) => {
        this.selfVitals = vitals;
        this.combatTargetId = targetId;
        this.emit('vitalsChanged');
      }),
      connection.on('combat.hit', (message) => this.applyHit(message)),
      connection.on('world.groundItemAdded', ({ item }) => this.groundItems.set(item.id, item)),
      connection.on('world.groundItemRemoved', ({ id }) => this.groundItems.delete(id)),
      connection.on('world.objectDepleted', ({ instanceId, depleted }) => {
        if (depleted) this.depletedObjects.add(instanceId);
        else this.depletedObjects.delete(instanceId);
      }),
      connection.on('combat.death', ({ entityId }) => {
        const entity = this.entities.get(entityId);
        if (entity) entity.dyingAt = performance.now();
        if (entityId === this.combatTargetId) this.combatTargetId = null;
      }),
    );
  }

  get selfEntity(): ClientEntity | undefined {
    return this.selfEntityId ? this.entities.get(this.selfEntityId) : undefined;
  }

  on(event: WorldEvent, listener: () => void): () => void {
    const bucket = this.listeners.get(event) ?? new Set();
    bucket.add(listener);
    this.listeners.set(event, bucket);
    return () => bucket.delete(listener);
  }

  onCombatHit(listener: (event: CombatHitEvent) => void): () => void {
    this.hitListeners.add(listener);
    return () => this.hitListeners.delete(listener);
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.listeners.clear();
  }

  renderPosition(entity: ClientEntity, now: number): TilePoint {
    const progress = this.movementProgress(entity, now);
    return {
      x: entity.from.x + (entity.to.x - entity.from.x) * progress,
      y: entity.from.y + (entity.to.y - entity.from.y) * progress,
    };
  }

  isMoving(entity: ClientEntity, now: number): boolean {
    return this.movementProgress(entity, now) < 1 && (entity.from.x !== entity.to.x || entity.from.y !== entity.to.y);
  }

  private movementProgress(entity: ClientEntity, now: number): number {
    return Math.min(1, (now - entity.movedAt) / this.tickMs);
  }

  private applyHit(message: ServerMessageOf<'combat.hit'>): void {
    const now = performance.now();
    const attacker = this.entities.get(message.attackerId);
    const target = this.entities.get(message.targetId);
    const weapon = message.weapon ?? null;
    const projectile = projectileOf(message.style, weapon);
    if (attacker) {
      attacker.attackAt = now;
      attacker.attackWeapon = weapon;
      attacker.lastCombatAt = now;
    }
    const impactAt = projectile && attacker && target ? now + projectileFlightMs(projectile, attacker.to, target.to) : now;
    if (target) {
      target.vitals = message.vitals;
      target.lastCombatAt = now;
      if (message.outcome === 'hit') target.hurtAt = impactAt;
    }
    if (message.targetId === this.selfEntityId) this.selfVitals = message.vitals;
    const event: CombatHitEvent = { ...message, weapon, projectile, at: now, impactAt };
    for (const listener of this.hitListeners) listener(event);
  }

  private enterZone(message: ServerMessageOf<'world.entered'>): void {
    const definition = GAME_CONTENT.zones.get(message.zoneId);
    if (!definition) return;
    this.zone = { definition, layout: parseZoneLayout(definition.map) };
    this.selfEntityId = message.selfEntityId;
    this.tickMs = message.tickMs;
    this.layer = message.layer;
    this.entities.clear();
    this.combatTargetId = null;
    for (const entity of message.entities) this.entities.set(entity.id, toClientEntity(entity));
    this.groundItems.clear();
    for (const item of message.groundItems) this.groundItems.set(item.id, item);
    this.depletedObjects.clear();
    for (const instanceId of message.depletedObjects) this.depletedObjects.add(instanceId);
    this.emit('zoneChanged');
  }

  private applyMovements(message: ServerMessageOf<'world.tick'>): void {
    const now = performance.now();
    for (const movement of message.movements) {
      const entity = this.entities.get(movement.entityId);
      if (!entity) continue;
      entity.facing = movement.facing;
      if (entity.to.x === movement.position.x && entity.to.y === movement.position.y) continue;
      entity.from = this.renderPosition(entity, now);
      entity.to = movement.position;
      entity.movedAt = now;
    }
  }

  private emit(event: WorldEvent): void {
    for (const listener of this.listeners.get(event) ?? []) listener();
  }
}

function toClientEntity(snapshot: EntitySnapshot): ClientEntity {
  return {
    id: snapshot.id,
    kind: snapshot.kind,
    name: snapshot.name,
    title: snapshot.title,
    npcId: snapshot.npcId,
    creatureId: snapshot.creatureId,
    level: snapshot.level,
    appearance: snapshot.appearance,
    vitals: snapshot.vitals,
    lastCombatAt: -Infinity,
    attackAt: -Infinity,
    attackWeapon: null,
    hurtAt: -Infinity,
    dyingAt: null,
    gear: snapshot.gear,
    facing: snapshot.facing,
    from: snapshot.position,
    to: snapshot.position,
    movedAt: 0,
    walkPhase: 0,
    speech: null,
  };
}
