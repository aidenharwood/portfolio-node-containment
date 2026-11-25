import type { TileRect } from '@containment/shared';
import type { FarBuild } from '../far/farBuild.ts';
import type { Landmark } from '../far/farLandmarks.ts';
import type { FarCellSize } from '../far/farTerrainMesher.ts';
import type { SceneRaster } from '../far/sceneRaster.ts';
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

export interface RasterRequest {
  readonly id: number;
  readonly levelId: string;
  readonly kind: 'raster';
}

export interface FarRequest {
  readonly id: number;
  readonly levelId: string;
  readonly kind: 'far';
  readonly cell: FarCellSize;
}

export interface LandmarksRequest {
  readonly id: number;
  readonly levelId: string;
  readonly kind: 'landmarks';
}

export type WorkerRequest = StructureRequest | RasterRequest | FarRequest | LandmarksRequest;

export type WorkerResult =
  | { readonly id: number; readonly structure: PackedStructure }
  | { readonly id: number; readonly raster: SceneRaster }
  | { readonly id: number; readonly far: FarBuild }
  | { readonly id: number; readonly landmarks: readonly Landmark[] }
  | { readonly id: number; readonly error: string };

export type StructureReply = WorkerResult | { readonly ready: true };

interface Pending {
  readonly request: WorkerRequest;
  readonly priority: () => number;
  readonly job: PoolJob;
  readonly patience: number;
  readonly settle: (reply: WorkerResult) => void;
}

class PoolJob implements StructureJob {
  structure: ChunkStructure | null = null;
  failed = false;
  cancelled = false;
  started = false;
  private readonly onCancel: (job: PoolJob) => void;
  private readonly onFail: () => void;

  constructor(onCancel: (job: PoolJob) => void, onFail: () => void = () => undefined) {
    this.onCancel = onCancel;
    this.onFail = onFail;
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.onCancel(this);
  }

  fail(): void {
    if (this.failed) return;
    this.failed = true;
    this.onFail();
  }
}

export interface MesherWorker {
  onmessage: ((event: MessageEvent<StructureReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerRequest): void;
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
    for (const pending of [...this.queue, ...this.busy.values()]) pending.job.fail();
    this.queue = [];
  }

  private watch(worker: MesherWorker, pending: Pending): void {
    this.later(() => {
      if (this.broken || this.busy.get(worker) !== pending) return;
      pending.job.cancelled = true;
      pending.job.fail();
      this.busy.delete(worker);
      worker.terminate();
      this.timeouts++;
      if (this.timeouts >= MAX_TIMEOUTS) {
        this.breakDown();
        return;
      }
      this.idle.push(this.hire());
      this.pump();
    }, pending.patience);
  }

  get queued(): number {
    return this.queue.length;
  }

  get working(): number {
    return this.busy.size;
  }

  request(levelId: string, region: TileRect, priority: () => number): StructureJob {
    const job = new PoolJob((cancelled) => this.drop(cancelled));
    this.enqueue(job, (id) => ({ id, levelId, region }), priority, JOB_TIMEOUT_MS, (reply) => {
      if ('structure' in reply) job.structure = unpackStructure(reply.structure);
      else job.fail();
    });
    return job;
  }

  requestRaster(levelId: string, priority: () => number): Promise<SceneRaster> {
    return this.ask((id) => ({ id, levelId, kind: 'raster' }), priority, (reply) => ('raster' in reply ? reply.raster : null));
  }

  requestFar(levelId: string, cell: FarCellSize, priority: () => number): Promise<FarBuild> {
    return this.ask((id) => ({ id, levelId, kind: 'far', cell }), priority, (reply) => ('far' in reply ? reply.far : null));
  }

  requestLandmarks(levelId: string, priority: () => number): Promise<readonly Landmark[]> {
    return this.ask((id) => ({ id, levelId, kind: 'landmarks' }), priority, (reply) => ('landmarks' in reply ? reply.landmarks : null));
  }

  private ask<T>(make: (id: number) => WorkerRequest, priority: () => number, read: (reply: WorkerResult) => T | null): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const job = new PoolJob(
        (cancelled) => this.drop(cancelled),
        () => reject(new Error('The mesher pool could not finish the job.')),
      );
      this.enqueue(job, make, priority, FAR_TIMEOUT_MS, (reply) => {
        const value = read(reply);
        if (value === null) job.fail();
        else resolve(value);
      });
    });
  }

  private drop(job: PoolJob): void {
    this.queue = this.queue.filter((pending) => pending.job !== job);
  }

  private enqueue(job: PoolJob, make: (id: number) => WorkerRequest, priority: () => number, patience: number, settle: (reply: WorkerResult) => void): void {
    if (this.broken) {
      job.fail();
      return;
    }
    this.queue.push({ request: make(this.nextId++), priority, job, patience, settle });
    queueMicrotask(() => this.pump());
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

  private finish(worker: MesherWorker, reply: WorkerResult): void {
    const pending = this.busy.get(worker);
    this.busy.delete(worker);
    this.idle.push(worker);
    if (pending && pending.request.id === reply.id && !pending.job.cancelled) pending.settle(reply);
    this.pump();
  }

  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const worker of [...this.idle, ...this.busy.keys()]) worker.terminate();
    for (const pending of [...this.queue, ...this.busy.values()]) pending.job.fail();
    this.idle.length = 0;
    this.busy.clear();
    this.queue = [];
    this.broken = true;
  }
}

const MAX_WORKERS = 3;
const JOB_TIMEOUT_MS = 20000;
const FAR_TIMEOUT_MS = 120000;
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
