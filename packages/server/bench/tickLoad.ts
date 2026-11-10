import { performance } from 'node:perf_hooks';
import { createDefaultDraft, createObjectWalkabilityGrid, GAME_CONTENT, type ServerMessage, type TilePoint } from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { Gameplay } from '../src/gameplay/gameplay.ts';
import type { MessageSink, Player } from '../src/world/player.ts';

const LEVEL_ID = 'main-floor';
const WANDER_RADIUS = 16;
const WARMUP_TICKS = 20;
const MEASURED_TICKS = 200;
const TICK_BUDGET_MS = 300;

class CountingSink implements MessageSink {
  pending: ServerMessage[] = [];

  send(message: ServerMessage): void {
    this.pending.push(message);
  }

  detach(): void {}

  drainBytes(): number {
    const bytes = this.pending.reduce((total, message) => total + JSON.stringify(message).length, 0);
    this.pending = [];
    return bytes;
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const percentile = (sorted: readonly number[], fraction: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;

function run(playerCount: number): void {
  const level = GAME_CONTENT.levels.get(LEVEL_ID);
  if (!level) throw new Error(`Unknown level ${LEVEL_ID}.`);
  const grid = createObjectWalkabilityGrid(level.layout, level.objects, (objectId) => GAME_CONTENT.worldObjects.get(objectId));
  const walkable: TilePoint[] = [];
  for (let y = 0; y < level.layout.height; y++) {
    for (let x = 0; x < level.layout.width; x++) if (grid.isWalkable({ x, y })) walkable.push({ x, y });
  }
  const random = seededRandom(playerCount);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

  const gameplay = new Gameplay(GAME_CONTENT, { save: () => {}, findByName: () => null }, {
    tickMs: TICK_BUDGET_MS,
    autosaveIntervalMs: 3_600_000,
    random,
    combatRandom: random,
    gatheringRandom: random,
    levelCapacity: playerCount,
  });

  const players: { readonly player: Player; readonly sink: CountingSink }[] = [];
  for (let index = 0; index < playerCount; index++) {
    const created = createCharacterRecord({ ...createDefaultDraft(), name: `Load ${index}` }, { id: `load-${index}`, accountId: `load-account-${index}` }, GAME_CONTENT);
    const sink = new CountingSink();
    const player = gameplay.enterWorld({ ...created, quests: {}, location: { levelId: LEVEL_ID, position: pick(walkable) } }, sink);
    players.push({ player, sink });
  }

  const wander = () => {
    for (const { player } of players) {
      if (player.path.length > 0) continue;
      const nearby = { x: player.position.x + Math.round((random() * 2 - 1) * WANDER_RADIUS), y: player.position.y + Math.round((random() * 2 - 1) * WANDER_RADIUS) };
      if (grid.isWalkable(nearby)) gameplay.handle(player, { type: 'world.walk', target: nearby });
    }
  };

  const durations: number[] = [];
  let bytes = 0;
  for (let tick = 0; tick < WARMUP_TICKS + MEASURED_TICKS; tick++) {
    wander();
    const started = performance.now();
    gameplay.tick();
    const elapsed = performance.now() - started;
    const sent = players.reduce((total, { sink }) => total + sink.drainBytes(), 0);
    if (tick < WARMUP_TICKS) continue;
    durations.push(elapsed);
    bytes += sent;
  }

  const sorted = [...durations].sort((left, right) => left - right);
  const mean = durations.reduce((total, value) => total + value, 0) / durations.length;
  const perPlayerKbPerSecond = bytes / MEASURED_TICKS / playerCount / 1024 * (1000 / TICK_BUDGET_MS);
  console.log(
    [
      `${String(playerCount).padStart(5)} players`,
      `mean ${mean.toFixed(1)}ms`,
      `p95 ${percentile(sorted, 0.95).toFixed(1)}ms`,
      `max ${(sorted.at(-1) ?? 0).toFixed(1)}ms`,
      `budget used ${((percentile(sorted, 0.95) / TICK_BUDGET_MS) * 100).toFixed(0)}% at p95`,
      `~${perPlayerKbPerSecond.toFixed(1)} KB/s per player`,
    ].join(' · '),
  );
}

const counts = process.argv.slice(2).map(Number).filter((count) => Number.isInteger(count) && count > 0);
for (const count of counts.length > 0 ? counts : [100, 300, 600, 1000]) run(count);
