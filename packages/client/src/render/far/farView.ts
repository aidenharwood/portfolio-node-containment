import { CHUNK_SIZE, type ChunkCoord, type ResolvedLevel, type SceneLayout, type ZoneAmbience } from '@containment/shared';
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, Sphere, Vector3, type ShaderMaterial } from 'three';
import { viewReachFor, type GameSettings } from '../../state/gameSettings.ts';
import { createAmbienceLight, lightAmbience, type AmbienceLight } from '../sceneLook.ts';
import { createBlendedAmbience, type BlendedAmbience } from '../world/ambienceBlend.ts';
import type { FarBuild } from './farBuild.ts';
import { farBuildFor, landmarksFor } from './farJobs.ts';
import { createChunkMask, createFarUniforms, FAR_MOODS, farTerrainMaterial, shareFarUniforms, type ChunkMask, type FarUniforms } from './farMaterial.ts';
import type { Landmark } from './farLandmarks.ts';
import { FarProps } from './farProps.ts';
import { FarSea } from './farSea.ts';
import type { FarTileArrays } from './farTerrainMesher.ts';
import { LandmarkBeacons } from './landmarkBeacons.ts';

export const farReachFor = (settings: Pick<GameSettings, 'viewDistance'>): number => viewReachFor(settings.viewDistance);

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
  geometry.setAttribute('facade', new BufferAttribute(tile.facades, 4));
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
  readonly drawn: readonly ChunkCoord[];
  readonly pixelRatio?: number;
}

export class FarView {
  readonly root = new Group();
  private readonly mask: ChunkMask;
  private readonly uniforms: FarUniforms;
  private readonly terrain: ShaderMaterial;
  private readonly meshes: Mesh[] = [];
  private readonly sea: FarSea;
  private beacons: LandmarkBeacons | null = null;
  private props: FarProps | null = null;
  private reach = 0;
  private readonly light = createAmbienceLight();
  private maskKey = '';
  private disposed = false;
  private built = false;

  constructor(level: ResolvedLevel, scene: SceneLayout, reach: number) {
    const bounds = chunkMaskBounds(scene);
    this.mask = createChunkMask(bounds.x, bounds.y, bounds.width, bounds.height);
    this.uniforms = createFarUniforms(this.mask);
    this.terrain = shareFarUniforms(farTerrainMaterial(), this.uniforms);
    this.sea = new FarSea(this.uniforms);
    this.root.name = 'farView';
    this.root.add(this.sea.mesh);
    this.setReach(reach);
    void farBuildFor(level, scene).then(
      (build) => this.accept(build),
      () => undefined,
    );
    void landmarksFor(level, scene).then(
      (landmarks) => this.acceptLandmarks(landmarks),
      () => undefined,
    );
  }

  get ready(): boolean {
    return this.built;
  }

  setReach(reach: number): void {
    this.reach = reach;
  }

  private accept(build: FarBuild): void {
    if (this.disposed) return;
    const light = createAmbienceLight();
    const moodSky = this.uniforms.moodSky.value;
    const moodGround = this.uniforms.moodGround.value;
    const moodKey = this.uniforms.moodKey.value;
    build.moods.slice(0, FAR_MOODS).forEach((ambience, index) => lightColors(lightAmbience(blendedOf(ambience), light), moodSky[index]!, moodGround[index]!, moodKey[index]!));
    for (const tile of build.tiles) {
      const mesh = new Mesh(farGeometry(tile), this.terrain);
      mesh.name = 'farTerrain';
      mesh.matrixAutoUpdate = false;
      this.meshes.push(mesh);
      this.root.add(mesh);
    }
    this.props = new FarProps(build.props, this.uniforms);
    for (const mesh of this.props.meshes) this.root.add(mesh);
    this.built = true;
  }

  private acceptLandmarks(landmarks: readonly Landmark[]): void {
    if (this.disposed || landmarks.length === 0) return;
    this.beacons = new LandmarkBeacons(landmarks);
    this.root.add(this.beacons.points);
  }

  update(frame: FarFrame): void {
    this.uniforms.farFocus.value.copy(frame.focus);
    lightColors(lightAmbience(frame.ambience, this.light), this.uniforms.nearSky.value, this.uniforms.nearGround.value, this.uniforms.nearKey.value);
    this.sea.update(frame.camera, this.reach);
    this.beacons?.update(frame.focus, frame.pixelRatio ?? 1);
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
    this.sea.dispose();
    this.beacons?.dispose();
    this.props?.dispose();
    this.mask.texture.dispose();
  }
}
