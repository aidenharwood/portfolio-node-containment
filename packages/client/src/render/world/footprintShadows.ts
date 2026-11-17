import { InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3, type Material } from 'three';

export interface Footprint {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
}

const MARGINS = [0.0625, 0.125, 0.1875] as const;
const LIFT = 0.006;
const OPACITY_PER_STEP = 0.13;
const FLAT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const GEOMETRY = new PlaneGeometry(1, 1);
let material: Material | null = null;

function footprintMaterial(): Material {
  material ??= new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: OPACITY_PER_STEP, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  return material;
}

export function createFootprintShadows(footprints: readonly Footprint[]): InstancedMesh | null {
  if (footprints.length === 0) return null;
  const mesh = new InstancedMesh(GEOMETRY, footprintMaterial(), footprints.length * MARGINS.length);
  const matrix = new Matrix4();
  const position = new Vector3();
  const scale = new Vector3();
  footprints.forEach((footprint, index) => {
    MARGINS.forEach((margin, step) => {
      matrix.compose(position.set(footprint.x, LIFT, footprint.z), FLAT, scale.set(footprint.width + 2 * margin, footprint.depth + 2 * margin, 1));
      mesh.setMatrixAt(index * MARGINS.length + step, matrix);
    });
  });
  mesh.name = 'footprint-shadows';
  mesh.renderOrder = 1;
  mesh.raycast = () => undefined;
  mesh.computeBoundingSphere();
  return mesh;
}
