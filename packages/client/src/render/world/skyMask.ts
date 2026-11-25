import { isOutdoorFloor, TILE_KINDS, type ResolvedLevel, type TileKindId } from '@containment/shared';
import { DataTexture, NearestFilter, RGFormat, UnsignedByteType } from 'three';
import { ownedLayoutOf } from './chunkStructure.ts';

export const SKY_MASK_SIZE = 128;
const REBUILD_DISTANCE = 16;
const OPEN = 255;
const HEIGHT_LIMIT = 255;

const openGround = (kind: TileKindId): boolean => kind !== 'door' && (isOutdoorFloor(kind) || TILE_KINDS[kind].walkable);

export class SkyMask {
  readonly data = new Uint8Array(SKY_MASK_SIZE * SKY_MASK_SIZE * 2);
  readonly texture = new DataTexture(this.data, SKY_MASK_SIZE, SKY_MASK_SIZE, RGFormat, UnsignedByteType);
  originX = 0;
  originZ = 0;
  private level: ResolvedLevel | null = null;
  private centreX = Number.NaN;
  private centreZ = Number.NaN;

  constructor() {
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  follow(level: ResolvedLevel | undefined, x: number, z: number): boolean {
    if (!level) return false;
    if (level === this.level && Math.abs(x - this.centreX) < REBUILD_DISTANCE && Math.abs(z - this.centreZ) < REBUILD_DISTANCE) return false;
    this.level = level;
    this.centreX = x;
    this.centreZ = z;
    this.originX = Math.round(x) - SKY_MASK_SIZE / 2;
    this.originZ = Math.round(z) - SKY_MASK_SIZE / 2;
    const { scene } = level;
    const interiorAt = ownedLayoutOf(level, scene).interiorAt;
    const point = { x: 0, y: 0 };
    for (let row = 0; row < SKY_MASK_SIZE; row++) {
      for (let column = 0; column < SKY_MASK_SIZE; column++) {
        point.x = this.originX + column;
        point.y = this.originZ + row;
        const kind = scene.tileAt(point);
        const open = interiorAt ? openGround(kind) && !interiorAt(point) : isOutdoorFloor(kind);
        const at = (row * SKY_MASK_SIZE + column) * 2;
        this.data[at] = open ? OPEN : 0;
        this.data[at + 1] = Math.min(HEIGHT_LIMIT, Math.max(0, scene.heightAt(point)));
      }
    }
    this.texture.needsUpdate = true;
    return true;
  }

  isOpen(x: number, z: number): boolean {
    const column = Math.floor(x + 0.5) - this.originX;
    const row = Math.floor(z + 0.5) - this.originZ;
    if (column < 0 || row < 0 || column >= SKY_MASK_SIZE || row >= SKY_MASK_SIZE) return false;
    return this.data[(row * SKY_MASK_SIZE + column) * 2]! > 0;
  }
}
