import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
import type { TileKindId } from '../packages/shared/src/world/tiles.ts';

const COLORS: Readonly<Record<TileKindId, number>> = {
  void: 0x05080a,
  wall: 0x3a4652,
  glass: 0x8feaff,
  door: 0xd8a62a,
  plating: 0x4a5a66,
  concrete: 0x8a8a84,
  grate: 0x55656e,
  rust: 0x8a4e2a,
  carpet: 0x5a4a6a,
  hazard: 0xc99a1c,
  coolant: 0x1b6a80,
  soil: 0x6e5a48,
  track: 0x4a3a2a,
  terrazzo: 0x7a7a72,
  ceramic: 0x8a969c,
  boards: 0x8a6440,
  grass: 0x6f9a48,
  dirt: 0x9a7a52,
  gravel: 0x9c9890,
  asphalt: 0x55585e,
  water: 0x4f7fa0,
  rock: 0x7a7066,
  trees: 0x2f5a2a,
  fence: 0x9aa2a6,
  barrier: 0x6a6e70,
  brick: 0x8a4a3a,
  blockwork: 0x7a7a7a,
  cladding: 0x5a6a7a,
  paving: 0xb4aa98,
  cliff: 0x4a4038,
};

const WARD_COLORS = [0xff4040, 0xffd040, 0x40e0ff, 0xff60ff, 0x60ff60, 0xff9040, 0x9080ff, 0xffffff, 0x40ffb0, 0xc0a060];

function png(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const [id, out, ...flags] = process.argv.slice(2);
if (!id || !out) {
  console.error('usage: node scripts/landPicture.ts <land-id> <out.png> [--grid] [--wards] [--crop x,y,width,height] [--scale n]');
  process.exit(1);
}
const land = GAME_CONTENT.lands.get(id);
if (!land) {
  console.error(`There is no land plan "${id}".`);
  process.exit(1);
}
const grid = flags.includes('--grid');
const flagValue = (name: string): string | undefined => {
  const at = flags.indexOf(name);
  return at >= 0 ? flags[at + 1] : undefined;
};
const [cropX, cropY, cropWidth, cropHeight] = (flagValue('--crop') ?? '').split(',').map(Number);
const scale = Number(flagValue('--scale') ?? 1);
const wards = flags.includes('--wards');
const { width, height } = land;
const { squareSize } = land.plan;
const rgb = new Uint8Array(width * height * 3);
const wardNames = new Map<string, number>();
const wardIndex = (x: number, y: number): number => {
  const ward = land.wardAt({ x, y });
  if (ward === undefined) return -1;
  if (!wardNames.has(ward)) wardNames.set(ward, wardNames.size);
  return wardNames.get(ward) as number;
};
const gateTiles = new Set(Object.values(land.gates).flatMap((tiles) => tiles.map((tile) => tile.y * width + tile.x)));
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const point = { x, y };
    const own = land.heightAt(point);
    const rise = own - land.heightAt({ x: x - 1, y: y - 1 });
    const shade = Math.max(0.45, Math.min(1.7, 0.75 + own * 0.05 + rise * 0.15));
    let color = COLORS[land.tileAt(point)];
    if (wards) {
      const ward = wardIndex(x, y);
      const edge = ward !== wardIndex(x + 1, y) || ward !== wardIndex(x, y + 1);
      if (edge && ward >= 0) color = WARD_COLORS[ward % WARD_COLORS.length] as number;
    }
    if (gateTiles.has(y * width + x)) color = 0xff2020;
    const lit = grid && (x % squareSize === 0 || y % squareSize === 0) ? 0.6 : 1;
    const index = (y * width + x) * 3;
    rgb[index] = Math.min(255, ((color >> 16) & 255) * shade * lit);
    rgb[index + 1] = Math.min(255, ((color >> 8) & 255) * shade * lit);
    rgb[index + 2] = Math.min(255, (color & 255) * shade * lit);
  }
}
const left = Number.isFinite(cropX) ? (cropX as number) : 0;
const top = Number.isFinite(cropY) ? (cropY as number) : 0;
const outWidth = Number.isFinite(cropWidth) ? (cropWidth as number) : width;
const outHeight = Number.isFinite(cropHeight) ? (cropHeight as number) : height;
const scaled = new Uint8Array(outWidth * scale * outHeight * scale * 3);
for (let y = 0; y < outHeight * scale; y++) {
  for (let x = 0; x < outWidth * scale; x++) {
    const sx = left + Math.floor(x / scale);
    const sy = top + Math.floor(y / scale);
    if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
    const from = (sy * width + sx) * 3;
    const to = (y * outWidth * scale + x) * 3;
    scaled[to] = rgb[from] as number;
    scaled[to + 1] = rgb[from + 1] as number;
    scaled[to + 2] = rgb[from + 2] as number;
  }
}
writeFileSync(out, png(outWidth * scale, outHeight * scale, scaled));
if (wards) console.log([...wardNames.entries()].map(([ward, index]) => `${ward}: #${(WARD_COLORS[index % WARD_COLORS.length] as number).toString(16).padStart(6, '0')}`).join('\n'));
