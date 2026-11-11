import { Group, type BufferAttribute, type BufferGeometry } from 'three';
import { createVoxelObject, setVoxelObjectFaded, type VoxelLayer, type VoxelObjectOptions } from '../voxel/voxelMaterials.ts';
import { mergeVoxelGeometries } from '../voxel/mergeVoxelGeometry.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';

const LAYERS: readonly VoxelLayer[] = ['solid', 'emissive', 'glass'];

interface IndexRange {
  readonly start: number;
  readonly count: number;
}

interface LayerBatch {
  readonly geometry: BufferGeometry;
  readonly full: BufferAttribute['array'];
  readonly ranges: readonly (IndexRange | null)[];
}

export class FadeBatch {
  readonly root = new Group();
  private readonly pieces: readonly VoxelMeshes[];
  private readonly options: VoxelObjectOptions;
  private readonly faded: boolean[];
  private readonly fadedGroups: (Group | null)[];
  private readonly layers: LayerBatch[] = [];
  private dirty = false;

  constructor(pieces: readonly VoxelMeshes[], options: VoxelObjectOptions = {}) {
    this.pieces = pieces;
    this.options = options;
    this.faded = pieces.map(() => false);
    this.fadedGroups = pieces.map(() => null);
    const merged: Record<VoxelLayer, BufferGeometry | null> = { solid: null, emissive: null, glass: null };
    for (const layer of LAYERS) {
      const entries = pieces.flatMap((piece, index) => (piece[layer] ? [{ index, geometry: piece[layer] }] : []));
      if (entries.length === 0) continue;
      const geometry = mergeVoxelGeometries(entries);
      const index = geometry.index;
      if (!index) throw new Error('FadeBatch pieces must be indexed');
      const ranges: (IndexRange | null)[] = pieces.map(() => null);
      let start = 0;
      for (const entry of entries) {
        const count = entry.geometry.index?.count ?? 0;
        ranges[entry.index] = { start, count };
        start += count;
      }
      this.layers.push({ geometry, full: index.array.slice(), ranges });
      merged[layer] = geometry;
    }
    if (merged.solid || merged.emissive || merged.glass) this.root.add(createVoxelObject(merged, options));
  }

  get size(): number {
    return this.pieces.length;
  }

  setFaded(index: number, faded: boolean): void {
    if (this.faded[index] === faded) return;
    this.faded[index] = faded;
    this.dirty = true;
    let group = this.fadedGroups[index];
    if (!group && faded) {
      group = createVoxelObject(this.pieces[index]!, this.options);
      setVoxelObjectFaded(group, true);
      this.fadedGroups[index] = group;
      this.root.add(group);
    }
    if (group) group.visible = faded;
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    for (const { geometry, full, ranges } of this.layers) {
      const index = geometry.index!;
      let written = 0;
      ranges.forEach((range, piece) => {
        if (!range || this.faded[piece]) return;
        index.array.set(full.subarray(range.start, range.start + range.count), written);
        written += range.count;
      });
      index.clearUpdateRanges();
      index.addUpdateRange(0, written);
      index.needsUpdate = true;
      geometry.setDrawRange(0, written);
    }
  }
}
