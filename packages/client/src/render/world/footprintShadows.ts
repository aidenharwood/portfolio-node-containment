import { DataTexture, InstancedMesh, Matrix4, MeshBasicMaterial, NearestFilter, PlaneGeometry, Quaternion, Vector3, type Material } from 'three';

export interface Footprint {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
}

const TEXELS = 12;
const STEPS = 4;
const SPREAD = 1.3;
const LIFT = 0.006;
const OPACITY = 0.34;
const FLAT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const GEOMETRY = new PlaneGeometry(1, 1);
let material: Material | null = null;

function stepped(texel: number): number {
  const edge = Math.abs((texel + 0.5) / TEXELS - 0.5) * 2;
  return edge * SPREAD;
}

function footprintMaterial(): Material {
  if (material) return material;
  const texels = new Uint8Array(TEXELS * TEXELS * 4);
  for (let v = 0; v < TEXELS; v++) {
    for (let u = 0; u < TEXELS; u++) {
      const reach = Math.max(stepped(u), stepped(v));
      const strength = reach <= 1 ? 1 : Math.max(0, 1 - (reach - 1) / (SPREAD - 1));
      const level = Math.round((Math.round(strength * STEPS) / STEPS) * 255);
      texels.fill(level, (v * TEXELS + u) * 4, (v * TEXELS + u) * 4 + 4);
    }
  }
  const texture = new DataTexture(texels, TEXELS, TEXELS);
  texture.needsUpdate = true;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  material = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: OPACITY, depthWrite: false, alphaMap: texture, polygonOffset: true, polygonOffsetFactor: -1 });
  return material;
}

export function createFootprintShadows(footprints: readonly Footprint[]): InstancedMesh | null {
  if (footprints.length === 0) return null;
  const mesh = new InstancedMesh(GEOMETRY, footprintMaterial(), footprints.length);
  const matrix = new Matrix4();
  footprints.forEach((footprint, index) => {
    matrix.compose(new Vector3(footprint.x, LIFT, footprint.z), FLAT, new Vector3(footprint.width * SPREAD, footprint.depth * SPREAD, 1));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.name = 'footprint-shadows';
  mesh.renderOrder = 1;
  mesh.raycast = () => undefined;
  mesh.computeBoundingSphere();
  return mesh;
}
