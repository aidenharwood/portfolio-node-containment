import { BufferAttribute, BufferGeometry, Group, Mesh, type Material } from 'three';
import { createVoxelObject, setVoxelObjectFaded, type VoxelLayer, type VoxelObjectOptions } from '../voxel/voxelMaterials.ts';
import { mergeVoxelGeometries } from '../voxel/mergeVoxelGeometry.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';

const LAYERS: readonly VoxelLayer[] = ['solid', 'emissive', 'glass'];

export interface IndexRange {
  readonly start: number;
  readonly count: number;
}

export interface BatchLayer {
  readonly geometry: BufferGeometry;
  readonly ranges: readonly (IndexRange | null)[];
}

export type BatchLayerName = VoxelLayer | 'tops';

export interface BatchParts {
  readonly count: number;
  readonly layers: Readonly<Record<BatchLayerName, BatchLayer | null>>;
}

export interface TopMaterials {
  readonly material: Material;
  readonly fadedMaterial: Material;
}

function mergeLayer(geometries: readonly (BufferGeometry | null)[]): BatchLayer | null {
  const entries = geometries.flatMap((geometry, index) => (geometry ? [{ index, geometry }] : []));
  if (entries.length === 0) return null;
  const geometry = mergeVoxelGeometries(entries);
  if (!geometry.index) throw new Error('FadeBatch pieces must be indexed');
  const ranges: (IndexRange | null)[] = geometries.map(() => null);
  let start = 0;
  for (const entry of entries) {
    const count = entry.geometry.index?.count ?? 0;
    ranges[entry.index] = { start, count };
    start += count;
  }
  return { geometry, ranges };
}

export function mergeBatch(pieces: readonly VoxelMeshes[], tops: readonly (BufferGeometry | null)[] = []): BatchParts {
  return {
    count: pieces.length,
    layers: {
      solid: mergeLayer(pieces.map((piece) => piece.solid)),
      emissive: mergeLayer(pieces.map((piece) => piece.emissive)),
      glass: mergeLayer(pieces.map((piece) => piece.glass)),
      tops: mergeLayer(tops),
    },
  };
}

interface LiveLayer {
  readonly geometry: BufferGeometry;
  readonly full: BufferAttribute['array'];
  readonly ranges: readonly (IndexRange | null)[];
}

export class FadeBatch {
  readonly root = new Group();
  private readonly parts: BatchParts;
  private readonly options: VoxelObjectOptions;
  private readonly topMaterials: TopMaterials | null;
  private readonly faded: boolean[];
  private readonly fadedGroups: (Group | null)[];
  private readonly layers: LiveLayer[] = [];
  private dirty = false;

  static of(pieces: readonly VoxelMeshes[], options: VoxelObjectOptions = {}): FadeBatch {
    return new FadeBatch(mergeBatch(pieces), options);
  }

  constructor(parts: BatchParts, options: VoxelObjectOptions = {}, topMaterials: TopMaterials | null = null) {
    this.parts = parts;
    this.options = options;
    this.topMaterials = topMaterials;
    this.faded = Array.from({ length: parts.count }, () => false);
    this.fadedGroups = Array.from({ length: parts.count }, () => null);
    const { solid, emissive, glass, tops } = parts.layers;
    for (const layer of [solid, emissive, glass, topMaterials ? tops : null]) {
      if (layer?.geometry.index) this.layers.push({ geometry: layer.geometry, full: layer.geometry.index.array.slice(), ranges: layer.ranges });
    }
    if (solid || emissive || glass) this.root.add(createVoxelObject({ solid: solid?.geometry ?? null, emissive: emissive?.geometry ?? null, glass: glass?.geometry ?? null }, options));
    if (tops && topMaterials) {
      const mesh = new Mesh(tops.geometry, topMaterials.material);
      mesh.name = 'tops';
      mesh.castShadow = options.castShadow ?? true;
      mesh.receiveShadow = options.receiveShadow ?? true;
      this.root.add(mesh);
    }
  }

  get size(): number {
    return this.parts.count;
  }

  private pieceOf(layer: BatchLayer | null, index: number): BufferGeometry | null {
    const range = layer?.ranges[index];
    const source = layer?.geometry;
    if (!range || !source?.index) return null;
    const live = this.layers.find((entry) => entry.geometry === source);
    const indices = (live?.full ?? source.index.array).slice(range.start, range.start + range.count);
    const piece = new BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) piece.setAttribute(name, attribute);
    piece.setIndex(new BufferAttribute(indices, 1));
    piece.boundingBox = source.boundingBox;
    piece.boundingSphere = source.boundingSphere;
    return piece;
  }

  setFaded(index: number, faded: boolean): void {
    if (this.faded[index] === faded) return;
    this.faded[index] = faded;
    this.dirty = true;
    let group = this.fadedGroups[index];
    if (!group && faded) {
      const { solid, emissive, glass, tops } = this.parts.layers;
      group = createVoxelObject({ solid: this.pieceOf(solid, index), emissive: this.pieceOf(emissive, index), glass: this.pieceOf(glass, index) }, this.options);
      setVoxelObjectFaded(group, true);
      const top = this.topMaterials ? this.pieceOf(tops, index) : null;
      if (top && this.topMaterials) {
        const mesh = new Mesh(top, this.topMaterials.fadedMaterial);
        mesh.name = 'tops';
        group.add(mesh);
      }
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
