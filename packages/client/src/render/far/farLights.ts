import { CHUNK_SIZE, objectFootprintSize, type ObjectPlacement, type TilePoint, type WorldObjectDefinition, type WorldObjectId, type WorldObjectModel } from '@containment/shared';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Points, ShaderMaterial, Vector2, type WebGLRenderer } from 'three';
import { buildObjectModel } from '../models/objectModels.ts';
import { hex } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { groundAt } from '../world/ground.ts';
import { MODEL_VOXEL_SIZE, STEP_HEIGHT } from '../world/worldScale.ts';
import { AIR_PARS, FAR_MOODS, MASK_PARS, shareFarUniforms, type FarUniforms } from './farMaterial.ts';
import { FACING_YAW } from './farProps.ts';
import { FAR_SINK } from './farTerrainMesher.ts';
import { rasterLayout, type SceneRaster } from './sceneRaster.ts';

export const LIGHT_INTENSITY_SCALE = 14;
export const LIGHT_REACH = 1.4;
export const GLOW_INTENSITY = 0.45;
const GLOW_MIN_RADIUS = 1.6;
const GLOW_MAX_RADIUS = 3.2;
const GLOW_MIN_VOXELS = 3;
const TOP_LIFT = 0.2;
const POOL_LIFT = 0.03;
const HEAD_MIN = 0.3;
const HEAD_MAX = 2.4;
const HEAD_LAMP = 0.42;
const HEAD_SHARE = 0.45;
const DAY_HEADS = 0.3;
const FADE_SHARE = 0.8;
export const FAR_LIGHT_EDGE_LIMIT = 1e6;

export interface FarGlow {
  readonly centre: readonly [number, number, number];
  readonly color: number;
  readonly size: number;
}

export interface FarLightBatch {
  readonly count: number;
  readonly spots: Float32Array;
  readonly pools: Float32Array;
  readonly heads: Float32Array;
  readonly chunks: Int16Array;
}

export interface FarLightSource {
  readonly objects: readonly ObjectPlacement[];
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
  indoorsAt(point: TilePoint): boolean;
  groundColorAt(tx: number, ty: number, out: [number, number, number]): void;
  moodAt(tx: number, ty: number): number;
}

const GLOWS = new Map<WorldObjectModel, FarGlow | null>();
const HEIGHTS = new Map<WorldObjectModel, number>();
const scratch = new Color();

export function farGlowOf(model: WorldObjectModel): FarGlow | null {
  const known = GLOWS.get(model);
  if (known !== undefined) return known;
  const parts = buildObjectModel(model, 0);
  HEIGHTS.set(model, parts.heightVoxels * MODEL_VOXEL_SIZE);
  const cells = [parts.base, ...parts.animated.map((spec) => spec.model)].flatMap((part) => part.cells()).filter((cell) => cell.kind === VOXEL_EMISSIVE);
  if (cells.length < GLOW_MIN_VOXELS) {
    GLOWS.set(model, null);
    return null;
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sum = new Color(0, 0, 0);
  for (const cell of cells) {
    const at = [cell.x, cell.y, cell.z];
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis] as number, at[axis] as number);
      max[axis] = Math.max(max[axis] as number, (at[axis] as number) + 1);
    }
    sum.add(scratch.setHex(cell.color));
  }
  sum.multiplyScalar(1 / Math.max(sum.r, sum.g, sum.b, 0.001));
  const span = [0, 1, 2].map((axis) => ((max[axis] as number) - (min[axis] as number)) * MODEL_VOXEL_SIZE);
  const glow: FarGlow = {
    centre: [0, 1, 2].map((axis) => (((min[axis] as number) + (max[axis] as number)) / 2) * MODEL_VOXEL_SIZE) as [number, number, number],
    color: sum.getHex(),
    size: Math.hypot(...span),
  };
  GLOWS.set(model, glow);
  return glow;
}

const modelHeight = (model: WorldObjectModel): number => {
  if (!HEIGHTS.has(model)) farGlowOf(model);
  return HEIGHTS.get(model) ?? 0;
};

