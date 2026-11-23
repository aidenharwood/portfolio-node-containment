import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { MeshBasicMaterial, type BufferGeometry } from 'three';
import { zoneOfLevel } from '../src/editor/previewLevel.ts';
import { DenseVolume } from '../src/render/voxel/denseVolume.ts';
import { meshVoxels } from '../src/render/voxel/voxelMesher.ts';
import { ChunkMesherPool, type MesherWorker, type StructureReply, type StructureRequest } from '../src/render/world/chunkMesher.ts';
import { ownedLayoutOf, packStructure, planChunkStructure, unpackStructure, type ChunkStructure } from '../src/render/world/chunkStructure.ts';
import { ChunkView, chunkRegion } from '../src/render/world/chunkView.ts';
import { decalsForLevel } from '../src/render/world/floorDecals.ts';

const level = FIXTURE_CONTENT.levels.get('fx-wilds');
assert.ok(level);
const wilds = zoneOfLevel(FIXTURE_CONTENT, level);
const region = chunkRegion({ cx: 1, cy: 0 }, wilds);
assert.ok(region);

const upFaces = (geometry: BufferGeometry | null): number => {
  if (!geometry) return 0;
  const normals = geometry.getAttribute('normal');
  let faces = 0;
  for (let vertex = 0; vertex < normals.count; vertex += 4) if (normals.getY(vertex) === 1) faces++;
  return faces;
};

const topArea = (geometry: BufferGeometry | null, width: number, depth: number): number => {
  if (!geometry) return 0;
  const uvs = geometry.getAttribute('uv');
  let area = 0;
  for (let vertex = 0; vertex < uvs.count; vertex += 4) {
    area += Math.round((uvs.getX(vertex + 2) - uvs.getX(vertex)) * width) * Math.round((uvs.getY(vertex + 2) - uvs.getY(vertex)) * depth);
  }
  return area;
};

const runPlan = (): ChunkStructure => {
  const plan = planChunkStructure(ownedLayoutOf(wilds.definition, wilds.layout), decalsForLevel(wilds.definition), region);
  for (const step of plan.steps) step();
  return plan.result();
};

test('a top sink takes the evenly lit tops and leaves every other face to the mesher', () => {
  const volume = new DenseVolume(6, 4, 6);
  for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) for (let y = 0; y < (x < 3 ? 1 : 2); y++) volume.set(x, y, z, 0x336699);
  const bounds = { min: [0, 0, 0] as const, max: [6, 4, 6] as const };
  const options = { voxelSize: 1, origin: [0, 0, 0] as const };
  const plain = meshVoxels(volume, bounds, options);
  const plainUp = upFaces(plain.solid);
  const plainCount = plain.solid!.index!.count;
  const taken: number[] = [];
  const sunk = meshVoxels(volume, bounds, { ...options, topSink: (x, y, z, color, shade) => (taken.push(color, shade), true) });
  assert.equal(plainUp, 36);
  assert.ok(taken.length / 2 > 0 && taken.length / 2 < plainUp, String(taken.length / 2));
  assert.equal(upFaces(sunk.solid) + taken.length / 2, plainUp);
  assert.equal(sunk.solid!.index!.count + (taken.length / 2) * 6, plainCount);
  for (let at = 0; at < taken.length; at += 2) assert.equal(taken[at], 0x336699);
});

test('a chunk structure covers each sunk top with exactly one textured quad', () => {
  const structure = runPlan();
  assert.ok(structure.tops);
  let texelsUsed = 0;
  for (let at = 3; at < structure.tops.data.length; at += 4) if (structure.tops.data[at] === 255) texelsUsed++;
  const { width, height } = structure.tops;
  const area = structure.floors.reduce((sum, floor) => sum + topArea(floor.tops, width, height), 0);
  assert.ok(area > 0);
  assert.equal(area, texelsUsed);
});

test('a packed structure unpacks to the same geometry and bounds', () => {
  const structure = runPlan();
  const { packed, transfer } = packStructure(structure);
  assert.ok(transfer.length > 0);
  const copy = unpackStructure(structuredClone(packed));
  assert.equal(copy.floors.length, structure.floors.length);
  structure.floors.forEach((floor, index) => {
    const other = copy.floors[index]!;
    assert.deepEqual([...(other.meshes.solid?.index?.array ?? [])], [...(floor.meshes.solid?.index?.array ?? [])]);
    assert.deepEqual(other.meshes.solid?.boundingSphere?.radius, floor.meshes.solid?.boundingSphere?.radius);
    assert.deepEqual([...(other.tops?.getAttribute('uv').array ?? [])], [...(floor.tops?.getAttribute('uv').array ?? [])]);
  });
  assert.deepEqual(copy.walls.map((band) => band.parts.count), structure.walls.map((band) => band.parts.count));
});

