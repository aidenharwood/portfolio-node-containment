import {
  equippedItemIds,
  maxIntegrityFor,
  type EntityVitals,
  type AreaId,
  type CharacterRecord,
  type CraftingStation,
  type DialogueId,
  type EntityId,
  type EntitySnapshot,
  type Facing,
  type InstanceId,
  type ServerMessage,
  type TilePoint,
  type ChunkCoord,
  type LevelId,
  type WorldLocation,
  type TramStationId,
} from '@containment/shared';

export interface MessageSink {
  send(message: ServerMessage): void;
  detach(reason: string): void;
}

export interface PendingInteraction {
  readonly kind: 'npc' | 'object' | 'groundItem';
  readonly instanceId: InstanceId;
  readonly interactionIndex: number;
  readonly repathAttempts: number;
}

export type PlayerActivity =
  | { readonly kind: 'gather'; readonly instanceId: InstanceId; readonly interactionIndex: number; readonly nextTick: number }
  | { readonly kind: 'craft'; readonly recipeId: string; readonly remaining: number; readonly nextTick: number }
  | {
      readonly kind: 'tram';
      readonly stage: 'boarding' | 'riding';
      readonly originStationId: TramStationId;
      readonly destinationStationId: TramStationId;
      readonly rideTicks: number;
      readonly dueTick: number;
    };

export interface DialogueSession {
  readonly dialogueId: DialogueId;
  readonly nodeId: string;
  readonly npcInstanceId: InstanceId;
}

export const playerEntityId = (characterId: string): EntityId => `player:${characterId}`;

export class Player {
  readonly entityId: EntityId;
  readonly sink: MessageSink;
  record: CharacterRecord;
  position: TilePoint;
  facing: Facing = 'south';
  path: TilePoint[] = [];
  pendingInteraction: PendingInteraction | null = null;
  dialogue: DialogueSession | null = null;
  occupiedAreas = new Set<AreaId>();
  combatTargetId: EntityId | null = null;
  containTargetId: EntityId | null = null;
  finishingTargetId: EntityId | null = null;
  heldFireOn: EntityId | null = null;
  shopSession: { readonly shopId: string; readonly keeperInstanceId: InstanceId | null } | null = null;
  activity: PlayerActivity | null = null;
  craftingStation: CraftingStation | null = null;
  storageOpen = false;
  engagedWith: EntityId | null = null;
  engagedUntilTick = 0;
  nextAttackTick = 0;
  nextConsumableTick = 0;
  lastCombatTick = -Infinity;
  lastChaseTarget: TilePoint | null = null;
  incapacitatedAtTick: number | null = null;
  interestChunk: ChunkCoord | null = null;
  private stateDirty = true;

  constructor(record: CharacterRecord, sink: MessageSink) {
    this.entityId = playerEntityId(record.id);
    this.record = record;
    this.sink = sink;
    this.position = record.location.position;
  }

  get levelId(): LevelId {
    return this.record.location.levelId;
  }

  send(message: ServerMessage): void {
    this.sink.send(message);
  }

  update(changes: Partial<CharacterRecord>): void {
    this.record = { ...this.record, ...changes };
    this.stateDirty = true;
  }

  relocate(location: WorldLocation): void {
    this.record = { ...this.record, location };
    this.position = location.position;
    this.path = [];
    this.pendingInteraction = null;
    this.occupiedAreas = new Set();
  }

  consumeStateDirty(): boolean {
    const wasDirty = this.stateDirty;
    this.stateDirty = false;
    return wasDirty;
  }

  get maxIntegrity(): number {
    return maxIntegrityFor(this.record.skills);
  }

  get integrity(): number {
    return Math.min(this.record.vitals.integrity, this.maxIntegrity);
  }

  get isIncapacitated(): boolean {
    return this.integrity <= 0;
  }

  get isRidingTram(): boolean {
    return this.activity?.kind === 'tram' && this.activity.stage === 'riding';
  }

  addFlag(flag: string): boolean {
    if (this.hasFlag(flag)) return false;
    this.update({ flags: [...this.record.flags, flag] });
    return true;
  }

  vitals(): EntityVitals {
    return { integrity: this.integrity, maxIntegrity: this.maxIntegrity };
  }

  setIntegrity(value: number): void {
    const integrity = Math.max(0, Math.min(this.maxIntegrity, Math.round(value)));
    this.record = { ...this.record, vitals: { integrity } };
    this.sendVitals();
  }

  sendVitals(): void {
    this.send({ type: 'player.vitals', vitals: this.vitals(), targetId: this.combatTargetId });
  }

  hasFlag(flag: string): boolean {
    return this.record.flags.includes(flag);
  }

  persistableRecord(): CharacterRecord {
    return { ...this.record, location: { levelId: this.levelId, position: this.position } };
  }

  snapshot(): EntitySnapshot {
    return {
      id: this.entityId,
      kind: 'player',
      name: this.record.name,
      title: '',
      position: this.position,
      facing: this.facing,
      appearance: this.record.appearance,
      gear: equippedItemIds(this.record.equipment),
      vitals: this.vitals(),
    };
  }
}
