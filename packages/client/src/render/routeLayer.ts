import type { TilePoint } from '@containment/shared';
import { AdditiveBlending, Color, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, Object3D, Shape, ShapeGeometry } from 'three';

const MAX_CHEVRONS = 240;
const ROUTE_HEIGHT = 0.035;
const ROUTE_COLOR = new Color(0x4fd8ff);
const WAVE_SPEED = 6;
const WAVE_LENGTH = 7;
const FADE_IN_TILES = 2;

function chevronGeometry(): ShapeGeometry {
  const shape = new Shape();
  shape.moveTo(-0.2, -0.1);
  shape.lineTo(0, 0.1);
  shape.lineTo(0.2, -0.1);
  shape.lineTo(0.2, -0.02);
  shape.lineTo(0, 0.18);
  shape.lineTo(-0.2, -0.02);
  shape.closePath();
  const geometry = new ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export class RouteLayer {
  readonly mesh: InstancedMesh;
  private readonly placement = new Object3D();
  private readonly tint = new Color();
  private path: readonly TilePoint[] = [];

  constructor() {
    const material = new MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    this.mesh = new InstancedMesh(chevronGeometry(), material, MAX_CHEVRONS);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.name = 'guidance-route';
    for (let index = 0; index < MAX_CHEVRONS; index++) this.mesh.setColorAt(index, ROUTE_COLOR);
    this.mesh.count = 0;
  }

  update(path: readonly TilePoint[], time: number): void {
    if (path !== this.path) this.place(path);
    const count = this.mesh.count;
    for (let index = 0; index < count; index++) {
      const wave = 0.5 + 0.5 * Math.sin((index / WAVE_LENGTH) * Math.PI * 2 - time * WAVE_SPEED);
      const fadeIn = Math.min(1, (index + 1) / (FADE_IN_TILES + 1));
      this.tint.copy(ROUTE_COLOR).multiplyScalar((0.25 + 0.75 * wave) * fadeIn);
      this.mesh.setColorAt(index, this.tint);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private place(path: readonly TilePoint[]): void {
    this.path = path;
    const count = Math.min(MAX_CHEVRONS, Math.max(0, path.length - 1));
    for (let index = 0; index < count; index++) {
      const from = path[index] as TilePoint;
      const to = path[index + 1] as TilePoint;
      this.placement.position.set((from.x + to.x) / 2, ROUTE_HEIGHT, (from.y + to.y) / 2);
      this.placement.rotation.set(0, Math.atan2(-(to.x - from.x), -(to.y - from.y)), 0);
      this.placement.updateMatrix();
      this.mesh.setMatrixAt(index, this.placement.matrix);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
