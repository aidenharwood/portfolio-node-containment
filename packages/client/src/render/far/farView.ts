import { CHUNK_SIZE, type ChunkCoord, type ResolvedLevel, type SceneLayout, type ZoneAmbience } from '@containment/shared';
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, Sphere, Vector3, type ShaderMaterial } from 'three';
import type { GameSettings, RenderScale } from '../../state/gameSettings.ts';
import { createAmbienceLight, lightAmbience, type AmbienceLight } from '../sceneLook.ts';
import { createBlendedAmbience, type BlendedAmbience } from '../world/ambienceBlend.ts';
import type { FarBuild } from './farBuild.ts';
import { farBuildFor } from './farJobs.ts';
import { createChunkMask, createFarUniforms, FAR_MOODS, farTerrainMaterial, shareFarUniforms, type ChunkMask, type FarUniforms } from './farMaterial.ts';
import type { FarTileArrays } from './farTerrainMesher.ts';

export const FAR_HAZE_CAP = 0.006;
export const FAR_REACHES: Readonly<Record<RenderScale, number>> = { performance: 600, balanced: 900, sharp: 1300, native: 1600 };
export const farReachFor = (settings: Pick<GameSettings, 'renderScale'>): number => FAR_REACHES[settings.renderScale];
const AERIAL_FROM = 160;
const AERIAL_SHARE = 0.95;

export function blendedOf(ambience: ZoneAmbience, into: BlendedAmbience = createBlendedAmbience()): BlendedAmbience {
  into.darkness = ambience.darkness;
  into.tint.set(ambience.tint);
  into.fog.set(ambience.fog);
  into.daylight = ambience.sky ? 1 : 0;
  into.haze = ambience.haze ?? 1;
  if (ambience.sky) into.sky.set(ambience.sky);
  return into;
}

export function lightColors(light: AmbienceLight, sky: Color, ground: Color, key: Color): void {
  sky.copy(light.sky).multiplyScalar(light.fill);
  ground.copy(light.ground).multiplyScalar(light.fill);
  key.copy(light.key).multiplyScalar(light.sun);
}

export function chunkMaskBounds(scene: SceneLayout): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const { bounds } = scene;
  const x = Math.floor(bounds.x / CHUNK_SIZE);
  const y = Math.floor(bounds.y / CHUNK_SIZE);
  return { x, y, width: Math.floor((bounds.x + bounds.width - 1) / CHUNK_SIZE) - x + 1, height: Math.floor((bounds.y + bounds.height - 1) / CHUNK_SIZE) - y + 1 };
}

export function writeChunkMask(mask: ChunkMask, drawn: readonly ChunkCoord[]): void {
  const data = mask.texture.image.data as Uint8Array;
  const width = mask.size.x;
  data.fill(0);
  for (const { cx, cy } of drawn) {
    const x = cx - mask.origin.x;
    const y = cy - mask.origin.y;
    if (x < 0 || y < 0 || x >= width || y >= mask.size.y) continue;
    data[y * width + x] = 255;
  }
  mask.texture.needsUpdate = true;
}

export function farGeometry(tile: FarTileArrays): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(tile.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(tile.normals, 3, true));
  geometry.setAttribute('color', new BufferAttribute(tile.colors, 3, true));
  geometry.setAttribute('mood', new BufferAttribute(tile.moods, 1));
  geometry.setAttribute('chunk', new BufferAttribute(tile.chunks, 2));
  geometry.setIndex(new BufferAttribute(tile.indices, 1));
  const min = new Vector3(...tile.min);
  const max = new Vector3(...tile.max);
  geometry.boundingSphere = new Sphere(min.clone().add(max).multiplyScalar(0.5), min.distanceTo(max) / 2);
  return geometry;
}

export interface FarFrame {
  readonly camera: Vector3;
  readonly focus: Vector3;
  readonly ambience: BlendedAmbience;
  readonly background: Color;
  readonly drawn: readonly ChunkCoord[];
}

export class FarView {
  readonly root = new Group();
  private readonly mask: ChunkMask;
  private readonly uniforms: FarUniforms;
  private readonly terrain: ShaderMaterial;
  private readonly meshes: Mesh[] = [];
  private readonly light = createAmbienceLight();
  private maskKey = '';
  private disposed = false;
  private built = false;

  constructor(level: ResolvedLevel, scene: SceneLayout, reach: number) {
    const bounds = chunkMaskBounds(scene);
    this.mask = createChunkMask(bounds.x, bounds.y, bounds.width, bounds.height);
    this.uniforms = createFarUniforms(this.mask);
    this.terrain = shareFarUniforms(farTerrainMaterial(), this.uniforms);
    this.root.name = 'farView';
    this.setReach(reach);
    void farBuildFor(level, scene).then(
      (build) => this.accept(build),
      () => undefined,
    );
  }

  get ready(): boolean {
    return this.built;
  }

  setReach(reach: number): void {
    this.uniforms.aerialRange.value.set(AERIAL_FROM, Math.max(AERIAL_FROM + 1, reach * AERIAL_SHARE));
  }

  private accept(build: FarBuild): void {
    if (this.disposed) return;
    const light = createAmbienceLight();
    const moodSky = this.terrain.uniforms['moodSky']!.value as Color[];
    const moodGround = this.terrain.uniforms['moodGround']!.value as Color[];
    const moodKey = this.terrain.uniforms['moodKey']!.value as Color[];
    build.moods.slice(0, FAR_MOODS).forEach((ambience, index) => lightColors(lightAmbience(blendedOf(ambience), light), moodSky[index]!, moodGround[index]!, moodKey[index]!));
    for (const tile of build.tiles) {
      const mesh = new Mesh(farGeometry(tile), this.terrain);
      mesh.name = 'farTerrain';
      mesh.matrixAutoUpdate = false;
      this.meshes.push(mesh);
      this.root.add(mesh);
    }
    this.built = true;
  }

  update(frame: FarFrame): void {
    this.uniforms.farFocus.value.copy(frame.focus);
    this.uniforms.aerialColor.value.copy(frame.background);
    lightColors(lightAmbience(frame.ambience, this.light), this.uniforms.nearSky.value, this.uniforms.nearGround.value, this.uniforms.nearKey.value);
    let key = '';
    for (const { cx, cy } of frame.drawn) key += `${cx},${cy};`;
    if (key !== this.maskKey) {
      this.maskKey = key;
      writeChunkMask(this.mask, frame.drawn);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.root.removeFromParent();
    for (const mesh of this.meshes) mesh.geometry.dispose();
    this.meshes.length = 0;
    this.terrain.dispose();
    this.mask.texture.dispose();
  }
}