export function farLightModels(source: Pick<FarLightSource, 'objects' | 'worldObjects'>): WorldObjectModel[] {
  const models = new Set<WorldObjectModel>();
  for (const placement of source.objects) {
    const definition = source.worldObjects.get(placement.objectId);
    if (definition) models.add(definition.model);
  }
  return [...models];
}

export function placeFarLights(source: FarLightSource, raster: SceneRaster): FarLightBatch {
  const layout = rasterLayout(raster);
  const values: number[] = [];
  const ground: [number, number, number] = [0, 0, 0];
  const color = new Color();
  for (const placement of source.objects) {
    const definition = source.worldObjects.get(placement.objectId);
    if (!definition) continue;
    const glow = farGlowOf(definition.model);
    if (!definition.light && !glow) continue;
    if (source.indoorsAt(placement.position)) continue;
    const { x, y } = placement.position;
    const scale = definition.modelScale ?? 1;
    const footprint = objectFootprintSize(definition, placement.facing);
    const originX = x + (footprint.width - 1) / 2;
    const originZ = y + (footprint.height - 1) / 2;
    const base = placement.datum === undefined ? groundAt(layout, x, y) : placement.datum * STEP_HEIGHT;
    const local = glow ? glow.centre : ([0, modelHeight(definition.model) + TOP_LIFT / scale, 0] as const);
    const yaw = FACING_YAW[placement.facing ?? 'south'];
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const lx = local[0] * scale;
    const lz = local[2] * scale;
    const intensity = definition.light ? definition.light.intensity : GLOW_INTENSITY;
    const radius = definition.light ? definition.light.radius : Math.min(GLOW_MAX_RADIUS, GLOW_MIN_RADIUS + (glow?.size ?? 0) * scale * 1.5);
    color.setHex(definition.light ? hex(definition.light.color) : (glow?.color ?? 0xffffff));
    source.groundColorAt(x, y, ground);
    const power = (intensity * LIGHT_INTENSITY_SCALE) / Math.PI;
    const head = Math.min(HEAD_MAX, Math.max(HEAD_MIN, glow ? glow.size * scale * HEAD_SHARE : HEAD_LAMP));
    values.push(
      originX + cos * lx + sin * lz,
      base + local[1] * scale,
      originZ - sin * lx + cos * lz,
      base,
      color.r * power * ground[0],
      color.g * power * ground[1],
      color.b * power * ground[2],
      radius * LIGHT_REACH,
      color.r * Math.sqrt(intensity),
      color.g * Math.sqrt(intensity),
      color.b * Math.sqrt(intensity),
      head,
      source.moodAt(x, y),
      Math.floor(x / CHUNK_SIZE),
      Math.floor(y / CHUNK_SIZE),
    );
  }
  const STRIDE = 15;
  const count = values.length / STRIDE;
  const batch: FarLightBatch = { count, spots: new Float32Array(count * 4), pools: new Float32Array(count * 4), heads: new Float32Array(count * 5), chunks: new Int16Array(count * 2) };
  for (let at = 0; at < count; at++) {
    const from = at * STRIDE;
    for (let lane = 0; lane < 4; lane++) {
      batch.spots[at * 4 + lane] = values[from + lane] as number;
      batch.pools[at * 4 + lane] = values[from + 4 + lane] as number;
    }
    for (let lane = 0; lane < 5; lane++) batch.heads[at * 5 + lane] = values[from + 8 + lane] as number;
    batch.chunks[at * 2] = values[from + 13] as number;
    batch.chunks[at * 2 + 1] = values[from + 14] as number;
  }
  return batch;
}

export const emptyFarLights = (): FarLightBatch => ({ count: 0, spots: new Float32Array(0), pools: new Float32Array(0), heads: new Float32Array(0), chunks: new Int16Array(0) });

