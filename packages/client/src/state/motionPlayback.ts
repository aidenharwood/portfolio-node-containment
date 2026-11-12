import type { TilePoint } from '@containment/shared';

const MIN_DELAY_MS = 10;
const DELAY_MARGIN_MS = 6;
const SPREAD_DECAY = 0.97;
const ANCHOR_FOLLOW = 0.05;
const MOVING_GRACE_FRACTION = 0.2;

export class TickClock {
  private periodMs: number;
  private anchor: number | null = null;
  private spread = 0;

  constructor(periodMs: number) {
    this.periodMs = periodMs;
  }

  reset(periodMs: number): void {
    this.periodMs = periodMs;
    this.anchor = null;
    this.spread = 0;
  }

  get delayMs(): number {
    return Math.min(this.maxLateness, Math.max(MIN_DELAY_MS, this.spread + DELAY_MARGIN_MS));
  }

  observe(arrivedAt: number): number {
    if (this.anchor === null) {
      this.anchor = arrivedAt;
      return arrivedAt;
    }
    const ideal = this.anchor + Math.round((arrivedAt - this.anchor) / this.periodMs) * this.periodMs;
    const late = arrivedAt - ideal;
    if (late < 0) {
      this.anchor += late;
      return arrivedAt;
    }
    if (late > this.maxLateness) {
      this.anchor = arrivedAt;
      return arrivedAt;
    }
    this.spread = Math.max(late, this.spread * SPREAD_DECAY);
    this.anchor += late * ANCHOR_FOLLOW;
    return ideal;
  }

  private get maxLateness(): number {
    return this.periodMs / 3;
  }
}

interface MotionStep {
  readonly to: TilePoint;
  readonly startAt: number;
}

export class Motion {
  from: TilePoint;
  to: TilePoint;
  private startAt = -Infinity;
  private readonly queue: MotionStep[] = [];

  constructor(position: TilePoint) {
    this.from = position;
    this.to = position;
  }

  push(to: TilePoint, startAt: number, playbackAt: number): void {
    const last = this.queue.at(-1);
    this.queue.push({ to, startAt: Math.max(startAt, playbackAt, last?.startAt ?? -Infinity) });
  }

  advance(playbackAt: number, durationMs: number): void {
    let step = this.queue[0];
    while (step && step.startAt <= playbackAt) {
      this.from = this.positionAt(step.startAt, durationMs);
      this.to = step.to;
      this.startAt = step.startAt;
      this.queue.shift();
      step = this.queue[0];
    }
  }

  positionAt(playbackAt: number, durationMs: number): TilePoint {
    const progress = Math.min(1, Math.max(0, (playbackAt - this.startAt) / durationMs));
    return { x: this.from.x + (this.to.x - this.from.x) * progress, y: this.from.y + (this.to.y - this.from.y) * progress };
  }

  isMoving(playbackAt: number, durationMs: number): boolean {
    if (this.from.x === this.to.x && this.from.y === this.to.y) return false;
    return playbackAt - this.startAt < durationMs * (1 + MOVING_GRACE_FRACTION);
  }

  endsAt(durationMs: number): number {
    return (this.queue.at(-1)?.startAt ?? this.startAt) + durationMs;
  }
}
