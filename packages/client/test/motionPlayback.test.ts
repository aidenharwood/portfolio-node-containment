import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Motion, TickClock } from '../src/state/motionPlayback.ts';

const TICK = 300;

test('the tick clock strips arrival jitter from tick times', () => {
  const clock = new TickClock(TICK);
  const lateness = [0, 4, 1, 7, 2, 0, 5];
  const ideals = lateness.map((late, index) => clock.observe(1000 + index * TICK + late));
  ideals.forEach((ideal, index) => assert.ok(Math.abs(ideal - (1000 + index * TICK)) < 1, `tick ${index} placed at ${ideal}`));
  assert.ok(clock.delayMs >= 7, `delay ${clock.delayMs} covers the latest arrival`);
  assert.ok(clock.delayMs <= 20, `delay ${clock.delayMs} stays small on a steady link`);
});

test('the tick clock follows a server whose ticks drift slowly', () => {
  const clock = new TickClock(TICK);
  for (let index = 0; index < 400; index++) clock.observe(index * (TICK + 1));
  assert.ok(clock.delayMs < 40, `delay ${clock.delayMs} stays bounded under drift`);
});

test('the tick clock re-anchors after the server tick phase shifts', () => {
  const clock = new TickClock(TICK);
  for (let index = 0; index < 5; index++) clock.observe(index * TICK);
  const shifted = 5 * TICK + 140;
  assert.equal(clock.observe(shifted), shifted);
  assert.equal(clock.observe(shifted + TICK + 2), shifted + TICK);
});

const walk = (motion: Motion, clock: TickClock, arrivals: readonly number[]) => {
  arrivals.forEach((arrivedAt, index) => motion.push({ x: index + 1, y: 0 }, clock.observe(arrivedAt), arrivedAt - clock.delayMs));
};

test('a walk keeps moving across tiles when ticks arrive a little late', () => {
  const clock = new TickClock(TICK);
  for (let index = 0; index < 10; index++) clock.observe(index * TICK + (index % 3) * 3);
  const motion = new Motion({ x: 0, y: 0 });
  const arrivals = [10, 11, 12, 13].map((tick, index) => tick * TICK + [6, 1, 8, 3][index]!);
  walk(motion, clock, arrivals);
  let previous = -Infinity;
  for (let now = 10 * TICK + clock.delayMs + 1; now < 14 * TICK; now += 16.7) {
    const playbackAt = now - clock.delayMs;
    motion.advance(playbackAt, TICK);
    const { x } = motion.positionAt(playbackAt, TICK);
    assert.ok(motion.isMoving(playbackAt, TICK), `moving at ${now.toFixed(1)}`);
    assert.ok(x > previous, `advancing at ${now.toFixed(1)}: ${x} after ${previous}`);
    previous = x;
  }
});

test('a walk plays every tile at one tile per tick and stops on the last', () => {
  const clock = new TickClock(TICK);
  const motion = new Motion({ x: 0, y: 0 });
  walk(motion, clock, [0, TICK, 2 * TICK]);
  const at = (playbackAt: number) => {
    motion.advance(playbackAt, TICK);
    return motion.positionAt(playbackAt, TICK).x;
  };
  assert.equal(at(TICK / 2), 0.5);
  assert.equal(at(TICK * 1.5), 1.5);
  assert.equal(at(TICK * 3), 3);
  assert.equal(motion.isMoving(TICK * 4, TICK), false);
  assert.equal(motion.endsAt(TICK), TICK * 3);
});

test('a step that arrives too late starts where the entity stands instead of jumping ahead', () => {
  const motion = new Motion({ x: 0, y: 0 });
  motion.push({ x: 1, y: 0 }, 0, 0);
  motion.advance(TICK * 2, TICK);
  motion.push({ x: 2, y: 0 }, TICK, TICK * 2);
  motion.advance(TICK * 2, TICK);
  assert.deepEqual(motion.positionAt(TICK * 2, TICK), { x: 1, y: 0 });
  assert.deepEqual(motion.positionAt(TICK * 2.5, TICK), { x: 1.5, y: 0 });
});