export const farLightTransfer = (batch: FarLightBatch): ArrayBuffer[] => [batch.spots.buffer, batch.pools.buffer, batch.heads.buffer, batch.chunks.buffer] as ArrayBuffer[];

export const poolWeight = (drawn: boolean, distance: number, edge: number, across = 0, grid = Infinity): number => (drawn ? Math.max(smooth(edge * FADE_SHARE, edge, distance), smooth(grid * FADE_SHARE, grid, across)) : 1);

const smooth = (from: number, to: number, value: number): number => {
  if (!Number.isFinite(to)) return 0;
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

export const FAR_LIGHT_PARS = `uniform float farLightEdge;
uniform float farLightGrid;
uniform float moodNight[ ${FAR_MOODS} ];
uniform float nearNight;
float farPoolWeight( bool drawn, float distance, float across ) {
	return drawn ? max( smoothstep( farLightEdge * ${FADE_SHARE.toFixed(2)}, farLightEdge, distance ), smoothstep( farLightGrid * ${FADE_SHARE.toFixed(2)}, farLightGrid, across ) ) : 1.0;
}`;

function poolMaterial(uniforms: FarUniforms): ShaderMaterial {
  return shareFarUniforms(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      vertexShader: `attribute vec4 spot;
attribute vec4 pool;
attribute vec2 chunk;
${MASK_PARS}
${FAR_LIGHT_PARS}
uniform vec3 farFocus;
varying vec3 vPool;
varying vec3 vPoolOffset;
varying float vPoolReach;
varying float vFarDepth;
void main() {
	bool drawn = farMasked( chunk );
	vec2 apart = abs( spot.xz - floor( farFocus.xz + 0.5 ) );
	float weight = farPoolWeight( drawn, distance( spot.xyz, farFocus ), max( apart.x, apart.y ) );
	if ( weight <= 0.0 ) {
		gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
		return;
	}
	float plane = spot.w + ( drawn ? 0.0 : - ${FAR_SINK.toFixed(3)} ) + ${POOL_LIFT.toFixed(3)};
	vec3 world = vec3( spot.x + position.x * pool.w, plane, spot.z + position.z * pool.w );
	vec4 view = viewMatrix * vec4( world, 1.0 );
	gl_Position = projectionMatrix * view;
	vFarDepth = - view.z;
	vPool = pool.rgb * weight;
	vPoolOffset = vec3( world.x - spot.x, spot.y - spot.w, world.z - spot.z );
	vPoolReach = pool.w;
}`,
      fragmentShader: `${AIR_PARS}
varying vec3 vPool;
varying vec3 vPoolOffset;
varying float vPoolReach;
varying float vFarDepth;
void main() {
	float height = max( vPoolOffset.y, 0.2 );
	float span = dot( vPoolOffset.xz, vPoolOffset.xz ) + height * height;
	float ratio = span / ( vPoolReach * vPoolReach );
	if ( ratio >= 1.0 ) discard;
	float falloff = ( 1.0 - ratio ) * ( 1.0 - ratio ) * height * inversesqrt( span );
	vec3 light = vPool * falloff;
	gl_FragColor = vec4( airApply( light, vFarDepth, 1.0 ) - airApply( vec3( 0.0 ), vFarDepth, 1.0 ), 1.0 );
}`,
    }),
    uniforms,
  );
}

