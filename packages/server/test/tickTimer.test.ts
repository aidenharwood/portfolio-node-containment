import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startTickTimer, type TickTimerClock } from '../src/tickTimer.ts';

class FakeClock implements TickTimerClock {
  time = 0;
  private pending: { readonly at: number; readonly callback: () => void } | null = null;

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, delayMs: number): unknown {
    this.pending = { at: this.time + delayMs, callback };
    return this.pending;
  }

  clearTimeout(): void {
    this.pending = null;
  }

  fire(lateMs = 0): boolean {
    const pending = this.pending;
    if (!pending) return false;
    this.pending = null;
    this.time = pending.at + lateMs;
    pending.callback();
    return true;
  }
}

test('ticks stay on the period grid when timers fire late', () => {
  const clock = new FakeClock();
  const ticks: number[] = [];
  startTickTimer(300, () => ticks.push(clock.now()), clock);
  for (let index = 0; index < 50; index++) clock.fire(3);
  assert.equal(ticks.length, 50);
  assert.ok(Math.abs(ticks.at(-1)! - 50 * 300) <= 3, `last tick at ${ticks.at(-1)}`);
});

test('a tick that overruns by more than a period skips ahead on the same grid', () => {
  const clock = new FakeClock();
  const ticks: number[] = [];
  startTickTimer(300, () => {
    ticks.push(clock.now());
    if (ticks.length === 1) clock.time += 700;
  }, clock);
  clock.fire();
  clock.fire();
  assert.deepEqual(ticks, [300, 1200]);
});

test('stopping the timer cancels the next tick', () => {
  const clock = new FakeClock();
  let count = 0;
  const stop = startTickTimer(300, () => count++, clock);
  clock.fire();
  stop();
  assert.equal(clock.fire(), false);
  assert.equal(count, 1);
});
