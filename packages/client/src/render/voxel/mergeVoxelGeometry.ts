import { BufferAttribute, BufferGeometry, Matrix3, type Matrix4 } from 'three';

export interface VoxelGeometryPart {
  readonly geometry: BufferGeometry;
  readonly transform?: Matrix4;
}

const normalMatrix = new Matrix3();

export function mergeVoxelGeometries(parts: readonly VoxelGeometryPart[]): BufferGeometry {
  let vertices = 0;
  let indices = 0;
  for (const { geometry } of parts) {
    vertices += geometry.attributes.position!.count;
    indices += geometry.index!.count;
  }
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const colors = new Float32Array(vertices * 3);
  const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const { geometry, transform } of parts) {
    const sourcePositions = geometry.attributes.position!.array as Float32Array;
    const sourceNormals = geometry.attributes.normal!.array as Float32Array;
    const count = geometry.attributes.position!.count;
    const target = vertexOffset * 3;
    if (transform) {
      const m = transform.elements;
      normalMatrix.getNormalMatrix(transform);
      const n = normalMatrix.elements;
      for (let vertex = 0; vertex < count; vertex++) {
        const source = vertex * 3;
        const x = sourcePositions[source]!;
        const y = sourcePositions[source + 1]!;
        const z = sourcePositions[source + 2]!;
        positions[target + source] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
        positions[target + source + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
        positions[target + source + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
        const nx = sourceNormals[source]!;
        const ny = sourceNormals[source + 1]!;
        const nz = sourceNormals[source + 2]!;
        const tx = n[0]! * nx + n[3]! * ny + n[6]! * nz;
        const ty = n[1]! * nx + n[4]! * ny + n[7]! * nz;
        const tz = n[2]! * nx + n[5]! * ny + n[8]! * nz;
        const length = Math.hypot(tx, ty, tz) || 1;
        normals[target + source] = tx / length;
        normals[target + source + 1] = ty / length;
        normals[target + source + 2] = tz / length;
      }
    } else {
      positions.set(sourcePositions, target);
      normals.set(sourceNormals, target);
    }
    colors.set(geometry.attributes.color!.array as Float32Array, target);
    const sourceIndex = geometry.index!.array;
    for (let entry = 0; entry < sourceIndex.length; entry++) index[indexOffset + entry] = sourceIndex[entry]! + vertexOffset;
    vertexOffset += count;
    indexOffset += sourceIndex.length;
  }
  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(positions, 3));
  merged.setAttribute('normal', new BufferAttribute(normals, 3));
  merged.setAttribute('color', new BufferAttribute(colors, 3));
  merged.setIndex(new BufferAttribute(index, 1));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
