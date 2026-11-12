import type { EntityId, TilePoint } from '@containment/shared';

export interface PendingTelegraph {
  readonly mechanicId: string;
  readonly tiles: readonly TilePoint[];
  readonly resolvesAtTick: number;
}

export class EncounterState {
  phase = 0;
  pulledAtTick: number | null = null;
  pending: PendingTelegraph | null = null;
  enraged = false;
  enrageFactor = 1;
  readonly readyAtTick = new Map<string, number>();
  readonly hazards = new Map<string, readonly TilePoint[]>();
  readonly summons = new Set<EntityId>();
  readonly firedSummons = new Set<string>();

  get engaged(): boolean {
    return this.pulledAtTick !== null;
  }

  clear(): void {
    this.phase = 0;
    this.pulledAtTick = null;
    this.pending = null;
    this.enraged = false;
    this.enrageFactor = 1;
    this.readyAtTick.clear();
    this.hazards.clear();
    this.summons.clear();
    this.firedSummons.clear();
  }
}
