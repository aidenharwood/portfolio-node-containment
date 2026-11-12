import type {
  CreatureDefinition,
  CreaturePlacement,
  EntityId,
  EntitySnapshot,
  EntityVitals,
  Facing,
  TilePoint,
} from '@containment/shared';
import { creatureAttackProfile, enragedSpeedTicks, sizeOf, type AttackProfile, type EncounterPhase, type FootprintSize, type GearMotif } from '@containment/shared';
import { EncounterState } from './encounterState.ts';

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
  blockedStep = false;
  diedAtTick = 0;
  respawnDelayTicks = 0;
  readonly contributors = new Set<EntityId>();
  engagedWith: EntityId | null = null;
  engagedUntilTick = 0;
  readonly encounter: EncounterState | null;
  readonly summoner: EntityId | null;

  constructor(placement: CreaturePlacement, definition: CreatureDefinition, summoner: EntityId | null = null) {
    this.entityId = `creature:${placement.instanceId}`;
    this.placement = placement;
    this.definition = definition;
    this.position = placement.position;
    this.integrity = definition.integrity;
    this.encounter = definition.encounter ? new EncounterState() : null;
    this.summoner = summoner;
  }

  get transient(): boolean {
    return this.summoner !== null;
  }

  private phaseValue<T>(pick: (phase: EncounterPhase) => T | undefined): T | undefined {
    const phases = this.definition.encounter?.phases ?? [];
    const reached = this.encounter?.phase ?? 0;
    for (let index = reached - 1; index >= 0; index--) {
      const value = pick(phases[index]!);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  attackProfile(): AttackProfile {
    const attack = this.phaseValue((phase) => phase.attack) ?? this.definition.attack;
    const profile = creatureAttackProfile({ ...this.definition, attack });
    return this.encounter?.enraged ? { ...profile, speedTicks: enragedSpeedTicks(profile.speedTicks, this.encounter.enrageFactor) } : profile;
  }

  get guard(): GearMotif | undefined {
    return this.phaseValue((phase) => phase.guard) ?? this.definition.guard;
  }

  get fightingDefinition(): CreatureDefinition {
    const guard = this.guard;
    return guard === this.definition.guard ? this.definition : { ...this.definition, guard };
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

  respawn(anchor: TilePoint = this.home): void {
    this.position = anchor;
    this.path = [];
    this.blockedStep = false;
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
      ...(this.encounter && this.encounter.phase > 0 ? { phase: this.encounter.phase } : {}),
      ...(this.encounter?.enraged ? { enraged: true } : {}),
    };
  }
}
