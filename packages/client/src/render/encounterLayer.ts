import type { CombatStyle, HazardKind } from '@containment/shared';
import { Color, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import type { ClientHazard, ClientTelegraph } from '../state/worldState.ts';

const MAX_TILES = 1200;
const TILE_HEIGHT = 0.03;
const TILE_SIZE = 0.94;

const STYLE_COLOR: Readonly<Record<CombatStyle, number>> = {
  melee: 0xff5a3c,
  ranged: 0xffb03c,
  psionic: 0xb47cff,
};

const HAZARD_COLOR: Readonly<Record<HazardKind, number>> = {
  coolant: 0x3cc8ff,
  fire: 0xff6a1f,
  salt: 0xe8e2d0,
  static: 0x7cf0ff,
};

const BLACK = new Color(0x000000);

export class EncounterLayer {
  readonly mesh: InstancedMesh;
  private readonly placement = new Object3D();
  private readonly tint = new Color();

  constructor() {
    const geometry = new PlaneGeometry(TILE_SIZE, TILE_SIZE);
    geometry.rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
    this.mesh = new InstancedMesh(geometry, material, MAX_TILES);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.mesh.name = 'encounter-tiles';
    for (let index = 0; index < MAX_TILES; index++) this.mesh.setColorAt(index, BLACK);
    this.mesh.count = 0;
  }

  update(telegraphs: Iterable<ClientTelegraph>, hazards: Iterable<ClientHazard>, now: number): void {
    let index = 0;
    const place = (x: number, y: number, color: number, strength: number, lift: number) => {
      if (index >= MAX_TILES) return;
      this.placement.position.set(x, TILE_HEIGHT + lift, y);
      this.placement.scale.setScalar(1);
      this.placement.updateMatrix();
      this.mesh.setMatrixAt(index, this.placement.matrix);
      this.mesh.setColorAt(index, this.tint.setHex(color).multiplyScalar(strength));
      index++;
    };
    const time = now / 1000;
    for (const hazard of hazards) {
      for (const tile of hazard.tiles) {
        const shimmer = 0.55 + 0.15 * Math.sin(time * 4 + tile.x * 1.7 + tile.y * 2.3);
        place(tile.x, tile.y, HAZARD_COLOR[hazard.hazard], shimmer, 0);
      }
    }
    for (const telegraph of telegraphs) {
      const progress = Math.min(1, Math.max(0, (now - telegraph.startedAt) / Math.max(1, telegraph.resolvesAt - telegraph.startedAt)));
      const pulse = progress > 0.75 ? 0.15 * Math.sin(time * 30) : 0;
      for (const tile of telegraph.tiles) place(tile.x, tile.y, STYLE_COLOR[telegraph.style], 0.25 + 0.75 * progress + pulse, 0.002);
    }
    this.mesh.count = index;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
