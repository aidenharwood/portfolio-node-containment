import { CHUNK_SIZE, type Facing, type ObjectPlacement, type WorldObjectDefinition, type WorldObjectId, type WorldObjectModel } from '@containment/shared';
import { BufferAttribute, Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, ShaderMaterial, SRGBColorSpace, Vector3 } from 'three';
import { buildObjectModel } from '../models/objectModels.ts';
import { VOXEL_EMISSIVE, VOXEL_GLASS } from '../voxel/voxelKinds.ts';
import { groundAt } from '../world/ground.ts';
import { MODEL_VOXEL_SIZE, STEP_HEIGHT } from '../world/worldScale.ts';
import { AIR_PARS, FAR_MOODS, LIGHT_PARS, MASK_PARS, shareFarUniforms, type FarUniforms } from './farMaterial.ts';
import { FAR_SINK, farTopAt, type FarCells } from './farTerrainMesher.ts';
import { rasterLayout, type SceneRaster } from './sceneRaster.ts';

export const FAR_PROP_KINDS = ['broadleaf', 'conifer', 'shrub', 'deadwood', 'rock', 'crystal', 'scrap'] as const;
export type FarPropKind = (typeof FAR_PROP_KINDS)[number];

export const FAR_PROP_MODELS: Readonly<Record<FarPropKind, readonly WorldObjectModel[]>> = {
  broadleaf: ['broadleafTree', 'orchardTree', 'birchTree'],
  conifer: ['windbentPine'],
  shrub: ['bush', 'hedgerow', 'overgrownPlanter'],
  deadwood: ['deadTree', 'fallenLog'],
  rock: ['boulder', 'rockOutcrop', 'obsidianOutcrop', 'rubbleHeap', 'fieldWall', 'ruinWall', 'hayBale'],
  crystal: ['glassCrystals'],
  scrap: ['scrapMound', 'tyreHeap', 'wreckedPanel', 'scrapHeap', 'scrapPile'],
};

const TRUNKED: ReadonlySet<FarPropKind> = new Set<FarPropKind>(['broadleaf', 'conifer', 'deadwood']);
const KIND_OF_MODEL = new Map<WorldObjectModel, FarPropKind>(FAR_PROP_KINDS.flatMap((kind) => FAR_PROP_MODELS[kind].map((model) => [model, kind] as const)));
export const MODEL_VARIANTS = 8;
const SEED_SPREAD = 97;
const CROWN_SHARE = 0.4;
const TRUNK_HALF = 0.09;
const SETTLE_REACH = STEP_HEIGHT * 1.5;
export const FACING_YAW: Readonly<Record<Facing, number>> = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };

export interface PropSilhouette {
  readonly centre: readonly [number, number];
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly split: number;
  readonly crown: readonly [number, number, number];
  readonly trunk: readonly [number, number, number];
}

export interface FarPropBatch {
  readonly kind: FarPropKind;
  readonly count: number;
  readonly places: Float32Array;
  readonly sizes: Float32Array;
  readonly crowns: Uint8Array;
  readonly trunks: Uint8Array;
  readonly chunks: Int16Array;
}

const SILHOUETTES = new Map<string, PropSilhouette | null>();
const scratch = new Color();
const srgb = { r: 0, g: 0, b: 0 };

const toSrgbBytes = (red: number, green: number, blue: number): [number, number, number] => {
  scratch.setRGB(red, green, blue);
  scratch.getRGB(srgb, SRGBColorSpace);
  return [Math.round(Math.min(1, Math.max(0, srgb.r)) * 255), Math.round(Math.min(1, Math.max(0, srgb.g)) * 255), Math.round(Math.min(1, Math.max(0, srgb.b)) * 255)];
};

