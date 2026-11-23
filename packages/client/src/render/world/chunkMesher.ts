import type { TileRect } from '@containment/shared';
import { unpackStructure, type ChunkStructure, type PackedStructure } from './chunkStructure.ts';

export interface StructureJob {
  readonly structure: ChunkStructure | null;
  readonly failed: boolean;
  cancel(): void;
}

export interface StructureRequest {
  readonly id: number;
  readonly levelId: string;
  readonly region: TileRect;
}

export type StructureReply = { readonly id: number; readonly structure: PackedStructure } | { readonly id: number; readonly error: string } | { readonly ready: true };

interface Pending {
  readonly request: StructureRequest;
  readonly priority: () => number;
  readonly job: PoolJob;
}

class PoolJob implements StructureJob {
  structure: ChunkStructure | null = null;
  failed = false;
  cancelled = false;
  started = false;
  private readonly onCancel: (job: PoolJob) => void;

  constructor(onCancel: (job: PoolJob) => void) {
    this.onCancel = onCancel;
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.onCancel(this);
  }
}

export interface MesherWorker {
  onmessage: ((event: MessageEvent<StructureReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: StructureRequest): void;
  terminate(): void;
}

export class ChunkMesherPool {
  private readonly idle: MesherWorker[] = [];
  private readonly busy = new Map<MesherWorker, Pending>();
  private queue: Pending[] = [];
  private nextId = 0;
  private broken = false;

  private readonly spawn: () => MesherWorker;
  private readonly ready = new WeakSet<MesherWorker>();
  private timeouts = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(size: number, spawn: () => MesherWorker) {
    this.spawn = spawn;
    for (let index = 0; index < size; index++) this.idle.push(this.hire());
  }

  private hire(): MesherWorker {
    const worker = this.spawn();
    worker.onmessage = (event) => {
      const reply = event.data;
      if ('ready' in reply) {
        this.ready.add(worker);
        const pending = this.busy.get(worker);
        if (pending) this.watch(worker, pending);
        return;
      }
      this.finish(worker, reply);
    };
    this.later(() => {
      if (!this.broken && !this.ready.has(worker)) {
        worker.terminate();
        this.breakDown();
        this.busy.delete(worker);
      }
    }, BOOT_TIMEOUT_MS);
    worker.onerror = (event) => {
      event.preventDefault();
      worker.terminate();
      this.breakDown();
      this.busy.delete(worker);
    };
    return worker;
  }

  private later(run: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, ms);
    this.timers.add(timer);
  }

  private breakDown(): void {
    this.broken = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const worker of this.idle) worker.terminate();
    this.idle.length = 0;
    for (const pending of [...this.queue, ...this.busy.values()]) pending.job.failed = true;
    this.queue = [];
  }

  private watch(worker: MesherWorker, pending: Pending): void {
    this.later(() => {
      if (this.broken || this.busy.get(worker) !== pending) return;
      pending.job.failed = true;
      pending.job.cancelled = true;
      this.busy.delete(worker);
      worker.terminate();
      this.timeouts++;
      if (this.timeouts >= MAX_TIMEOUTS) {
        this.breakDown();
        return;
      }
      this.idle.push(this.hire());
      this.pump();
    }, JOB_TIMEOUT_MS);
  }

  get queued(): number {
    return this.queue.length;
  }

  get working(): number {
    return this.busy.size;
  }

  request(levelId: string, region: TileRect, priority: () => number): StructureJob {
    const job = new PoolJob((cancelled) => {
      this.queue = this.queue.filter((pending) => pending.job !== cancelled);
    });
    if (this.broken) {
      job.failed = true;
      return job;
    }
    this.queue.push({ request: { id: this.nextId++, levelId, region }, priority, job });
    queueMicrotask(() => this.pump());
    return job;
  }

  private pump(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      let best = 0;
      let bestScore = Infinity;
      this.queue.forEach((pending, index) => {
        const score = pending.priority();
        if (score < bestScore) {
          bestScore = score;
          best = index;
        }
      });
      const [pending] = this.queue.splice(best, 1);
      const worker = this.idle.pop();
      if (!pending || !worker) return;
      this.busy.set(worker, pending);
      pending.job.started = true;
      worker.postMessage(pending.request);
      if (this.ready.has(worker)) this.watch(worker, pending);
    }
  }

  private finish(worker: MesherWorker, reply: Exclude<StructureReply, { readonly ready: true }>): void {
    const pending = this.busy.get(worker);
    this.busy.delete(worker);
    this.idle.push(worker);
    if (pending && pending.request.id === reply.id && !pending.job.cancelled) {
      if ('structure' in reply) pending.job.structure = unpackStructure(reply.structure);
      else pending.job.failed = true;
    }
    this.pump();
  }

  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const worker of [...this.idle, ...this.busy.keys()]) worker.terminate();
    for (const pending of [...this.queue, ...this.busy.values()]) pending.job.failed = true;
    this.idle.length = 0;
    this.busy.clear();
    this.queue = [];
    this.broken = true;
  }
}

const MAX_WORKERS = 3;
const JOB_TIMEOUT_MS = 20000;
const MAX_TIMEOUTS = 3;
const BOOT_TIMEOUT_MS = 60000;
let shared: ChunkMesherPool | null | undefined;

export function chunkMesherPool(): ChunkMesherPool | null {
  if (shared !== undefined) return shared;
  if (typeof Worker === 'undefined') {
    shared = null;
    return shared;
  }
  const size = Math.max(1, Math.min(MAX_WORKERS, (navigator.hardwareConcurrency || 4) - 1));
  shared = new ChunkMesherPool(size, () => new Worker(new URL('./chunkWorker.ts', import.meta.url), { type: 'module' }) as MesherWorker);
  return shared;
}
