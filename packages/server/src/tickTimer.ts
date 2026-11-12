import { performance } from 'node:perf_hooks';

export interface TickTimerClock {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

const systemClock: TickTimerClock = {
  now: () => performance.now(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function startTickTimer(periodMs: number, onTick: () => void, clock: TickTimerClock = systemClock): () => void {
  let dueAt = clock.now() + periodMs;
  let handle: unknown = null;
  let stopped = false;
  const schedule = () => {
    handle = clock.setTimeout(run, Math.max(0, dueAt - clock.now()));
  };
  const run = () => {
    if (stopped) return;
    onTick();
    dueAt += periodMs;
    const now = clock.now();
    if (now - dueAt > periodMs) dueAt = now + periodMs - ((now - dueAt) % periodMs);
    schedule();
  };
  schedule();
  return () => {
    stopped = true;
    clock.clearTimeout(handle);
  };
}