class FakeWorker implements MesherWorker {
  onmessage: ((event: MessageEvent<StructureReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly received: StructureRequest[] = [];
  terminated = false;
  postMessage(message: StructureRequest): void {
    this.received.push(message);
  }
  terminate(): void {
    this.terminated = true;
  }
  boot(): void {
    this.onmessage?.({ data: { ready: true } } as MessageEvent<StructureReply>);
  }
  reply(structure: ChunkStructure): void {
      const request = this.received[this.received.length - 1]!;
    this.onmessage?.({ data: { id: request.id, structure: packStructure(structure).packed } } as MessageEvent<StructureReply>);
  }
}

const settle = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

test('the mesher pool hands out the most urgent job first and skips cancelled ones', async () => {
  const worker = new FakeWorker();
  const pool = new ChunkMesherPool(1, () => worker);
  const far = pool.request('fx-wilds', region, () => 5);
  const near = pool.request('fx-wilds', { ...region, x: 0 }, () => 1);
  const cancelled = pool.request('fx-wilds', { ...region, x: 64 }, () => 0);
  cancelled.cancel();
  await settle();
  assert.equal(worker.received.length, 1);
  assert.equal(worker.received[0]!.region.x, 0);
  worker.reply(runPlan());
  assert.ok(near.structure);
  assert.equal(worker.received.length, 2);
  assert.equal(worker.received[1]!.region.x, region.x);
  assert.equal(far.structure, null);
  pool.dispose();
  assert.ok(far.failed);
  assert.ok(worker.terminated);
});

test('a job that outlives its timeout fails and its worker is replaced', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const workers: FakeWorker[] = [];
  const pool = new ChunkMesherPool(1, () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  const stuck = pool.request('fx-wilds', region, () => 0);
  const next = pool.request('fx-wilds', { ...region, x: 0 }, () => 1);
  await settle();
  context.mock.timers.tick(30000);
  assert.equal(stuck.failed, false);
  workers[0]!.boot();
  context.mock.timers.tick(25000);
  assert.ok(stuck.failed);
  assert.ok(workers[0]!.terminated);
  assert.equal(workers.length, 2);
  assert.equal(workers[1]!.received[0]!.region.x, 0);
  workers[1]!.boot();
  assert.equal(next.failed, false);
  pool.dispose();
});

test('a worker that never boots fails its job and stops the pool', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const worker = new FakeWorker();
  const pool = new ChunkMesherPool(1, () => worker);
  const job = pool.request('fx-wilds', region, () => 0);
  await settle();
  context.mock.timers.tick(120000);
  assert.ok(job.failed);
  assert.ok(worker.terminated);
  assert.ok(pool.request('fx-wilds', region, () => 0).failed);
});

test('a worker error fails its job, the jobs of other workers and every later request', async () => {
  const workers = [new FakeWorker(), new FakeWorker()];
  let next = 0;
  const pool = new ChunkMesherPool(2, () => workers[next++]!);
  const job = pool.request('fx-wilds', region, () => 0);
  const other = pool.request('fx-wilds', { ...region, x: 0 }, () => 1);
  await settle();
  const worker = workers.find((candidate) => candidate.received.length > 0 && candidate.received[0]!.region.x === region.x)!;
  worker.onerror?.({ preventDefault: () => undefined } as ErrorEvent);
  assert.ok(job.failed);
  assert.ok(other.failed);
  assert.ok(pool.request('fx-wilds', region, () => 0).failed);
  pool.dispose();
});

test('a chunk waits for its worker structure, and builds locally when the worker fails or it is needed now', () => {
  const contents = { objects: [], sconces: [], fills: [] };
  const ring = new MeshBasicMaterial();
  const structure = runPlan();
  const job = { structure: null as ChunkStructure | null, failed: false, cancel: () => undefined };
  const waiting = new ChunkView(wilds, region, contents, ring, { requestStructure: () => job });
  assert.equal(waiting.build(performance.now() + 1000), false);
  assert.equal(waiting.build(performance.now() + 1000), false);
  job.structure = structure;
  assert.equal(waiting.build(Infinity), true);
  assert.ok(waiting.root.getObjectByName('floor'));

  const failing = { structure: null, failed: true, cancel: () => undefined };
  const fallback = new ChunkView(wilds, region, contents, ring, { requestStructure: () => failing });
  assert.equal(fallback.build(Infinity), true);
  assert.ok(fallback.root.getObjectByName('floor'));

  let cancelled = false;
  const urgent = new ChunkView(wilds, region, contents, ring, { requestStructure: () => ({ structure: null, failed: false, cancel: () => (cancelled = true) }) });
  assert.equal(urgent.build(Infinity), true);
  assert.ok(cancelled);
  assert.ok(urgent.root.getObjectByName('floor'));
});