function headMaterial(uniforms: FarUniforms): ShaderMaterial {
  return shareFarUniforms(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { farViewport: { value: new Vector2(1, 1) } },
      vertexShader: `attribute vec4 head;
attribute float mood;
attribute vec2 chunk;
${MASK_PARS}
${FAR_LIGHT_PARS}
uniform vec3 farFocus;
uniform vec2 farViewport;
uniform vec2 moodRange;
varying vec3 vHead;
varying float vFarDepth;
void main() {
	if ( farMasked( chunk ) ) {
		gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
		gl_PointSize = 0.0;
		return;
	}
	vec4 view = viewMatrix * vec4( position, 1.0 );
	gl_Position = projectionMatrix * view;
	vFarDepth = - view.z;
	float pixels = head.w * projectionMatrix[ 1 ][ 1 ] * 0.5 * farViewport.y / max( vFarDepth, 1.0 );
	gl_PointSize = clamp( pixels * 2.5, 2.0, 28.0 );
	float away = smoothstep( moodRange.x, moodRange.y, distance( position.xz, farFocus.xz ) );
	float night = mix( nearNight, moodNight[ int( mood + 0.5 ) ], away );
	float coverage = min( 1.0, pixels * pixels * 2.0 );
	vHead = head.rgb * mix( ${DAY_HEADS.toFixed(2)}, 1.0, night ) * max( coverage, 0.25 );
}`,
      fragmentShader: `${AIR_PARS}
varying vec3 vHead;
varying float vFarDepth;
void main() {
	vec2 offset = gl_PointCoord * 2.0 - 1.0;
	float spread = dot( offset, offset );
	if ( spread >= 1.0 ) discard;
	float glow = exp( - spread * 9.0 ) * 1.6 + ( 1.0 - spread ) * 0.12;
	vec3 light = vHead * glow;
	gl_FragColor = vec4( airApply( light, vFarDepth, 0.6 ) - airApply( vec3( 0.0 ), vFarDepth, 0.6 ), 1.0 );
}`,
    }),
    uniforms,
  );
}

export class FarLights {
  readonly pools: Mesh;
  readonly heads: Points;
  private readonly poolShader: ShaderMaterial;
  private readonly headShader: ShaderMaterial;

  constructor(batch: FarLightBatch, uniforms: FarUniforms) {
    this.poolShader = poolMaterial(uniforms);
    this.headShader = headMaterial(uniforms);
    const quad = new InstancedBufferGeometry();
    quad.setAttribute('position', new BufferAttribute(new Float32Array([-1, 0, -1, -1, 0, 1, 1, 0, 1, 1, 0, -1]), 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    quad.instanceCount = batch.count;
    quad.setAttribute('spot', new InstancedBufferAttribute(batch.spots, 4));
    quad.setAttribute('pool', new InstancedBufferAttribute(batch.pools, 4));
    quad.setAttribute('chunk', new InstancedBufferAttribute(batch.chunks, 2));
    this.pools = new Mesh(quad, this.poolShader);
    this.pools.name = 'farLightPools';
    this.pools.frustumCulled = false;
    this.pools.matrixAutoUpdate = false;
    this.pools.renderOrder = 1;
    const positions = new Float32Array(batch.count * 3);
    const heads = new Float32Array(batch.count * 4);
    const moods = new Float32Array(batch.count);
    for (let at = 0; at < batch.count; at++) {
      positions.set(batch.spots.subarray(at * 4, at * 4 + 3), at * 3);
      positions[at * 3 + 1] = (batch.spots[at * 4 + 1] as number) - FAR_SINK;
      heads.set(batch.heads.subarray(at * 5, at * 5 + 4), at * 4);
      moods[at] = batch.heads[at * 5 + 4] as number;
    }
    const points = new BufferGeometry();
    points.setAttribute('position', new BufferAttribute(positions, 3));
    points.setAttribute('head', new BufferAttribute(heads, 4));
    points.setAttribute('mood', new BufferAttribute(moods, 1));
    points.setAttribute('chunk', new BufferAttribute(batch.chunks, 2));
    this.heads = new Points(points, this.headShader);
    this.heads.name = 'farLightHeads';
    this.heads.frustumCulled = false;
    this.heads.matrixAutoUpdate = false;
    this.heads.renderOrder = 2;
    const viewport = this.headShader.uniforms['farViewport']!.value as Vector2;
    this.heads.onBeforeRender = (renderer: WebGLRenderer) => void renderer.getDrawingBufferSize(viewport);
  }

  dispose(): void {
    for (const object of [this.pools, this.heads]) {
      object.removeFromParent();
      object.geometry.dispose();
    }
    this.poolShader.dispose();
    this.headShader.dispose();
  }
}