export function propSilhouette(model: WorldObjectModel, seed: number, trunked = TRUNKED.has(KIND_OF_MODEL.get(model) ?? 'rock')): PropSilhouette | null {
  const key = `${model}:${seed}`;
  const known = SILHOUETTES.get(key);
  if (known !== undefined) return known;
  const cells = buildObjectModel(model, seed).base.cells().filter((cell) => cell.y >= 0 && cell.kind !== VOXEL_GLASS);
  if (cells.length === 0) {
    SILHOUETTES.set(key, null);
    return null;
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const layers: number[] = [];
  for (const cell of cells) {
    min[0] = Math.min(min[0] as number, cell.x);
    min[2] = Math.min(min[2] as number, cell.z);
    max[0] = Math.max(max[0] as number, cell.x + 1);
    max[1] = Math.max(max[1] as number, cell.y + 1);
    max[2] = Math.max(max[2] as number, cell.z + 1);
    layers[cell.y] = (layers[cell.y] ?? 0) + 1;
  }
  let widest = 0;
  for (const count of layers) widest = Math.max(widest, count ?? 0);
  const height = max[1] as number;
  const splitLayer = trunked ? Math.max(0, layers.findIndex((count) => (count ?? 0) >= widest * CROWN_SHARE)) : 0;
  const sums = [new Color(0, 0, 0), new Color(0, 0, 0)];
  const counts = [0, 0];
  for (const cell of cells) {
    const part = cell.y >= splitLayer ? 1 : 0;
    scratch.setHex(cell.color);
    if (cell.kind === VOXEL_EMISSIVE) scratch.multiplyScalar(0.6);
    sums[part]!.add(scratch);
    counts[part]!++;
  }
  const average = (part: number, fallback: number): [number, number, number] => {
    const sum = sums[part]!;
    const count = counts[part]!;
    return count === 0 ? average(fallback, fallback) : toSrgbBytes(sum.r / count, sum.g / count, sum.b / count);
  };
  const silhouette: PropSilhouette = {
    centre: [(((min[0] as number) + (max[0] as number)) / 2) * MODEL_VOXEL_SIZE, (((min[2] as number) + (max[2] as number)) / 2) * MODEL_VOXEL_SIZE],
    width: ((max[0] as number) - (min[0] as number)) * MODEL_VOXEL_SIZE,
    depth: ((max[2] as number) - (min[2] as number)) * MODEL_VOXEL_SIZE,
    height: height * MODEL_VOXEL_SIZE,
    split: splitLayer / height,
    crown: average(1, 1),
    trunk: average(0, 1),
  };
  SILHOUETTES.set(key, silhouette);
  return silhouette;
}

export const variantOf = (placement: ObjectPlacement, index: number): number => ((placement.position.x * 31 + placement.position.y * 17 + index) % SEED_SPREAD) % MODEL_VARIANTS;

export const farPropKindOf = (definition: WorldObjectDefinition | undefined): FarPropKind | null => (definition ? (KIND_OF_MODEL.get(definition.model) ?? null) : null);

export interface FarPropSource {
  readonly objects: readonly ObjectPlacement[];
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
  moodAt(tx: number, ty: number): number;
}

export function farPropModels(source: FarPropSource): WorldObjectModel[] {
  const models = new Set<WorldObjectModel>();
  for (const placement of source.objects) {
    const definition = source.worldObjects.get(placement.objectId);
    if (farPropKindOf(definition) && definition) models.add(definition.model);
  }
  return [...models];
}

export function placeFarProps(source: FarPropSource, raster: SceneRaster, cells: FarCells): FarPropBatch[] {
  const layout = rasterLayout(raster);
  const lists = new Map<FarPropKind, number[]>(FAR_PROP_KINDS.map((kind) => [kind, []]));
  source.objects.forEach((placement, index) => {
    const definition = source.worldObjects.get(placement.objectId);
    const kind = farPropKindOf(definition);
    if (!kind || !definition) return;
    const silhouette = propSilhouette(definition.model, variantOf(placement, index));
    if (!silhouette) return;
    const { x, y } = placement.position;
    const ground = placement.datum === undefined ? groundAt(layout, x, y) : placement.datum * STEP_HEIGHT;
    const column = Math.floor((x - cells.x) / cells.cell);
    const row = Math.floor((y - cells.y) / cells.cell);
    const cellTop = farTopAt(cells, column, row);
    const sunk = ground - FAR_SINK;
    const base = Math.abs(cellTop - sunk) <= SETTLE_REACH ? cellTop : sunk;
    const scale = definition.modelScale ?? 1;
    const yaw = FACING_YAW[placement.facing ?? 'south'];
    const footprint = { width: definition.footprint?.width ?? 1, height: definition.footprint?.height ?? 1 };
    const turned = placement.facing === 'east' || placement.facing === 'west';
    const originX = x + ((turned ? footprint.height : footprint.width) - 1) / 2;
    const originZ = y + ((turned ? footprint.width : footprint.height) - 1) / 2;
    const [cx, cz] = silhouette.centre;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const list = lists.get(kind) as number[];
    list.push(
      originX + (cos * cx + sin * cz) * scale,
      base,
      originZ + (-sin * cx + cos * cz) * scale,
      yaw,
      silhouette.width * scale,
      silhouette.height * scale,
      silhouette.depth * scale,
      silhouette.split,
      ...silhouette.crown,
      source.moodAt(x, y),
      ...silhouette.trunk,
      Math.floor(x / CHUNK_SIZE),
      Math.floor(y / CHUNK_SIZE),
    );
  });
  const STRIDE = 17;
  return FAR_PROP_KINDS.flatMap((kind) => {
    const list = lists.get(kind) as number[];
    const count = list.length / STRIDE;
    if (count === 0) return [];
    const batch: FarPropBatch = { kind, count, places: new Float32Array(count * 4), sizes: new Float32Array(count * 4), crowns: new Uint8Array(count * 4), trunks: new Uint8Array(count * 4), chunks: new Int16Array(count * 2) };
    for (let at = 0; at < count; at++) {
      const from = at * STRIDE;
      for (let lane = 0; lane < 4; lane++) {
        batch.places[at * 4 + lane] = list[from + lane] as number;
        batch.sizes[at * 4 + lane] = list[from + 4 + lane] as number;
        batch.crowns[at * 4 + lane] = list[from + 8 + lane] as number;
      }
      batch.trunks.set([list[from + 12] as number, list[from + 13] as number, list[from + 14] as number, 255], at * 4);
      batch.chunks[at * 2] = list[from + 15] as number;
      batch.chunks[at * 2 + 1] = list[from + 16] as number;
    }
    return [batch];
  });
}

export const farPropTransfer = (batch: FarPropBatch): ArrayBuffer[] => [batch.places.buffer, batch.sizes.buffer, batch.crowns.buffer, batch.trunks.buffer, batch.chunks.buffer] as ArrayBuffer[];

type Point = readonly [number, number, number];

class ShapeWriter {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly parts: number[] = [];
  readonly indices: number[] = [];

  face(corners: readonly Point[], part: number): void {
    const [a, b, c] = corners as [Point, Point, Point];
    const normal = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize();
    const start = this.positions.length / 3;
    for (const corner of corners) {
      this.positions.push(...corner);
      this.normals.push(normal.x, normal.y, normal.z);
      this.parts.push(part);
    }
    for (let corner = 1; corner < corners.length - 1; corner++) this.indices.push(start, start + corner, start + corner + 1);
  }

  frustum(part: number, x: number, z: number, low: number, high: number, bottom: number, top: number, caps: { readonly top?: boolean; readonly bottom?: boolean } = {}): this {
    const ring = (y: number, half: number): Point[] => [
      [x - half, y, z - half],
      [x + half, y, z - half],
      [x + half, y, z + half],
      [x - half, y, z + half],
    ];
    const lower = ring(low, bottom);
    const upper = ring(high, top);
    for (let side = 0; side < 4; side++) {
      const next = (side + 1) % 4;
      this.face([lower[side]!, upper[side]!, upper[next]!, lower[next]!], part);
    }
    if (caps.top) this.face([upper[0]!, upper[3]!, upper[2]!, upper[1]!], part);
    if (caps.bottom) this.face([lower[0]!, lower[1]!, lower[2]!, lower[3]!], part);
    return this;
  }

  spike(part: number, x: number, z: number, high: number, half: number): this {
    const apex: Point = [x, high, z];
    const base: Point[] = [
      [x - half, 0, z - half],
      [x + half, 0, z - half],
      [x + half, 0, z + half],
      [x - half, 0, z + half],
    ];
    for (let side = 0; side < 4; side++) this.face([base[side]!, apex, base[(side + 1) % 4]!], part);
    return this;
  }

  geometry(): InstancedBufferGeometry {
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setAttribute('part', new BufferAttribute(new Uint8Array(this.parts), 1));
    geometry.setIndex(this.indices);
    return geometry;
  }
}

const TRUNK = 0;
const CROWN = 1;

export function farPropShape(kind: FarPropKind): ShapeWriter {
  const shape = new ShapeWriter();
  if (TRUNKED.has(kind)) shape.frustum(TRUNK, 0, 0, 0, 1, TRUNK_HALF, TRUNK_HALF);
  switch (kind) {
    case 'broadleaf':
      return shape.frustum(CROWN, 0, 0, 0, 0.62, 0.46, 0.5, { top: true, bottom: true }).frustum(CROWN, 0, 0, 0.62, 1, 0.36, 0.28, { top: true });
    case 'conifer':
      return shape.frustum(CROWN, 0, 0, 0, 0.42, 0.5, 0.38, { top: true, bottom: true }).frustum(CROWN, 0, 0, 0.36, 0.74, 0.34, 0.22, { top: true }).frustum(CROWN, 0, 0, 0.68, 1, 0.18, 0.04, { top: true });
    case 'shrub':
      return shape.frustum(CROWN, 0, 0, 0, 1, 0.5, 0.4, { top: true });
    case 'deadwood':
      return shape.frustum(CROWN, 0, 0, 0, 1, 0.42, 0.1, { top: true, bottom: true });
    case 'rock':
      return shape.frustum(CROWN, 0, 0, 0, 1, 0.5, 0.34, { top: true });
    case 'crystal':
      return shape.spike(CROWN, 0, 0, 1, 0.22).spike(CROWN, 0.26, 0.14, 0.66, 0.15).spike(CROWN, -0.24, -0.16, 0.52, 0.14);
    case 'scrap':
      return shape.frustum(CROWN, 0, 0, 0, 0.72, 0.5, 0.24, { top: true }).frustum(CROWN, 0.18, -0.1, 0, 1, 0.1, 0.08, { top: true });
  }
}

export const farPropTriangles = (kind: FarPropKind): number => farPropShape(kind).indices.length / 3;

export function farPropMaterial(uniforms: FarUniforms): ShaderMaterial {
  return shareFarUniforms(
    new ShaderMaterial({
      vertexShader: `#include <common>
attribute float part;
attribute vec4 place;
attribute vec4 size;
attribute vec4 crown;
attribute vec4 trunk;
attribute vec2 chunk;
uniform vec3 moodSky[ ${FAR_MOODS} ];
uniform vec3 moodGround[ ${FAR_MOODS} ];
uniform vec3 moodKey[ ${FAR_MOODS} ];
${MASK_PARS}
${LIGHT_PARS}
uniform vec3 farFocus;
varying vec3 vFarLit;
varying float vFarDepth;
vec3 propLinear( vec3 color ) {
	return mix( color * 0.0773993808, pow( color * 0.9478672986 + 0.0521327014, vec3( 2.4 ) ), step( 0.04045, color ) );
}
void main() {
	if ( farMasked( chunk ) ) {
		vFarLit = vec3( 0.0 );
		vFarDepth = 0.0;
		gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
		return;
	}
	vec3 local = position;
	local.y = part < 0.5 ? local.y * size.w : size.w + local.y * ( 1.0 - size.w );
	local *= size.xyz;
	float turnSin = sin( place.w );
	float turnCos = cos( place.w );
	vec3 offset = vec3( turnCos * local.x + turnSin * local.z, local.y, - turnSin * local.x + turnCos * local.z );
	vec3 bent = normalize( normal / max( size.xyz, vec3( 0.05 ) ) );
	vec3 turned = vec3( turnCos * bent.x + turnSin * bent.z, bent.y, - turnSin * bent.x + turnCos * bent.z );
	vec4 world = vec4( place.xyz + offset, 1.0 );
	vec4 view = viewMatrix * world;
	vFarDepth = - view.z;
	gl_Position = projectionMatrix * view;
	int index = int( crown.a * 255.0 + 0.5 );
	float away = smoothstep( moodRange.x, moodRange.y, distance( world.xz, farFocus.xz ) );
	vec3 radiance = farRadiance( turned, mix( nearSky, moodSky[ index ], away ), mix( nearGround, moodGround[ index ], away ), mix( nearKey, moodKey[ index ], away ) );
	vFarLit = farKnee( propLinear( part < 0.5 ? trunk.rgb : crown.rgb ) * radiance );
}`,
      fragmentShader: `${AIR_PARS}
varying vec3 vFarLit;
varying float vFarDepth;
void main() {
	gl_FragColor = vec4( airApply( vFarLit, vFarDepth, 1.0 ), 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,
    }),
    uniforms,
  );
}

export class FarProps {
  readonly meshes: Mesh[] = [];
  private readonly material: ShaderMaterial;

  constructor(batches: readonly FarPropBatch[], uniforms: FarUniforms) {
    this.material = farPropMaterial(uniforms);
    for (const batch of batches) {
      const geometry = farPropShape(batch.kind).geometry();
      geometry.instanceCount = batch.count;
      geometry.setAttribute('place', new InstancedBufferAttribute(batch.places, 4));
      geometry.setAttribute('size', new InstancedBufferAttribute(batch.sizes, 4));
      geometry.setAttribute('crown', new InstancedBufferAttribute(batch.crowns, 4, true));
      geometry.setAttribute('trunk', new InstancedBufferAttribute(batch.trunks, 4, true));
      geometry.setAttribute('chunk', new InstancedBufferAttribute(batch.chunks, 2));
      const mesh = new Mesh(geometry, this.material);
      mesh.name = `farProps:${batch.kind}`;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      this.meshes.push(mesh);
    }
  }

  get triangles(): number {
    return this.meshes.reduce((sum, mesh) => sum + ((mesh.geometry.getIndex()?.count ?? 0) / 3) * (mesh.geometry as InstancedBufferGeometry).instanceCount, 0);
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    this.material.dispose();
  }
}

