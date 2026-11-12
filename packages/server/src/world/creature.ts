import type {
  CreatureDefinition,
  CreaturePlacement,
  EntityId,
  EntitySnapshot,
  EntityVitals,
  Facing,
  TilePoint,
} from '@containment/shared';
import { sizeOf, type FootprintSize } from '@containment/shared';

export type CreatureState = 'alive' | 'dying' | 'despawned';

export class Creature {
  readonly entityId: EntityId;
  readonly placement: CreaturePlacement;
  readonly definition: CreatureDefinition;
  position: TilePoint;
  facing: Facing = 'south';
  path: TilePoint[] = [];
  integrity: number;
  state: CreatureState = 'alive';
  targetId: EntityId | null = null;
  returningHome = false;
  nextAttackTick = 0;
  lastPathTick = -Infinity;
  diedAtTick = 0;
  respawnDelayTicks = 0;
  readonly contributors = new Set<EntityId>();
  engagedWith: EntityId | null = null;
  engagedUntilTick = 0;

  constructor(placement: CreaturePlacement, definition: CreatureDefinition) {
    this.entityId = `creature:${placement.instanceId}`;
    this.placement = placement;
    this.definition = definition;
    this.position = placement.position;
    this.integrity = definition.integrity;
  }

  get size(): FootprintSize {
    return sizeOf(this.definition);
  }

  get home(): TilePoint {
    return this.placement.position;
  }

  get isAlive(): boolean {
    return this.state === 'alive';
  }

  get canWander(): boolean {
    return this.isAlive && this.targetId === null && !this.returningHome;
  }

  vitals(): EntityVitals {
    return { integrity: this.integrity, maxIntegrity: this.definition.integrity };
  }

  respawn(): void {
    this.position = this.home;
    this.path = [];
    this.integrity = this.definition.integrity;
    this.state = 'alive';
    this.targetId = null;
    this.returningHome = false;
    this.engagedWith = null;
    this.contributors.clear();
  }

  snapshot(): EntitySnapshot {
    return {
      id: this.entityId,
      kind: 'creature',
      name: this.definition.name,
      title: this.definition.designation ?? '',
      position: this.position,
      facing: this.facing,
      appearance: null,
      gear: [],
      creatureId: this.definition.id,
      level: this.definition.level,
      vitals: this.vitals(),
    };
  }
}
